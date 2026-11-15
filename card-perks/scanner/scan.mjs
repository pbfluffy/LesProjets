// Scans banks' official public pages and (optionally) publishes the results to
// the Firestore collections the Card Perks app reads.
//
//   node scan.mjs                  cards: privileges of each card  -> cardCatalog/{bankId}
//   node scan.mjs --promos         dining promotions (~2,000 pages, ~35 min) -> cardPromos/{bank}-dining-{n}
//   add --out file.json            also write the scan result to a file
//   add --limit 50                 (promos) only fetch the first 50 pages, for a quick trial
//   add --publish                  write to Firestore (needs FIREBASE_SERVICE_ACCOUNT)
//
// Safety: a scan only overwrites published data if it looks sane, so a site
// redesign that breaks the parser leaves the last good data in place instead
// of wiping every user's privileges.
import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import * as ktc from './ktc.mjs'
import * as ktcPromos from './ktc-promos.mjs'

const UA = 'CardPerksScanner/1.0 (+https://pumbafluffycorgi.com/card-perks/)'
const SCANNERS = [ktc]
const SHARD_SIZE = 600 // promotions per Firestore doc, keeps each doc far below the 1 MB limit

async function fetchText(url, tries = 2) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html,application/xml' }, signal: AbortSignal.timeout(30000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.text()
    } catch (e) {
      if (i >= tries) throw new Error(`${url}: ${e.message}`)
      await new Promise((r) => setTimeout(r, 3000))
    }
  }
}

// Returns a list of problems; empty means the scan is safe to publish.
export function validate(result) {
  const problems = []
  if (result.cards.length < 5) problems.push(`only ${result.cards.length} cards found (expected at least 5)`)
  for (const c of result.cards) {
    if (c.perks.length < 2) problems.push(`${c.id}: only ${c.perks.length} privileges parsed`)
    if (!c.name) problems.push(`${c.id}: no name`)
  }
  return problems
}

// Promotions: plenty of pages must have been read and a sane share must have parsed
// to a live promotion. (Many sitemap pages are legitimately expired, so the bar is low.)
export function validatePromos(result, { minPromos = 100 } = {}) {
  const problems = []
  if (result.pages < 200) problems.push(`only ${result.pages} promotion pages listed (expected hundreds)`)
  if (result.failed > result.pages * 0.2) problems.push(`${result.failed} of ${result.pages} pages failed to download`)
  if (result.promos.length < minPromos) problems.push(`only ${result.promos.length} live promotions parsed (expected at least ${minPromos})`)
  if (result.promos.some((p) => !p.end || !p.title)) problems.push('a promotion is missing its title or end date')
  return problems
}

export function shardPromos(promos, size = SHARD_SIZE) {
  const shards = []
  for (let i = 0; i < promos.length; i += size) shards.push(promos.slice(i, i + size))
  return shards
}

async function firestore() {
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!sa) { console.log('FIREBASE_SERVICE_ACCOUNT is not set — skipping publish.'); return null }
  const { default: admin } = await import('firebase-admin')
  if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(JSON.parse(sa)) })
  return admin.firestore()
}

async function publishCards(bankId, doc) {
  const db = await firestore()
  if (!db) return false
  await db.collection('cardCatalog').doc(bankId).set(doc)
  return true
}

// Writes cardPromos/{bank}-dining-1..N, then removes leftover higher-numbered
// shards from an earlier, larger scan so the app never reads stale promotions.
async function publishPromos(result, scannedAt) {
  const db = await firestore()
  if (!db) return false
  const prefix = `${result.bank}-${result.kind}-`
  const shards = shardPromos(result.promos)
  for (let i = 0; i < shards.length; i++) {
    await db.collection('cardPromos').doc(prefix + (i + 1)).set({
      bank: result.bank, kind: result.kind, part: i + 1, parts: shards.length, scannedAt, promos: shards[i],
    })
  }
  const existing = await db.collection('cardPromos').listDocuments()
  for (const ref of existing) {
    const n = Number(ref.id.slice(prefix.length))
    if (ref.id.startsWith(prefix) && n > shards.length) await ref.delete()
  }
  return shards.length
}

async function runCards(args, outFile) {
  let failed = false
  for (const s of SCANNERS) {
    const result = await s.scan(fetchText)
    const problems = validate(result)
    const hash = createHash('sha256').update(JSON.stringify(result.cards)).digest('hex').slice(0, 16)
    const doc = { ...result, scannedAt: new Date().toISOString(), contentHash: hash }
    const total = result.cards.reduce((n, c) => n + c.perks.length, 0)
    console.log(`${result.bank.name}: ${result.cards.length} cards, ${total} privileges (hash ${hash})`)
    for (const c of result.cards) console.log(`  - ${c.name}: ${c.perks.length} privileges`)
    if (outFile) writeFileSync(outFile, JSON.stringify(doc, null, 2))
    if (problems.length) {
      failed = true
      console.error(`NOT publishing ${result.bank.id}:\n  ` + problems.join('\n  '))
      continue
    }
    if (args.includes('--publish') && (await publishCards(result.bank.id, doc))) console.log(`Published cardCatalog/${result.bank.id}`)
  }
  return failed
}

async function runPromos(args, outFile) {
  const limit = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : Infinity
  const result = await ktcPromos.scanPromos(fetchText, {
    limit,
    onProgress: (done, total, kept, failed) => console.log(`  ${done}/${total} pages, ${kept} live promotions, ${failed} failed`),
  })
  // A --limit trial only sees a slice of the pages, so size checks don't apply to it.
  const problems = Number.isFinite(limit) ? [] : validatePromos(result)
  const groups = {}
  for (const p of result.promos) groups[p.group] = (groups[p.group] || 0) + 1
  console.log(`KTC dining promotions: ${result.promos.length} live of ${result.pages} pages (${result.failed} failed)`, groups)
  const scannedAt = new Date().toISOString()
  if (outFile) writeFileSync(outFile, JSON.stringify({ ...result, scannedAt }, null, 2))
  if (problems.length) {
    console.error('NOT publishing promotions:\n  ' + problems.join('\n  '))
    return true
  }
  if (args.includes('--publish') && Number.isFinite(limit)) {
    console.error('Refusing to publish a --limit trial: it would replace the full promotion list.')
    return true
  }
  if (args.includes('--publish')) {
    const n = await publishPromos(result, scannedAt)
    if (n) console.log(`Published cardPromos/${result.bank}-${result.kind}-1..${n}`)
  }
  return false
}

async function main() {
  const args = process.argv.slice(2)
  const outFile = args.includes('--out') ? args[args.indexOf('--out') + 1] : null
  const failed = args.includes('--promos') ? await runPromos(args, outFile) : await runCards(args, outFile)
  if (failed) process.exit(1)
}

// Run only when executed directly (`node scan.mjs`), not when a test imports validate().
if (process.argv[1]?.endsWith('scan.mjs')) await main()

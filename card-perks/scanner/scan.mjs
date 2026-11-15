// Scans banks' official card pages and (optionally) publishes the result to the
// Firestore `cardCatalog/{bankId}` docs the Card Perks app reads.
//
//   node scan.mjs                 dry run: scan, validate, print a summary
//   node scan.mjs --out file.json write the scan result to a file as well
//   node scan.mjs --publish       also write to Firestore (needs FIREBASE_SERVICE_ACCOUNT)
//
// Safety: a scan only overwrites the published catalog if it looks sane, so a
// site redesign that breaks the parser leaves the last good data in place
// instead of wiping every user's privileges.
import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import * as ktc from './ktc.mjs'

const UA = 'CardPerksScanner/1.0 (+https://pumbafluffycorgi.com/card-perks/)'
const SCANNERS = [ktc]

async function fetchText(url, tries = 2) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html' }, signal: AbortSignal.timeout(30000) })
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

async function publish(bankId, doc) {
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!sa) { console.log('FIREBASE_SERVICE_ACCOUNT is not set — skipping publish.'); return false }
  const { default: admin } = await import('firebase-admin')
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(sa)) })
  await admin.firestore().collection('cardCatalog').doc(bankId).set(doc)
  return true
}

async function main() {
  const args = process.argv.slice(2)
  const outFile = args.includes('--out') ? args[args.indexOf('--out') + 1] : null
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
    if (args.includes('--publish') && (await publish(result.bank.id, doc))) console.log(`Published cardCatalog/${result.bank.id}`)
  }
  if (failed) process.exit(1)
}

// Run only when executed directly (`node scan.mjs`), not when a test imports validate().
if (process.argv[1]?.endsWith('scan.mjs')) await main()

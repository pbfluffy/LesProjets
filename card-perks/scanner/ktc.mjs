// Scanner for Krungthai Card (KTC) — reads ktc.co.th's public English card
// pages. robots.txt allows /en/credit-card/ and disallows /th/, so English only.
// Pages are server-rendered: each privilege is a titled block (<h3>) followed by
// a description, which is all this parses.
import * as cheerio from 'cheerio'
import { classifyCategory, requiresPoints, summarize, slug } from './classify.mjs'

export const BANK = { id: 'ktc', name: 'Krungthai (KTC)' }
const ORIGIN = 'https://www.ktc.co.th'
const LIST_URL = `${ORIGIN}/en/credit-card`
const SKIP_TITLES = /^(more details?|apply|application|terms)/i

const WORDS = { JCB: 'JCB', UNIONPAY: 'UnionPay', VISA: 'Visa', MASTERCARD: 'Mastercard', X: 'X', KTC: 'KTC' }
// Names come from the URL slug ("ktc-x-visa-signature" -> "X Visa Signature"),
// not the page <title>, which on some card pages is the company name in Thai.
function prettyName(slugName) {
  return slugName
    .replace(/^ktc-/i, '')
    .split('-')
    .map((w) => WORDS[w.toUpperCase()] || w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

// Collapse whitespace and drop the "More Details" link text that the page glues
// onto some descriptions.
const clean = (s) => s.replace(/More Details?/gi, ' ').replace(/\s+/g, ' ').trim()

export function parseCardLinks(html) {
  const out = new Set()
  for (const m of html.matchAll(/href="(\/en\/credit-card\/[a-z-]+\/ktc-[a-z0-9-]+)"/g)) out.add(ORIGIN + m[1])
  return [...out].sort()
}

// The list page marks cards closed to new applicants. Existing cardholders keep
// them, so they stay in the catalog, just flagged.
export function parseDiscontinued(listHtml) {
  const out = new Set()
  for (const m of listHtml.matchAll(/<h3[^>]*>(KTC [A-Z0-9 ]+)<\/h3>\s*<\/div>\s*<div[^>]*>\s*<span[^>]*>\s*Application for this card has been discontinued/g)) {
    out.add(m[1].trim().toLowerCase().replace(/\s+/g, '-'))
  }
  return out
}

export function parseCardPage(html, url) {
  const $ = cheerio.load(html)
  const id = url.split('/').pop()
  const perks = []
  const seen = new Set()
  $('span.typo-body .rich-text-lexical h3').each((_, h3) => {
    const name = $(h3).text().replace(/\s+/g, ' ').trim()
    if (!name || SKIP_TITLES.test(name)) return
    const block = $(h3).closest('span.typo-body')
    const desc = block.next('div').find('.description').first()
    if (!desc.length) return
    // Only the description's own paragraphs; drop the "More Details" links and
    // long terms-and-conditions paragraphs that follow the summary.
    const paragraphs = desc.find('p').map((__, p) => $(p).text().replace(/\s+/g, ' ').trim()).get()
      .filter((t) => t && !/^more details?$/i.test(t))
    const text = clean(paragraphs.slice(0, 3).join(' '))
    const perkId = slug(name)
    if (!perkId || seen.has(perkId)) return
    seen.add(perkId)
    perks.push({
      id: perkId,
      title: name.slice(0, 120),
      category: classifyCategory(name, text),
      requiresPoints: requiresPoints(name, text),
      conditions: summarize(text),
    })
  })
  // Headline privileges (lounge access, points multipliers, fee waivers) live in
  // "highlight benefit" blocks that the server streams in after the main HTML:
  // an <h2> title plus a free-form description. Cheerio sees them in the
  // document, so no JavaScript execution is needed.
  $('[class*="highlight-benefit-item-"]').each((_, item) => {
    const spans = $(item).find('.typo-subheader h2 span').map((__, s) => $(s).text().replace(/\s+/g, ' ').trim()).get()
      .filter((t) => t && !/^apply (today|now)!?$/i.test(t))
    const name = spans.join(' ')
    // Descriptions are sometimes <p>/<li> lists and sometimes bare <span>s in a <div>.
    const body = $(item).find('.free-html').first()
    const parts = body.find('p, li').map((__, p) => $(p).text()).get()
    const text = clean(parts.length ? parts.slice(0, 4).join(' ') : body.text())
    const perkId = slug(name)
    if (!name || !perkId || seen.has(perkId)) return
    seen.add(perkId)
    perks.push({
      id: perkId,
      title: name.slice(0, 120),
      category: classifyCategory(name, text),
      requiresPoints: requiresPoints(name, text),
      conditions: summarize(text),
    })
  })
  return { id, name: prettyName(id), url, perks }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export async function scan(fetchText, { delayMs = 1000 } = {}) {
  const listHtml = await fetchText(LIST_URL)
  const links = parseCardLinks(listHtml)
  const discontinued = parseDiscontinued(listHtml)
  const cards = []
  for (const url of links) {
    await sleep(delayMs) // be polite: one request per second
    const card = parseCardPage(await fetchText(url), url)
    if (discontinued.has(card.id)) card.discontinued = true
    cards.push(card)
  }
  return { bank: BANK, source: LIST_URL, cards }
}

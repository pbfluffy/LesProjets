// Scanner for Krungsri credit cards — reads krungsricard.com's public English card
// pages (the card company's own site; krungsri.com itself sits behind bot protection
// and is not touched). robots.txt allows /en/product/ (it only blocks /en/promotion,
// /en/article, PDFs and query strings), and the pages are server-rendered.
//
// Two page layouts exist, and a card uses one of them:
//   A) "grid" cards: <h3 class="card-grid-item-title"> tiles plus a footer strip of
//      three headline numbers; details sit in popups (#popup-pbN) on the same page.
//   B) "section" cards: <section class="ctn-card-detail"> blocks with an <h2> title,
//      a short <article>, and a "Terms & Conditions" modal.
// Pages sometimes carry both a title and a Thai mirror; only the English is read.
import * as cheerio from 'cheerio'
import { classifyCategory, requiresPoints, summarize, slug } from './classify.mjs'

export const BANK = { id: 'krungsri', name: 'Krungsri' }
const ORIGIN = 'https://www.krungsricard.com'
const SITEMAP = `${ORIGIN}/sitemap.xml`
const LIST_URL = `${ORIGIN}/en/product/creditcard`

// Section titles that are headings, not privileges.
const GENERIC = /^(((other|additional)\s+)?benefits?|fee|fees|application criteria|payment channels?|terms.*|[\w' ]{0,25}\sbenefits?)$/i

// Card names from the URL slug, with the brand names the slug can't spell out.
const NAMES = {
  'krungsri-visa-platinum': 'Visa Platinum',
  'krungsri-platinum-mastercard': 'Platinum Mastercard',
  now: 'NOW Platinum',
  'krungsri-jcb': 'JCB Platinum',
  'krungsri-jcb-ultimate': 'JCB Ultimate',
  'krungsri-signature': 'Signature',
  'krungsri-exclusive-signature': 'Exclusive Signature',
  'krungsri-private-banking': 'Private Banking',
  'krungsri-doctor-card': 'Doctor Card',
  'krungsri-lady': 'Lady Titanium',
  'krungsri-corporate-card': 'Corporate Card',
  manutd: 'Manchester United Visa Platinum',
  'aia-visa-platinum': 'AIA Visa Platinum',
  'homepro-visa-platinum': 'HomePro Visa Platinum',
  'homepro-corporate-card': 'HomePro Corporate Card',
  'tcc-privilege': 'TCC Privilege',
  'krungsri-siam-takashimaya-visa': 'Siam Takashimaya Visa',
  'krungsri-siam-takashimaya-jcb': 'Siam Takashimaya JCB',
  'siam-takashimaya-credit-card-finest': 'Siam Takashimaya Finest',
  'siam-takashimaya-credit-card-finest-invitation': 'Siam Takashimaya Finest Invitation',
}
const WORDS = { JCB: 'JCB', AIA: 'AIA', TCC: 'TCC', VISA: 'Visa', MASTERCARD: 'Mastercard' }
export function prettyName(slugName) {
  return NAMES[slugName] || slugName
    .replace(/^krungsri-/i, '')
    .split('-')
    .map((w) => WORDS[w.toUpperCase()] || w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

// Card pages listed in the sitemap, minus the staging copies ("-uat") and the
// hash-suffixed duplicates the CMS leaves behind. Fetched in English.
export function parseCardSlugs(sitemapXml) {
  const out = new Set()
  for (const m of sitemapXml.matchAll(/<loc>\s*https:\/\/www\.krungsricard\.com\/(?:th|en)\/product\/creditcard\/([a-z0-9-]+)\s*<\/loc>/g)) {
    const s = m[1]
    if (s.endsWith('-uat') || /-[0-9a-f]{32}$/.test(s)) continue
    out.add(s)
  }
  return [...out].sort()
}

// Some pages mix Thai lines into the English text; the app is English-only, so drop them.
const tidy = (s) => s.replace(/[฀-๿]+/g, ' ').replace(/[​-‍﻿]/g, '').replace(/\s+/g, ' ').trim()

// "Terms & Conditions Earn up to 2X*…" -> "Earn up to 2X*…"
const stripTerms = (s) => s.replace(/^(Terms\s*&\s*Conditions|more details( and conditions)?)\s*/i, '').trim()

// Words of a title, for spotting the same privilege listed twice on one page.
const words = (s) => new Set(s.toLowerCase().match(/[a-z0-9]+/g)?.filter((w) => w.length > 2) || [])
function similar(a, b) {
  const x = words(a), y = words(b)
  if (!x.size || !y.size) return false
  let common = 0
  for (const w of x) if (y.has(w)) common++
  return common / Math.min(x.size, y.size) >= 0.7
}

export function parseCardPage(html, url) {
  const $ = cheerio.load(html)
  $('script, style').remove()
  $('br').replaceWith(' ') // "up<br>to 20%" must read "up to 20%"
  const id = url.split('/').pop()
  const perks = []
  const add = (title, text) => {
    title = tidy(title)
    text = tidy(text)
    const perkId = slug(title)
    if (!perkId || GENERIC.test(title) || perks.some((p) => p.id === perkId || similar(p.title, title))) return
    perks.push({
      id: perkId,
      title: title.slice(0, 120),
      category: classifyCategory(title, text),
      requiresPoints: requiresPoints(title, text),
      conditions: summarize(text),
    })
  }
  const popup = (sel) => (sel && sel.startsWith('#') && sel.length > 1 ? stripTerms(tidy($(`[id="${sel.slice(1)}"]`).first().text())) : '')

  // Layout A: tiles, details in popups on the page.
  $('.card-grid-item').each((_, el) => {
    const title = $(el).find('.card-grid-item-title').first().text()
    add(title, popup($(el).find('a').first().attr('href')))
  })
  // Layout B: titled sections with an article and a "Terms & Conditions" modal.
  $('section.ctn-card-detail').each((_, el) => {
    const sec = $(el)
    const title = sec.find('h2').filter((__, h) => !$(h).closest('.modal').length).first().text()
    if (!tidy(title)) return
    const lead = tidy(sec.find('article').filter((__, a) => !$(a).closest('.modal').length).first().text())
    const target = sec.find('[data-target]').first().attr('data-target')
    add(title, [lead, popup(target)].filter(Boolean).join(' '))
  })
  // Headline numbers in the strip under the card image (layout A).
  $('.sc-footer-item').each((_, el) => {
    add($(el).find('.sc-footer-text-title').text() + ' ' + $(el).find('.sc-footer-text-desc').text(), '')
  })
  return { id, name: prettyName(id), url, perks }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export async function scan(fetchText, { delayMs = 1000 } = {}) {
  const slugs = parseCardSlugs(await fetchText(SITEMAP))
  const cards = []
  for (const s of slugs) {
    await sleep(delayMs) // be polite: one request per second
    const url = `${ORIGIN}/en/product/creditcard/${s}`
    try {
      cards.push(parseCardPage(await fetchText(url), url))
    } catch (e) {
      console.error(`  skipped ${s}: ${e.message}`) // one bad page doesn't sink the scan; validate() checks the total
    }
  }
  return { bank: BANK, source: LIST_URL, cards }
}

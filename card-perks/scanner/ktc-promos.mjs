// KTC dining promotions. Each promotion is its own public page under
// /en/promotion/dining-restaurants/<group>/<slug>; the sitemaps list them.
// robots.txt blocks promotion URLs that carry a query string (?page=, ?filter=)
// but not these plain pages, and lists the sitemaps, so this walks the sitemaps
// and fetches each page once, politely (see scan.mjs: one request per second).
import * as cheerio from 'cheerio'
import { requiresPoints, summarize, slug } from './classify.mjs'

export const BANK_ID = 'ktc'
const ORIGIN = 'https://www.ktc.co.th'
const SITEMAP_INDEX = `${ORIGIN}/sitemap.xml`
const DINING = '/en/promotion/dining-restaurants/'

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }

export function parseLocs(xml) {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1])
}

// Only plain promotion pages (group + slug), never list/banner pages or URLs with a query.
export function isDiningPromoUrl(u) {
  if (!u.startsWith(ORIGIN + DINING) || u.includes('?')) return false
  return u.slice((ORIGIN + DINING).length).split('/').filter(Boolean).length >= 2
}

// "1 Feb 26" / "31 Jan 2027" -> "2026-02-01"
export function parseShortDate(s) {
  const m = /(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?\s+(\d{4}|\d{2})\b/.exec(s || '')
  if (!m) return null
  const month = MONTHS[m[2].toLowerCase()]
  if (!month) return null
  const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])
  return `${year}-${String(month).padStart(2, '0')}-${String(Number(m[1])).padStart(2, '0')}`
}

// Which card brands the promotion is limited to. [] = all KTC cards.
export function parseBrands(text) {
  if (/\ball\s+KTC\s+(credit\s+)?cards?\b/i.test(text)) return []
  const out = []
  if (/\bvisa\b/i.test(text)) out.push('visa')
  if (/\bmastercard\b/i.test(text)) out.push('mastercard')
  if (/\bjcb\b/i.test(text)) out.push('jcb')
  if (/\bunionpay\b/i.test(text)) out.push('unionpay')
  return out
}

export function parseMinSpend(text) {
  const m = /\bspend(?:ing)?\s+(?:at\s+least\s+|minimum\s+of\s+|over\s+)?(?:THB\s*)?([\d,]{3,})\s*(?:baht|THB)/i.exec(text)
  return m ? Number(m[1].replace(/,/g, '')) : null
}

// Mixed offers ("get a free dessert when spending 990 baht, or redeem points for
// 10% cash back") have a way to get the benefit without points, so they do not
// *require* points. Only offers that are points-only count, which is when the
// offer *opens* with a redemption: "Redeem points to get 10% cash back",
// "Use 1 KTC FOREVER point to buy an e-voucher". If a plain benefit (get / free /
// discount / %) comes before the redemption, there is a no-points route.
const REDEEM = /\b(redeem(?:ed|able)?|exchange[sd]?|use|using)\b[^.]{0,60}\bpoints?\b/i
export function isPointsOnly(text) {
  const m = REDEEM.exec(text)
  if (!m || m.index > 60) return false
  if (/\bearn(s|ed|ing)?\b/i.test(text)) return false
  return !/\b(get|free|discount|cash ?back|\d+\s*%)/i.test(text.slice(0, m.index))
}

// Pages with several "Privilege 1 … Privilege 2 …" blocks require points only if
// every block does.
export function privilegeParts(segment) {
  return segment.split(/Privilege\s*\d+/i).map((s) => s.replace(/\s+/g, ' ').trim()).filter((s) => s.length > 8)
}

export function promoRequiresPoints(title, summary, parts = []) {
  if (parts.length > 1) return parts.every(isPointsOnly)
  return isPointsOnly((summary || title).slice(0, 200))
}

// The pages sprinkle zero-width characters into titles ("Promotio​n"), which
// break words and searches. Strip them and collapse whitespace.
const tidy = (s) => (s || '').replace(/[​-‍⁠﻿]/g, '').replace(/\s+/g, ' ').trim()

// "Promotion at Krua Chay Khlong with KTC credit card and KTC cash card" -> "Krua Chay Khlong"
// "BIANCA x Mastercard Promotion: | KTC" -> "BIANCA x Mastercard"
// "Special privileges for KTC credit and KTC PROUD cash card at BANPHO RI" -> "BANPHO RI"
export function cleanTitle(title) {
  let t = title.replace(/\s*[:|]+\s*\|?\s*KTC\b.*$/i, '')
  const at = /^Special privileges for\b.*\bat\s+(.{3,})$/i.exec(t)
  if (at) t = at[1]
  t = t.replace(/\s+with\s+(all\s+)?KTC\b.*$/i, '').replace(/^(Dining\s+)?Promotions?\s+(at\s+)?/i, '').replace(/\s+Promotion:?$/i, '').trim()
  return t.length >= 3 ? t : title
}

const prettySlug = (s) => s.split('-').filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

// Some titles are generic ("Redeem points for cash back") and name no restaurant.
// If none of the URL slug's words appear in the title, lead with the slug's name.
export function withMerchant(title, slugName) {
  if (title.split(/\s+/).length >= 7) return title // long titles are already descriptive
  const words = slugName.toLowerCase().split('-').filter((w) => w.length >= 3)
  const lower = title.toLowerCase()
  const squashed = lower.replace(/[^a-z0-9]/g, '') // "Level 50" should match slug "level50"
  if (!words.length || words.some((w) => squashed.includes(w.replace(/[^a-z0-9]/g, '')))) return title
  return `${prettySlug(slugName)} — ${title}`
}

// The benefit text sits right after the "Period 1 Feb 26 - 31 Jan 27" line:
// "Privilege 1 Get free dessert when spending 1,500 baht ... Privilege 2 Redeem ...",
// followed by branch lists and terms. Pages often have an empty meta description,
// so this is the fallback (and carries eligibility and spend conditions).
const BODY_END = /(Details and Conditions|Participating Branches|Promotions You May Like|Promotion Terms and Conditions)/
export function promoSegment(afterPeriod) {
  const cut = afterPeriod.search(BODY_END)
  return cut >= 0 ? afterPeriod.slice(0, cut) : afterPeriod.slice(0, 800)
}

export function benefitText(afterPeriod) {
  return promoSegment(afterPeriod).replace(/Privilege\s*\d*\s*:?\s*/gi, ' ').replace(/\s+/g, ' ').trim()
}

export function parsePromoPage(html, url, today = new Date()) {
  const $ = cheerio.load(html)
  const title = tidy($('meta[property="og:title"]').attr('content') || $('title').first().text())
  const desc = tidy($('meta[name="description"]').attr('content'))
  if (!title) return null
  $('script, style').remove()
  const body = tidy($('body').text())
  const period = /Period\s+(\d{1,2}\s+[A-Za-z]{3}[a-z]*\.?\s+\d{2,4})\s*[-–]\s*(\d{1,2}\s+[A-Za-z]{3}[a-z]*\.?\s+\d{2,4})/.exec(body)
  const start = period ? parseShortDate(period[1]) : null
  const end = period ? parseShortDate(period[2]) : null
  // No readable end date: skip rather than guess — an undated promotion could be long gone.
  if (!end) return null
  if (new Date(end + 'T23:59:59+07:00') < today) return null // expired
  const path = url.replace(ORIGIN, '')
  const rest = path.slice(DINING.length).split('/')
  const after = body.slice(period.index + period[0].length)
  const benefit = benefitText(after)
  const parts = privilegeParts(promoSegment(after))
  // Use the page's own summary when it says something; many only repeat the title.
  const titleStem = title.replace(/\s*[:|]+\s*\|?\s*KTC\b.*$/i, '')
  const weak = desc.replace(titleStem, '').replace(/[\s:|.\-]+/g, '').length < 20
  const summary = weak ? benefit : desc
  const text = `${title}. ${summary} ${weak ? '' : benefit.slice(0, 300)}`
  return {
    id: slug(rest.join('-')),
    path,
    group: rest[0],
    title: summarize(withMerchant(cleanTitle(title), rest[rest.length - 1]), 110),
    summary: summarize(summary || title, 220),
    start,
    end,
    brands: parseBrands(`${title}. ${benefit.slice(0, 300)}`),
    requiresPoints: promoRequiresPoints(title, summary, parts),
    minSpend: parseMinSpend(text),
  }
}

export async function listPromoUrls(fetchText) {
  const index = parseLocs(await fetchText(SITEMAP_INDEX)).filter((u) => /sitemap-promotions-\d+\.xml$/.test(u))
  const urls = new Set()
  for (const sm of index) for (const u of parseLocs(await fetchText(sm))) if (isDiningPromoUrl(u)) urls.add(u)
  return [...urls].sort()
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Fetches every dining promotion page, one at a time. A page that fails is
// skipped (and counted) rather than aborting a half-hour scan.
export async function scanPromos(fetchText, { delayMs = 1000, limit = Infinity, onProgress } = {}) {
  const urls = (await listPromoUrls(fetchText)).slice(0, limit)
  const promos = []
  let failed = 0
  for (let i = 0; i < urls.length; i++) {
    await sleep(delayMs)
    try {
      const p = parsePromoPage(await fetchText(urls[i]), urls[i])
      if (p) promos.push(p)
    } catch {
      failed++
    }
    if (onProgress && (i + 1) % 100 === 0) onProgress(i + 1, urls.length, promos.length, failed)
  }
  return { bank: BANK_ID, kind: 'dining', pages: urls.length, failed, promos }
}

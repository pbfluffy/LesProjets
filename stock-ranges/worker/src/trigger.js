// Starts the price-alert check (GitHub Actions: price-alerts-cron.yml) on a
// Cloudflare Cron Trigger. The check itself still runs on GitHub — it's too
// heavy for a Free-plan Cron Trigger's 10ms CPU cap — but GitHub's own
// `schedule:` is best-effort and in practice ran only ~5% of the requested
// runs (median gap ~5h). This handler's whole job is one HTTPS call, which
// costs no meaningful CPU, and Cloudflare fires it on time.
//
// Needs the secret GITHUB_DISPATCH_TOKEN: a fine-grained personal access
// token for pbfluffy/LesProjets with "Actions: Read and write" only
// (`wrangler secret put GITHUB_DISPATCH_TOKEN`). It expires (max 1 year) — when
// it does, dispatches start failing; the result of the latest attempt is kept
// in KV under `cronstatus` so that's visible instead of alerts just going quiet.
const REPO = 'pbfluffy/LesProjets'
const WORKFLOW = 'price-alerts-cron.yml'

export async function triggerAlertCheck(env) {
  let ok = false
  let status = 0
  let error = null
  if (!env.GITHUB_DISPATCH_TOKEN) {
    error = 'GITHUB_DISPATCH_TOKEN is not set'
  } else {
    try {
      const res = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.GITHUB_DISPATCH_TOKEN}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'stock-ranges-alert-trigger',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ref: 'main' }),
      })
      status = res.status
      ok = res.status === 204
      if (!ok) error = (await res.text()).slice(0, 200)
    } catch (e) {
      error = String(e).slice(0, 200)
    }
  }
  if (!ok) console.error('[trigger] dispatch failed', status, error)
  await env.ALERTS.put('cronstatus', JSON.stringify({ ts: Date.now(), ok, status, error }))
  return { ok, status, error }
}

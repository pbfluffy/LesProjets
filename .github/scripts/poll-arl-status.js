// Polls the arl-status-check Worker from a GitHub Actions runner (which has
// normal internet access) and commits status-data/arl-status.json ONLY when
// the status actually changed. This makes the file's git history itself the
// source of truth for "did anything change recently" — the scheduled Claude
// Code routine that sends push notifications runs in a sandboxed cloud
// environment that can reach github.com (for its repo checkout) but gets a
// 403 trying to reach this Worker's *.workers.dev domain directly, so it
// reads this repo file instead of curling the Worker itself.

const fs = require('fs')

const WORKER_URL = 'https://arl-status-check.pbfluffygaming.workers.dev/'
const OUT_PATH = 'status-data/arl-status.json'

async function main() {
  const res = await fetch(WORKER_URL)
  if (!res.ok) throw new Error(`worker returned ${res.status}`)
  const latest = await res.json()

  const prev = fs.existsSync(OUT_PATH) ? JSON.parse(fs.readFileSync(OUT_PATH, 'utf8')) : null

  if (prev && prev.status === latest.status) {
    console.log(`No change (${latest.status}) — skipping commit`)
    fs.appendFileSync(process.env.GITHUB_OUTPUT, 'changed=false\n')
    return
  }

  fs.mkdirSync('status-data', { recursive: true })
  fs.writeFileSync(OUT_PATH, JSON.stringify({
    status: latest.status,
    previousStatus: prev ? prev.status : null,
    headlines: latest.headlines || [],
    checkedAt: latest.checkedAt,
  }, null, 2) + '\n')

  console.log(`Status changed: ${prev ? prev.status : '(none — first run)'} -> ${latest.status}`)
  fs.appendFileSync(process.env.GITHUB_OUTPUT, 'changed=true\n')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

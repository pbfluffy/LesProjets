// Build-time (Node) helper for each app's vite.config.js: stamps the bundle
// with the git commit it was built from, exposed to the app as __APP_BUILD__
// (see shared/appVersion.js). In GitHub Actions the checkout is the deployed
// commit; locally it's whatever HEAD is (marked dirty if there are edits).
import { execSync } from 'node:child_process'

function git(cmd) {
  try { return execSync(`git ${cmd}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch { return '' }
}

export function buildInfoDefine() {
  const sha = (process.env.GITHUB_SHA || git('rev-parse HEAD')).slice(0, 7) || 'dev'
  const time = git('log -1 --format=%cI') || new Date().toISOString()
  const dirty = !process.env.GITHUB_SHA && git('status --porcelain') !== ''
  return { __APP_BUILD__: JSON.stringify({ sha: dirty ? `${sha}+` : sha, time }) }
}

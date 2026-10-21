// Build-time (Node) helper for each app's vite.config.js: stamps the bundle
// with an app version, exposed to the app as __APP_BUILD__ (see
// shared/appVersion.js).
//
// Version = 1.0 at the commit that introduced it (7fb161f4), plus 0.0001 for
// every later commit that touched THIS app's folder or shared/ — counted per
// app, not repo-wide. A repo-wide count changed every app's bundle on every
// push, so each push made every app's service worker announce a "new
// version" even when that app hadn't changed. Needs full git history —
// deploy.yml checks out with fetch-depth: 0. Run from the app's folder (as
// `vite build` is). Local builds with uncommitted edits get a trailing "+".
import { execSync } from 'node:child_process'

const VERSION_1_0_COMMIT = '7fb161f4'

function git(cmd) {
  try { return execSync(`git ${cmd}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch { return '' }
}

export function appVersion() {
  if (git('rev-parse --is-shallow-repository') !== 'false') return 'dev'
  const count = git(`rev-list --count ${VERSION_1_0_COMMIT}..HEAD -- . ../shared`)
  if (count === '') return 'dev'
  const n = Number(count)
  const version = n === 0 ? '1.0' : (1 + n / 10000).toFixed(4)
  const dirty = !process.env.GITHUB_ACTIONS && git('status --porcelain -- . ../shared') !== ''
  return dirty ? `${version}+` : version
}

export function buildInfoDefine() {
  return { __APP_BUILD__: JSON.stringify({ version: appVersion() }) }
}

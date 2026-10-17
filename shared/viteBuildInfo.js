// Build-time (Node) helper for each app's vite.config.js: stamps the bundle
// with an app version, exposed to the app as __APP_BUILD__ (see
// shared/appVersion.js).
//
// Version = 1.0 at the commit that introduced it (repo commit #1962), plus
// 0.0001 for every commit after that: 1.0, 1.0001, 1.0002, ... It's derived
// from the repo's commit count, so it needs full git history — deploy.yml
// checks out with fetch-depth: 0. Local builds with uncommitted edits get a
// trailing "+".
import { execSync } from 'node:child_process'

const VERSION_1_0_COMMIT_COUNT = 1962

function git(cmd) {
  try { return execSync(`git ${cmd}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch { return '' }
}

export function appVersion() {
  const count = Number(git('rev-list --count HEAD'))
  if (!count || git('rev-parse --is-shallow-repository') === 'true') return 'dev'
  const n = Math.max(0, count - VERSION_1_0_COMMIT_COUNT)
  const version = n === 0 ? '1.0' : (1 + n / 10000).toFixed(4)
  const dirty = !process.env.GITHUB_ACTIONS && git('status --porcelain') !== ''
  return dirty ? `${version}+` : version
}

export function buildInfoDefine() {
  return { __APP_BUILD__: JSON.stringify({ version: appVersion() }) }
}

// village-77 Worker: LINE sign-in bridge + photo storage (see worker/).
export const WORKER_URL = 'https://village-77.pbfluffygaming.workers.dev'

// LINE Login channel id (public — it's in the login URL). Empty until the
// channel is created; the sign-in button explains that until then. Must
// match LINE_CHANNEL_ID in worker/wrangler.toml.
export const LINE_CHANNEL_ID = '2012133281'

// Site owner — always an admin (same uid as the other apps' admin checks).
// More admins: add a doc at admins/{uid} in Firestore.
export const OWNER_UID = 'HfksT06CgFUkZ9s4vrzEGs85O562'

// Village news tab (ประกาศ) — built but switched off for now: the app is
// about shops and handymen first. Set to true to bring the tab and the
// home-page news section back (the code, Firestore rules and data stay).
export const SHOW_NEWS = false

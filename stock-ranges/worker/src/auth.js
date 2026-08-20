// Verifies a Firebase Auth ID token without the Admin SDK (Node-only, not
// available in Workers) — jose's remote JWKS fetch + RS256 verification
// against Firebase's public signing keys is pure Web Crypto, so it works
// here. No service account, no secret key needed for this direction
// (verifying a token someone else already signed), only for minting one.
import { createRemoteJWKSet, jwtVerify } from 'jose'

const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
)

// Returns the verified uid, or null if the request has no valid token —
// callers treat null as "unauthenticated" (401), never throw past this.
export async function verifyFirebaseToken(request, env) {
  const authHeader = request.headers.get('Authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`,
      audience: env.FIREBASE_PROJECT_ID,
    })
    return typeof payload.sub === 'string' ? payload.sub : null
  } catch {
    return null
  }
}

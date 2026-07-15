import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyAsXkfkY-NW3REZ1XMt_O95WiWQDTYAHss',
  authDomain: 'proteinvault.firebaseapp.com',
  projectId: 'proteinvault',
  storageBucket: 'proteinvault.firebasestorage.app',
  messagingSenderId: '626522960503',
  appId: '1:626522960503:web:9fecbe54f3309b13a4cc72',
}

export const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
// Used by the admin panel (src/admin/) for Google sign-in — see
// src/admin/useAuth.js. The public site never touches this.
export const auth = getAuth(app)

// Two collections:
//   `products` — one doc per brand. Shape:
//     { brand, country, countryCode, tags, flavors: [
//         { id, name, priceThb, proteinG,
//           calories?, carbsG?, fatG?, sugarG?,  // all optional, gradual backfill
//           imageUrl?,  // optional — real packaging photo, self-hosted
//                       // under public/products/, gradual backfill same
//                       // as the macro fields. Never a stock/generic image.
//           shops: [
//             { shopId, url?, promo? }
//               // url is optional — a specific listing link (e.g. a real
//               // Shopee affiliate product link); falls back to the shop's
//               // own url/affiliateUrl when absent.
//               // promo is optional: { label, startsAt?, endsAt?,
//               // originalPriceThb? } — lives on the SHOP entry, not the
//               // flavor, since a deal at Tops doesn't imply the same deal
//               // at Villa Market or Shopee. label is required if promo
//               // exists; startsAt/endsAt are epoch-ms, no bound on either
//               // side means unbounded in that direction. See
//               // activePromo() in src/data/listings.js for how
//               // "currently active" is computed from these.
//           ] }
//       ] }
//     Note proteinG lives on each flavor, not the product — different
//     flavors/lines of the same brand can have genuinely different protein
//     content (see Musashi in src/data/listings.js for a real example).
//   `shops` — one doc per shop (see src/data/shops.js for the same shape
//     used in the local fallback data: id, name, type, url, affiliateUrl,
//     isAffiliateChannel, address, note)
//
// This is a directory, not a storefront — there's no checkout. Each flavor
// links out to every shop that carries it, using the most specific URL
// available (see shopLinkUrl in shops.js for the priority order).
//
// If you'd rather keep everything in one Realtime Database (matching your
// pumgoda-default-rtdb setup instead of Firestore), swap getFirestore for
// getDatabase from 'firebase/database' and adjust the queries in
// src/data/useListings.js accordingly — the component layer doesn't care
// which one you use.

import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

// Replace with your Firebase project config (Project Settings → General → Your apps)
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
}

export const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)

// Two collections:
//   `products` — one doc per brand. Shape:
//     { brand, country, countryCode, tags, flavors: [
//         { id, name, priceThb, proteinG, shopIds: [shopId, ...] }
//       ] }
//     Note proteinG lives on each flavor, not the product — different
//     flavors of the same brand can have genuinely different protein
//     content (see Musashi in src/data/listings.js for a real example).
//   `shops` — one doc per shop (see src/data/shops.js for the same shape
//     used in the local fallback data: id, name, type, url, address, note)
//
// This is a directory, not a storefront — there's no checkout. Each flavor
// links out to every shop that carries it via shopIds.
//
// If you'd rather keep everything in one Realtime Database (matching your
// pumgoda-default-rtdb setup instead of Firestore), swap getFirestore for
// getDatabase from 'firebase/database' and adjust the queries in
// src/data/useProducts.js accordingly — the component layer doesn't care
// which one you use.

// One-time script to load the current hardcoded product/shop data into
// Firestore. Run this yourself, locally: `node seed.js`
//
// BEFORE running: Firestore rules must temporarily allow writes (see
// SEEDING.md for the exact steps + why). Revert them right after.
//
// This uses the same client Firebase SDK already in package.json — no
// service account key needed, which is deliberate: that key is a much
// more sensitive credential than a temporary open-write window, so this
// avoids ever having to generate or share one.

import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc } from 'firebase/firestore'
import { products } from './src/data/listings.js'
import { shops } from './src/data/shops.js'

// Same config as src/firebase.js
const firebaseConfig = {
  apiKey: 'AIzaSyAsXkfkY-NW3REZ1XMt_O95WiWQDTYAHss',
  authDomain: 'proteinvault.firebaseapp.com',
  projectId: 'proteinvault',
  storageBucket: 'proteinvault.firebasestorage.app',
  messagingSenderId: '626522960503',
  appId: '1:626522960503:web:9fecbe54f3309b13a4cc72',
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function seed() {
  console.log(`Seeding ${products.length} products...`)
  for (const product of products) {
    await setDoc(doc(db, 'products', product.id), product)
    console.log(`  ✓ ${product.id}`)
  }

  console.log(`Seeding ${shops.length} shops...`)
  for (const shop of shops) {
    await setDoc(doc(db, 'shops', shop.id), shop)
    console.log(`  ✓ ${shop.id}`)
  }

  console.log('\nDone. Now go re-lock your Firestore rules (see SEEDING.md).')
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})

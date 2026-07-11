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

// Products live in a `products` collection, one doc per SKU. Shape:
// { brand, name, priceThb, proteinG, tags: ['thai-made','plant-based'], inStock, imageUrl }
//
// If you'd rather keep everything in one Realtime Database (matching your
// pumgoda-default-rtdb setup instead of Firestore), swap getFirestore for
// getDatabase from 'firebase/database' and adjust the queries in
// src/data/useProducts.js accordingly — the component layer doesn't care
// which one you use.

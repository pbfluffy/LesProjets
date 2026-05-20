// Firebase app + Realtime Database, loaded from the gstatic CDN so the
// project needs no npm dependency. The config below is a public client
// config — safe to commit; the Realtime Database security rules are what
// actually gate read and write access.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js'
import {
  getDatabase,
  ref,
  push,
  set,
  onValue,
} from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-database.js'

const firebaseConfig = {
  apiKey: 'AIzaSyCDciJLEz3jOkMSVMOUjEN6_jPkSdKpU_c',
  authDomain: 'pumgoda.firebaseapp.com',
  databaseURL: 'https://pumgoda-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'pumgoda',
  storageBucket: 'pumgoda.firebasestorage.app',
  messagingSenderId: '675478948836',
  appId: '1:675478948836:web:3ad94d736b6a677d8495f1',
}

const app = initializeApp(firebaseConfig)
export const db = getDatabase(app)
export { ref, push, set, onValue }

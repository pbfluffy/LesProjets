// Firebase app + Realtime Database (community votes) + Auth + Firestore (user sync).
// authDomain uses the custom subdomain so iOS Safari's storage partitioning
// doesn't break sign-in flows, and so auth state is shared with the other
// Pumba apps (Bill Splitter, Nutritions, landing) via IndexedDB on
// pumbafluffycorgi.com. The config below is a public client config -- safe to
// commit; security rules gate actual read/write access.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js'
import {
  getDatabase,
  ref,
  push,
  set,
  remove,
  onValue,
} from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-database.js'
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js'
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  onSnapshot,
  collection,
  deleteDoc,
  arrayUnion,
} from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js'

const firebaseConfig = {
  apiKey: 'AIzaSyCDciJLEz3jOkMSVMOUjEN6_jPkSdKpU_c',
  authDomain: 'auth.pumbafluffycorgi.com',
  databaseURL: 'https://pumgoda-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'pumgoda',
  storageBucket: 'pumgoda.firebasestorage.app',
  messagingSenderId: '675478948836',
  appId: '1:675478948836:web:3ad94d736b6a677d8495f1',
}

const app = initializeApp(firebaseConfig)
export const db = getDatabase(app)
export const auth = getAuth(app)
export const firestore = getFirestore(app)
export { ref, push, set, remove, onValue, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, doc, getDoc, setDoc, serverTimestamp, onSnapshot, collection, deleteDoc, arrayUnion }

// Save the signed-in user's name / email to userProfiles so the admin console
// shows who they are. Previously only the landing page wrote this, so users
// who only ever signed in to an app showed up as a bare uid. name / email are
// '' (not null) when missing: the userProfiles rule requires strings.
onAuthStateChanged(auth, (user) => {
  if (!user) return
  setDoc(doc(firestore, 'userProfiles', user.uid), {
    name: user.displayName || '',
    email: user.email || '',
    photoURL: user.photoURL || null,
    lastSeen: serverTimestamp(),
    lastApp: 'Pumgoda',
  }, { merge: true }).catch((e) => console.warn('[profile] write failed:', e?.code))
})

// Firebase Auth + Firestore. Same project as the landing page (pumgoda).
// Villagers sign in with LINE (custom token from the village-77 Worker);
// admins sign in with Google. authDomain uses the custom subdomain so iOS
// Safari's storage partitioning doesn't break sign-in flows.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signInWithCustomToken,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  collection,
  addDoc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  onSnapshot,
  increment,
  where,
  getDocs,
} from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyCDciJLEz3jOkMSVMOUjEN6_jPkSdKpU_c',
  authDomain: 'auth.pumbafluffycorgi.com',
  databaseURL: 'https://pumgoda-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'pumgoda',
  storageBucket: 'pumgoda.firebasestorage.app',
  messagingSenderId: '675478948836',
  appId: '1:675478948836:web:3ad94d736b6a677d8495f1',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Keep a copy of what's been read on the phone (IndexedDB), so a repeat visit
// shows shops straight away and the app copes with a weak signal; live
// updates follow. Several open tabs share it. Where IndexedDB isn't
// available the SDK quietly falls back to memory only.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
export {
  onAuthStateChanged, signInWithCustomToken, updateProfile, GoogleAuthProvider, signInWithPopup, signOut,
  doc, collection, addDoc, setDoc, getDoc, updateDoc, deleteDoc, query, orderBy, limit,
  serverTimestamp, onSnapshot, writeBatch, increment, where, getDocs,
};

// Record the signed-in user for the village admin tab (villageMembers only).
// The village is its own system: it doesn't write to the site-wide
// userProfiles that admindepum lists (firestore.rules keep LINE accounts out
// of it). Also called right after a LINE sign-in sets the display name,
// since that lands after onAuthStateChanged has already fired.
export function saveProfile(user) {
  return saveMember(user)
}

// villageMembers/{uid}: everyone who has signed in to this app, posted or
// not, for the admin tab. userProfiles is shared by every app (lastApp gets
// overwritten), so it can't say who belongs to the village.
async function saveMember(user) {
  const ref = doc(db, 'villageMembers', user.uid)
  try {
    const data = {
      name: user.displayName || '',
      photoURL: user.photoURL || null,
      provider: user.uid.startsWith('line:') ? 'line' : 'google',
      lastSeen: serverTimestamp(),
    }
    if (!(await getDoc(ref)).exists()) data.firstSeen = serverTimestamp()
    await setDoc(ref, data, { merge: true })
  } catch (e) {
    console.warn('[member] write failed:', e?.code)
  }
}
onAuthStateChanged(auth, (user) => { if (user) saveProfile(user); });

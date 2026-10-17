// Firebase Auth + Firestore. Same project as the landing page (pumgoda).
// authDomain uses the custom subdomain so iOS Safari's storage partitioning
// doesn't break sign-in flows.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js';
import {
  getFirestore,
  doc,
  collection,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  onSnapshot,
  writeBatch,
  arrayUnion,
  arrayRemove,
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
export const db = getFirestore(app);
export {
  onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut,
  doc, collection, addDoc, updateDoc, deleteDoc, getDocs, query, orderBy,
  serverTimestamp, onSnapshot, writeBatch, arrayUnion, arrayRemove,
};

// Save the signed-in user's name / email to userProfiles so the admin console
// shows who they are. Previously only the landing page wrote this, so users
// who only ever signed in to an app showed up as a bare uid. name / email are
// '' (not null) when missing: the userProfiles rule requires strings.
onAuthStateChanged(auth, (user) => {
  if (!user) return;
  setDoc(doc(db, 'userProfiles', user.uid), {
    name: user.displayName || '',
    email: user.email || '',
    photoURL: user.photoURL || null,
    lastSeen: serverTimestamp(),
    lastApp: 'Dog Near Me',
  }, { merge: true }).catch((e) => console.warn('[profile] write failed:', e?.code));
});

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA0Ma87SQ-lnKBdPxJh4Gr1Uu6C__m8kT0",
  authDomain: "rubochagonj.firebaseapp.com",
  databaseURL: "https://rubochagonj-default-rtdb.firebaseio.com",
  projectId: "rubochagonj",
  storageBucket: "rubochagonj.firebasestorage.app",
  messagingSenderId: "839823677590",
  appId: "1:839823677590:web:444167644f7f6847ea8ab7",
  measurementId: "G-HDQNQJ7Y75"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, analytics, db, storage, ref, uploadBytesResumable, getDownloadURL };

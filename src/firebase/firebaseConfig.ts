import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBgTH42sDXD4dhdlMW15HuDcXaWnqId8Pc",
  authDomain: "ecoloop-7ff87.firebaseapp.com",
  projectId: "ecoloop-7ff87",
  storageBucket: "ecoloop-7ff87.firebasestorage.app",
  messagingSenderId: "628428468908",
  appId: "1:628428468908:web:db93162a320d93cf28a509",
  measurementId: "G-GMDF2WRE5R",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const authReadyPromise = auth.authStateReady();
export const db = getFirestore(app);
export const storage = getStorage(app);

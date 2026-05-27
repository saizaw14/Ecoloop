import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";

type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

export async function registerUser({ name, email, password }: RegisterInput) {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email.trim(),
    password
  );

  const user = userCredential.user;
  const trimmedName = name.trim();

  await updateProfile(user, {
    displayName: trimmedName,
  });

  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    name: trimmedName,
    email: user.email,
    savedTipIds: [],
    totalScans: 0,
    totalEcoPoints: 0,
    totalCO2Saved: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return user;
}

export async function loginUser(email: string, password: string) {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email.trim(),
    password
  );

  return userCredential.user;
}

export async function logoutUser() {
  await signOut(auth);
}

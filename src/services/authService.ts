import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";

type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

type SyncUserDocumentInput = {
  seedDefaults?: boolean;
  user: User;
  userName?: string;
};

function buildUserDocumentDefaults(user: User, userName: string) {
  return {
    uid: user.uid,
    name: userName,
    email: user.email?.trim() || null,
    categoryScanCounts: {},
    lastWasteScanAt: null,
    savedTipIds: [],
    totalScans: 0,
    totalEcoPoints: 0,
    totalCO2Saved: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export async function syncUserDocument({
  seedDefaults = false,
  user,
  userName,
}: SyncUserDocumentInput) {
  const normalizedUserName =
    userName?.trim() || user.displayName?.trim() || user.email?.split("@")[0]?.trim() || "Eco Warrior";
  const userRef = doc(db, "users", user.uid);

  try {
    const snapshot = await getDoc(userRef);

    if (snapshot.exists()) {
      const currentData = snapshot.data() as Record<string, unknown>;
      const updates: Record<string, unknown> = {};

      if (currentData.uid !== user.uid) {
        updates.uid = user.uid;
      }

      const normalizedEmail = user.email?.trim() || null;

      if (normalizedEmail && currentData.email !== normalizedEmail) {
        updates.email = normalizedEmail;
      }

      if (!currentData.name && normalizedUserName) {
        updates.name = normalizedUserName;
      }

      if (!Object.keys(updates).length) {
        return;
      }

      updates.updatedAt = serverTimestamp();
      await setDoc(userRef, updates, { merge: true });
      return;
    }
  } catch {
    // Fall through and attempt a merge write below. This helps recover if the
    // document shape is out of sync or the first read raced auth/session setup.
  }

  const userDocument = seedDefaults
    ? buildUserDocumentDefaults(user, normalizedUserName)
    : {
        uid: user.uid,
        name: normalizedUserName,
        email: user.email?.trim() || null,
        updatedAt: serverTimestamp(),
      };

  await setDoc(userRef, userDocument, { merge: true });
}

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

  await user.getIdToken();
  await syncUserDocument({
    seedDefaults: true,
    user,
    userName: trimmedName,
  });

  return user;
}

export async function loginUser(email: string, password: string) {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email.trim(),
    password
  );

  await userCredential.user.getIdToken();
  await syncUserDocument({
    user: userCredential.user,
  });

  return userCredential.user;
}

export async function sendResetPasswordEmail(email: string) {
  const normalizedEmail = email.trim();

  await sendPasswordResetEmail(auth, normalizedEmail);
}

export async function logoutUser() {
  await signOut(auth);
}

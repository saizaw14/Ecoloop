import {
  arrayRemove,
  arrayUnion,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { db } from '@/firebase/firebaseConfig';

function normalizeSavedTipIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is number => typeof item === 'number' && Number.isFinite(item));
}

export function subscribeToSavedTipIds(userId: string, onChange: (savedTipIds: number[]) => void) {
  return onSnapshot(doc(db, 'users', userId), (snapshot) => {
    if (!snapshot.exists()) {
      onChange([]);
      return;
    }

    onChange(normalizeSavedTipIds(snapshot.data().savedTipIds));
  });
}

export async function saveTipForUser(userId: string, tipId: number) {
  await setDoc(
    doc(db, 'users', userId),
    {
      savedTipIds: arrayUnion(tipId),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function unsaveTipForUser(userId: string, tipId: number) {
  await setDoc(
    doc(db, 'users', userId),
    {
      savedTipIds: arrayRemove(tipId),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

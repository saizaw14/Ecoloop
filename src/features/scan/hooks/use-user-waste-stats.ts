import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

import type { UserWasteStats } from '@/features/scan/services/user-waste-stats-service';
import {
  emptyUserWasteStats,
  normalizeUserWasteStats,
} from '@/features/scan/services/user-waste-stats-service';
import { auth, db } from '@/firebase/firebaseConfig';

export function useUserWasteStats() {
  const [stats, setStats] = useState<UserWasteStats>(emptyUserWasteStats);

  useEffect(() => {
    let isMounted = true;
    let unsubscribeUserDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeUserDoc?.();
      unsubscribeUserDoc = null;

      if (!user) {
        if (isMounted) {
          setStats(emptyUserWasteStats);
        }

        return;
      }

      unsubscribeUserDoc = onSnapshot(
        doc(db, 'users', user.uid),
        (snapshot) => {
          if (!isMounted) {
            return;
          }

          const data = snapshot.exists()
            ? (snapshot.data() as Record<string, unknown>)
            : null;

          setStats(normalizeUserWasteStats(data));
        },
        () => {
          if (isMounted) {
            setStats(emptyUserWasteStats);
          }
        }
      );
    });

    return () => {
      isMounted = false;
      unsubscribeUserDoc?.();
      unsubscribeAuth();
    };
  }, []);

  return stats;
}

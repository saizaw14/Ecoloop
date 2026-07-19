import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';

import type { UserWasteStats } from '@/features/scan/services/user-waste-stats-service';
import {
  emptyUserWasteStats,
  normalizeUserWasteStats,
} from '@/features/scan/services/user-waste-stats-service';
import { db } from '@/firebase/firebaseConfig';
import { useAuthSession } from '@/hooks/use-auth-session';

export function useUserWasteStats() {
  const [stats, setStats] = useState<UserWasteStats>(emptyUserWasteStats);
  const { isReady, user } = useAuthSession();

  useEffect(() => {
    let isMounted = true;

    if (!isReady) {
      return;
    }

    if (!user) {
      setStats(emptyUserWasteStats);
      return;
    }

    const unsubscribeUserDoc = onSnapshot(
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

    return () => {
      isMounted = false;
      unsubscribeUserDoc();
    };
  }, [isReady, user?.uid]);

  return stats;
}

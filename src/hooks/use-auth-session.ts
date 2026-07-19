import { useEffect, useState } from 'react';
import { onIdTokenChanged, type User } from 'firebase/auth';

import { auth, authReadyPromise } from '@/firebase/firebaseConfig';

type AuthSession = {
  isReady: boolean;
  user: User | null;
};

export function useAuthSession(): AuthSession {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onIdTokenChanged(auth, (nextUser) => {
      if (!isMounted) {
        return;
      }

      setUser(nextUser);
    });

    void authReadyPromise.then(() => {
      if (!isMounted) {
        return;
      }

      setUser(auth.currentUser);
      setIsReady(true);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return {
    isReady,
    user,
  };
}

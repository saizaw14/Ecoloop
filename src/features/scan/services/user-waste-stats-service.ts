import { doc, increment, serverTimestamp, setDoc } from 'firebase/firestore';

import {
  wasteCategorySlugs,
  type WasteCategoryCounts,
} from '@/features/categories/data/category-content';
import type { WasteClassificationResult } from '@/features/scan/services/waste-classification-service';
import { auth, db } from '@/firebase/firebaseConfig';

export type UserWasteStats = {
  categoryScanCounts: WasteCategoryCounts;
  totalCO2Saved: number;
  totalScans: number;
};

export const emptyUserWasteStats: UserWasteStats = {
  categoryScanCounts: {},
  totalCO2Saved: 0,
  totalScans: 0,
};

function getFiniteNonNegativeNumber(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, value);
}

export function normalizeCategoryScanCounts(value: unknown): WasteCategoryCounts {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const rawCounts = value as Record<string, unknown>;

  return wasteCategorySlugs.reduce<WasteCategoryCounts>((counts, slug) => {
    const normalizedCount = Math.floor(getFiniteNonNegativeNumber(rawCounts[slug]));

    if (normalizedCount > 0) {
      counts[slug] = normalizedCount;
    }

    return counts;
  }, {});
}

export function normalizeUserWasteStats(
  value: Record<string, unknown> | null | undefined
): UserWasteStats {
  if (!value) {
    return emptyUserWasteStats;
  }

  return {
    categoryScanCounts: normalizeCategoryScanCounts(value.categoryScanCounts),
    totalCO2Saved: getFiniteNonNegativeNumber(value.totalCO2Saved),
    totalScans: Math.floor(getFiniteNonNegativeNumber(value.totalScans)),
  };
}

type RecordedWasteScan = Pick<
  WasteClassificationResult,
  'categorySlug' | 'co2SavedKg'
>;

export async function recordWasteScan({
  categorySlug,
  co2SavedKg,
}: RecordedWasteScan) {
  const user = auth.currentUser;

  if (!user) {
    return;
  }

  const normalizedCO2SavedKg = getFiniteNonNegativeNumber(co2SavedKg);

  try {
    await setDoc(
      doc(db, 'users', user.uid),
      {
        categoryScanCounts: {
          [categorySlug]: increment(1),
        },
        totalCO2Saved: increment(normalizedCO2SavedKg),
        totalScans: increment(1),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch {
    // Keep the scan result flow usable even if syncing impact stats fails.
  }
}

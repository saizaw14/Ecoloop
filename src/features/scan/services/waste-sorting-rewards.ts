import {
  getWasteCategory,
  type WasteCategorySlug,
} from '@/features/categories/data/category-content';

export const ecoPointRules = {
  basePoints: 5,
  impactMultiplier: 50,
  manualCorrectionBonus: 4,
  recyclableBonus: 3,
} as const;

type WasteSortingGuidance = {
  co2SavedKg: number;
  nextStep: string;
  summary: string;
};

const sortingGuidanceByCategorySlug = {
  cardboard: {
    co2SavedKg: 0.16,
    summary: 'TensorFlow.js classified this item as cardboard packaging.',
    nextStep:
      'Flatten it, keep it dry, and remove extra plastic or foam inserts before recycling.',
  },
  glass: {
    co2SavedKg: 0.28,
    summary: 'TensorFlow.js classified this item as glass.',
    nextStep:
      'Empty the contents, rinse the container, and recycle it with glass items.',
  },
  metal: {
    co2SavedKg: 0.24,
    summary: 'TensorFlow.js classified this item as metal.',
    nextStep:
      'Rinse away residue and place it with clean metal recyclables.',
  },
  paper: {
    co2SavedKg: 0.12,
    summary: 'TensorFlow.js classified this item as paper.',
    nextStep:
      'Keep it dry and flatten it if possible before placing it in paper recycling.',
  },
  plastic: {
    co2SavedKg: 0.2,
    summary: 'TensorFlow.js classified this item as plastic.',
    nextStep:
      'Rinse it briefly, let it dry, and place it in the plastic recycling stream.',
  },
  general: {
    co2SavedKg: 0,
    summary: 'TensorFlow.js classified this item as trash rather than a recyclable.',
    nextStep:
      'Dispose of it in the trash unless local guidelines offer a specialist disposal stream.',
  },
} as const satisfies Record<WasteCategorySlug, WasteSortingGuidance>;

export function getWasteSortingGuidance(categorySlug: WasteCategorySlug) {
  return sortingGuidanceByCategorySlug[categorySlug];
}

export function getWasteSortingSummary(
  categorySlug: WasteCategorySlug,
  wasCategoryCorrected: boolean
) {
  if (!wasCategoryCorrected) {
    return getWasteSortingGuidance(categorySlug).summary;
  }

  const category = getWasteCategory(categorySlug);

  if (!category) {
    return 'You manually sorted this item into the correct waste category.';
  }

  return `You manually sorted this item as ${category.name}.`;
}

export function calculateWasteEcoPoints(
  categorySlug: WasteCategorySlug,
  wasCategoryCorrected: boolean
) {
  const category = getWasteCategory(categorySlug);
  const guidance = getWasteSortingGuidance(categorySlug);
  const recyclableBonus = category?.recyclable ? ecoPointRules.recyclableBonus : 0;
  const correctionBonus = wasCategoryCorrected ? ecoPointRules.manualCorrectionBonus : 0;

  return (
    ecoPointRules.basePoints +
    Math.round(guidance.co2SavedKg * ecoPointRules.impactMultiplier) +
    recyclableBonus +
    correctionBonus
  );
}

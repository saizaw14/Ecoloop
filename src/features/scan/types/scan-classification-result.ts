import type { getWasteCategory } from '@/features/categories/data/category-content';

export type ScanClassificationResult = {
  acceptedExamples: string[];
  capturedAt: string;
  categoryName: string;
  categorySlug: NonNullable<ReturnType<typeof getWasteCategory>>['slug'];
  co2SavedKg: number;
  confidence: number;
  description: string;
  environmentalImpact: string;
  iconBackgroundColor: string;
  iconName: NonNullable<ReturnType<typeof getWasteCategory>>['iconName'];
  imageUri: string;
  nextStep: string;
  preparationSteps: string[];
  recyclable: boolean;
  summary: string;
};

import { getWasteCategory, type WasteCategorySlug } from '@/features/categories/data/category-content';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getHashFromString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

type MockClassificationTemplate = {
  co2SavedKg: number;
  confidenceMax: number;
  confidenceMin: number;
  nextStep: string;
  slug: WasteCategorySlug;
  summary: string;
};

const mockClassificationTemplates: MockClassificationTemplate[] = [
  {
    slug: 'plastic',
    confidenceMin: 91,
    confidenceMax: 98,
    co2SavedKg: 0.2,
    summary: 'This looks like a recyclable plastic container or bottle.',
    nextStep: 'Rinse it briefly, let it dry, and place it in the plastic recycling stream.',
  },
  {
    slug: 'paper',
    confidenceMin: 90,
    confidenceMax: 97,
    co2SavedKg: 0.12,
    summary: 'This appears to be a paper-based item that can likely be recycled.',
    nextStep: 'Keep it dry and flatten it if possible before placing it in paper recycling.',
  },
  {
    slug: 'cardboard',
    confidenceMin: 90,
    confidenceMax: 97,
    co2SavedKg: 0.16,
    summary: 'This looks like a cardboard box or paperboard packaging item.',
    nextStep: 'Flatten it, keep it dry, and remove extra plastic or foam inserts before recycling.',
  },
  {
    slug: 'glass',
    confidenceMin: 89,
    confidenceMax: 96,
    co2SavedKg: 0.28,
    summary: 'This seems to be a glass bottle or jar suitable for glass recycling.',
    nextStep: 'Empty the contents, rinse the container, and recycle it with glass items.',
  },
  {
    slug: 'metal',
    confidenceMin: 88,
    confidenceMax: 95,
    co2SavedKg: 0.24,
    summary: 'This item looks like a metal can or container.',
    nextStep: 'Rinse away residue and place it with clean metal recyclables.',
  },
  {
    slug: 'general',
    confidenceMin: 85,
    confidenceMax: 92,
    co2SavedKg: 0,
    summary: 'This seems more suitable for the trash than the recycling stream.',
    nextStep: 'Dispose of it in the trash unless local guidelines offer a specialist disposal stream.',
  },
];

export type MockClassificationResult = {
  acceptedExamples: string[];
  capturedAt: string;
  categoryName: string;
  categorySlug: WasteCategorySlug;
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

export async function mockClassifyWaste(imageUri: string) {
  const hash = getHashFromString(imageUri);
  const selectedTemplate = mockClassificationTemplates[hash % mockClassificationTemplates.length];
  const category = getWasteCategory(selectedTemplate.slug);

  if (!category) {
    throw new Error('Unable to mock classify this waste item.');
  }

  const confidenceSpread =
    selectedTemplate.confidenceMax - selectedTemplate.confidenceMin + 1;
  const confidence =
    selectedTemplate.confidenceMin + (hash % Math.max(confidenceSpread, 1));

  await delay(1100);

  return {
    acceptedExamples: category.accepted.slice(0, 4),
    capturedAt: new Date().toISOString(),
    categoryName: category.name,
    categorySlug: category.slug,
    co2SavedKg: selectedTemplate.co2SavedKg,
    confidence,
    description: category.description,
    environmentalImpact: category.environmentalImpact,
    iconBackgroundColor: category.iconBackgroundColor,
    iconName: category.iconName,
    imageUri,
    nextStep: selectedTemplate.nextStep,
    preparationSteps: category.preparationSteps.slice(0, 3),
    recyclable: category.recyclable,
    summary: selectedTemplate.summary,
  } satisfies MockClassificationResult;
}

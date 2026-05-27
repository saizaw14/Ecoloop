import type { ComponentProps } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import categoriesIndex from '@/data/categories/index.json';
import ewasteData from '@/data/categories/ewaste.json';
import generalWasteData from '@/data/categories/generalwaste.json';
import glassData from '@/data/categories/glass.json';
import metalData from '@/data/categories/metal.json';
import organicData from '@/data/categories/organic.json';
import paperData from '@/data/categories/paper.json';
import plasticData from '@/data/categories/plastic.json';

type CategorySource = {
  accepted: string[];
  category: string;
  description: string;
  environmentalImpact: string;
  name: string;
  notAccepted: string[];
  preparationSteps: string[];
  recyclable: boolean;
  tips: string[];
};

type CategoryPresentation = {
  accentColor: string;
  detailSubtitle: string;
  iconBackgroundColor: string;
  iconName: ComponentProps<typeof MaterialCommunityIcons>['name'];
  previewDescription: string;
  previewTags: string[];
};

export const categoriesOverviewIconName: ComponentProps<
  typeof MaterialCommunityIcons
>['name'] = 'recycle';

const categorySourceMap = {
  plastic: plasticData,
  paper: paperData,
  glass: glassData,
  metal: metalData,
  organic: organicData,
  'e-waste': ewasteData,
  general: generalWasteData,
} as const satisfies Record<string, CategorySource>;

const categoryPresentationMap = {
  plastic: {
    accentColor: '#3B82F6',
    detailSubtitle: '0 items sorted',
    iconBackgroundColor: '#3B82F6',
    iconName: 'bottle-soda-classic-outline',
    previewDescription: 'Recyclable plastic containers, bottles, and packaging',
    previewTags: ['Bottles', 'Containers', 'Jugs'],
  },
  paper: {
    accentColor: '#F59E0B',
    detailSubtitle: '0 items sorted',
    iconBackgroundColor: '#F59E0B',
    iconName: 'newspaper-variant-outline',
    previewDescription: 'Paper products, cardboard, and clean packaging',
    previewTags: ['Cardboard', 'Newspapers', 'Magazines'],
  },
  glass: {
    accentColor: '#14B8A6',
    detailSubtitle: '0 items sorted',
    iconBackgroundColor: '#14B8A6',
    iconName: 'bottle-wine-outline',
    previewDescription: 'Glass bottles, jars, and containers',
    previewTags: ['Bottles', 'Jars', 'Containers'],
  },
  metal: {
    accentColor: '#6B7280',
    detailSubtitle: '0 items sorted',
    iconBackgroundColor: '#6B7280',
    iconName: 'hammer-wrench',
    previewDescription: 'Aluminum cans, steel cans, and metal containers',
    previewTags: ['Cans', 'Foil', 'Containers'],
  },
  organic: {
    accentColor: '#22C55E',
    detailSubtitle: '0 items sorted',
    iconBackgroundColor: '#22C55E',
    iconName: 'food-apple-outline',
    previewDescription: 'Food scraps, yard waste, and compostable materials',
    previewTags: ['Scraps', 'Yard Waste', 'Coffee Grounds'],
  },
  'e-waste': {
    accentColor: '#A855F7',
    detailSubtitle: '0 items sorted',
    iconBackgroundColor: '#A855F7',
    iconName: 'power-plug-outline',
    previewDescription: 'Electronic devices and components',
    previewTags: ['Phones', 'Batteries', 'Chargers'],
  },
  general: {
    accentColor: '#FF3B30',
    detailSubtitle: '0 items sorted',
    iconBackgroundColor: '#FF3B30',
    iconName: 'trash-can-outline',
    previewDescription: 'Non-recyclable waste items',
    previewTags: ['Mixed Materials', 'Contaminated Items', 'Other Waste'],
  },
} as const satisfies Record<keyof typeof categorySourceMap, CategoryPresentation>;

export type WasteCategorySlug = keyof typeof categorySourceMap;

export type WasteCategory = CategorySource &
  CategoryPresentation & {
    slug: WasteCategorySlug;
  };

const orderedCategorySlugs = categoriesIndex.categories.filter(
  (slug): slug is WasteCategorySlug => slug in categorySourceMap
);

export const wasteCategories: WasteCategory[] = orderedCategorySlugs.map((slug) => {
  const source = categorySourceMap[slug];
  const presentation = categoryPresentationMap[slug];

  return {
    ...source,
    ...presentation,
    slug,
  } as WasteCategory;
});

export function getWasteCategory(slug: string) {
  return wasteCategories.find((category) => category.slug === slug);
}

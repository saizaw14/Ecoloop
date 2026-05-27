import type { ComponentProps } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import cardboardData from '@/data/categories/cardboard.json';
import categoriesIndex from '@/data/categories/index.json';
import generalWasteData from '@/data/categories/generalwaste.json';
import glassData from '@/data/categories/glass.json';
import metalData from '@/data/categories/metal.json';
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
  cardboard: cardboardData,
  glass: glassData,
  metal: metalData,
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
  cardboard: {
    accentColor: '#D97706',
    detailSubtitle: '0 items sorted',
    iconBackgroundColor: '#D97706',
    iconName: 'package-variant-closed',
    previewDescription: 'Boxes, cartons, and clean cardboard packaging',
    previewTags: ['Boxes', 'Cartons', 'Tubes'],
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
  general: {
    accentColor: '#FF3B30',
    detailSubtitle: '0 items sorted',
    iconBackgroundColor: '#FF3B30',
    iconName: 'trash-can-outline',
    previewDescription: 'Non-recyclable items that belong in the trash',
    previewTags: ['Mixed Materials', 'Contaminated Items', 'Trash'],
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

import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import ecoTipsSource from '@/data/eco_tips.json';

type TipIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type EcoTipJson = {
  category: string;
  description: string;
  icon: string;
  id: number;
  title: string;
};

type EcoTipsJson = {
  categories: string[];
  tips: EcoTipJson[];
  totalTips: number;
};

type TipVisuals = {
  iconBackgroundColor: string;
  iconColor: string;
  iconName: TipIconName;
};

export type EcoTip = {
  category: string;
  description: string;
  iconBackgroundColor: string;
  iconColor: string;
  iconName: TipIconName;
  id: number;
  title: string;
};

const ecoTipsData = ecoTipsSource as EcoTipsJson;

const tipVisualsByCategory: Record<string, TipVisuals> = {
  'Best Practices': {
    iconBackgroundColor: '#E9EEFF',
    iconColor: '#5B6BFF',
    iconName: 'clipboard-check-outline',
  },
  Composting: {
    iconBackgroundColor: '#E8FAEC',
    iconColor: '#16A34A',
    iconName: 'sprout-outline',
  },
  'E-Waste': {
    iconBackgroundColor: '#F4E8FF',
    iconColor: '#9333EA',
    iconName: 'power-plug-outline',
  },
  'Material Guide': {
    iconBackgroundColor: '#E2F5FF',
    iconColor: '#0EA5E9',
    iconName: 'recycle-variant',
  },
  'Paper Tips': {
    iconBackgroundColor: '#FFF0DB',
    iconColor: '#F59E0B',
    iconName: 'file-document-outline',
  },
  'Recycling Basics': {
    iconBackgroundColor: '#E5F0FF',
    iconColor: '#4F8CFF',
    iconName: 'water-outline',
  },
  'Zero Waste': {
    iconBackgroundColor: '#E2ECFF',
    iconColor: '#377CF1',
    iconName: 'earth',
  },
};

const fallbackVisuals: TipVisuals = {
  iconBackgroundColor: '#E8FAEC',
  iconColor: '#0AA36C',
  iconName: 'leaf',
};

export const ecoTips: EcoTip[] = ecoTipsData.tips.map((tip) => {
  const visuals = tipVisualsByCategory[tip.category] ?? fallbackVisuals;

  return {
    category: tip.category,
    description: tip.description,
    iconBackgroundColor: visuals.iconBackgroundColor,
    iconColor: visuals.iconColor,
    iconName: visuals.iconName,
    id: tip.id,
    title: tip.title,
  };
});

export const ecoTipCategories = ecoTipsData.categories;

export const ecoTipOfTheDay = ecoTips.find((tip) => tip.id === 8) ?? ecoTips[0];

export function getEcoTipById(id: number) {
  return ecoTips.find((tip) => tip.id === id);
}

import type { ComponentProps } from 'react';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { AppImages } from '@/assets/images';

type MaterialIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export type OnboardingSlide = {
  accentColor: string;
  buttonLabel: string;
  description: string;
  iconName: MaterialIconName;
  id: string;
  image: number;
  title: string;
};

export const onboardingSlides: OnboardingSlide[] = [
  {
    id: 'waste-recognition',
    title: 'AI Waste Recognition',
    description:
      'Simply snap a photo of your waste item and let our AI identify the correct recycling category instantly.',
    buttonLabel: 'Next',
    iconName: 'recycle',
    image: AppImages.onboardingWasteRecognition,
    accentColor: '#0CB574',
  },
  {
    id: 'guidance',
    title: 'Step-by-Step Guidance',
    description:
      'Get detailed recycling instructions with visual guides to help you dispose of items correctly.',
    buttonLabel: 'Next',
    iconName: 'leaf',
    image: AppImages.onboardingGuidance,
    accentColor: '#09C956',
  },
  {
    id: 'recycling-centres',
    title: 'Find Recycling Centers',
    description:
      'Locate nearby recycling facilities and drop-off points for specialized waste items.',
    buttonLabel: 'Next',
    iconName: 'map-marker-outline',
    image: AppImages.onboardingRecyclingCentre,
    accentColor: '#377CF1',
  },
  {
    id: 'impact-tracker',
    title: 'Track Your Impact',
    description:
      "Monitor your environmental contribution, earn eco-points, and see how much CO2 you've saved.",
    buttonLabel: 'Get Started',
    iconName: 'chart-line-variant',
    image: AppImages.onboardingTracker,
    accentColor: '#9E3FF8',
  },
];

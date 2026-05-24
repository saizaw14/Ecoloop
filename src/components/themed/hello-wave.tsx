import Animated from 'react-native-reanimated';

import { FontSizes, LineHeights } from '@/constants/theme';

export function HelloWave() {
  return (
    <Animated.Text
      style={{
        fontSize: FontSizes.hero,
        lineHeight: LineHeights.hero,
        marginTop: -6,
        animationName: {
          '50%': { transform: [{ rotate: '25deg' }] },
        },
        animationIterationCount: 4,
        animationDuration: '300ms',
      }}>
      👋
    </Animated.Text>
  );
}

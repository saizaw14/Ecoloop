import { Image } from 'expo-image';
import { Platform, StyleSheet } from 'react-native';

import { AppImages } from '@/assets/images';
import ParallaxScrollView from '@/components/layout/parallax-scroll-view';
import { ThemedText } from '@/components/themed/themed-text';
import { ThemedView } from '@/components/themed/themed-view';
import { Collapsible } from '@/components/ui/collapsible';
import { ExternalLink } from '@/components/ui/external-link';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';

export default function ExploreScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="chevron.left.forwardslash.chevron.right"
          style={styles.headerImage}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText
          type="title"
          style={{
            fontFamily: Fonts.rounded,
          }}>
          Explore
        </ThemedText>
      </ThemedView>

      <ThemedText>This app includes example code to help you get started.</ThemedText>

      <Collapsible title="Feature-based structure">
        <ThemedText>
          Screen implementations now live inside{' '}
          <ThemedText type="defaultSemiBold">src/features</ThemedText>, while the files in{' '}
          <ThemedText type="defaultSemiBold">app</ThemedText> only define routes.
        </ThemedText>
      </Collapsible>

      <Collapsible title="Shared UI">
        <ThemedText>
          Reusable building blocks are grouped in{' '}
          <ThemedText type="defaultSemiBold">src/components</ThemedText> by responsibility:
          navigation, layout, themed primitives, and UI elements.
        </ThemedText>
      </Collapsible>

      <Collapsible title="Theme and hooks">
        <ThemedText>
          Theme tokens now live in <ThemedText type="defaultSemiBold">src/constants/theme.ts</ThemedText>,
          and app hooks live in <ThemedText type="defaultSemiBold">src/hooks</ThemedText> so
          styling logic stays easy to find.
        </ThemedText>
        <ExternalLink href="https://docs.expo.dev/router/introduction">
          <ThemedText type="link">Learn more about Expo Router</ThemedText>
        </ExternalLink>
      </Collapsible>

      <Collapsible title="Assets">
        <ThemedText>
          Static images stay in the root <ThemedText type="defaultSemiBold">assets</ThemedText>{' '}
          folder and are re-exported through{' '}
          <ThemedText type="defaultSemiBold">src/assets/images/index.ts</ThemedText> to keep imports
          clean.
        </ThemedText>
        <Image source={AppImages.reactLogo} style={styles.assetPreview} />
      </Collapsible>

      <Collapsible title="Next step">
        <ThemedText>
          Replace these starter feature screens with your EcoLoop designs once you are ready to map
          the Figma UI into components.
        </ThemedText>
        {Platform.select({
          ios: (
            <ThemedText>
              The parallax wrapper in{' '}
              <ThemedText type="defaultSemiBold">
                src/components/layout/parallax-scroll-view.tsx
              </ThemedText>{' '}
              is still available if you want to reuse it.
            </ThemedText>
          ),
        })}
      </Collapsible>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  assetPreview: {
    width: 100,
    height: 100,
    alignSelf: 'center',
  },
});

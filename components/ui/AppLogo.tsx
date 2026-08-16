import { Image, ImageStyle, StyleProp, StyleSheet, View } from 'react-native';

type AppLogoProps = {
  size?: number;
  style?: StyleProp<ImageStyle>;
  showBadge?: boolean;
};

export const AppLogo = ({ size = 36, style, showBadge = true }: AppLogoProps) => {
  return (
    <View style={[styles.container, showBadge && styles.badgeStyle]}>
      <Image
        source={require('@/assets/logo.png')}
        style={[{ width: size, height: size, borderRadius: size / 4 }, style]}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  badgeStyle: {
    borderRadius: 10,
    backgroundColor: '#ffffff',
    padding: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
});

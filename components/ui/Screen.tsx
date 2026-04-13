import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

type ScreenProps = {
  children: ReactNode;
};

export const Screen = ({ children }: ScreenProps) => {
  const { theme, isDark } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: theme.screenBg }]}> 
      <View style={[styles.glowTop, { backgroundColor: theme.glowTop, opacity: isDark ? 0.45 : 0.7 }]} />
      <View style={[styles.glowBottom, { backgroundColor: theme.glowBottom, opacity: isDark ? 0.35 : 0.6 }]} />
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  glowTop: {
    position: 'absolute',
    top: -60,
    right: -80,
    width: 220,
    height: 220,
    borderRadius: 220,
    backgroundColor: '#d6f1ec',
    opacity: 0.7,
  },
  glowBottom: {
    position: 'absolute',
    left: -90,
    bottom: -80,
    width: 220,
    height: 220,
    borderRadius: 220,
    backgroundColor: '#dbeafe',
    opacity: 0.6,
  },
  content: {
    flex: 1,
  },
});
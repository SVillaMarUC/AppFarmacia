import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppLogo } from '@/components/ui/AppLogo';
import { useTheme } from '@/context/ThemeContext';

type ScreenHeaderProps = {
  title: string;
  kicker?: string;
  subtitle?: string;
  logoSize?: number;
  rightAction?: ReactNode;
};

export const ScreenHeader = ({
  title,
  kicker,
  subtitle,
  logoSize = 44,
  rightAction,
}: ScreenHeaderProps) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <AppLogo size={logoSize} showBadge={false} />
        <View style={styles.textContainer}>
          {kicker ? (
            <Text style={[styles.kicker, { color: theme.colors.primary }]}>{kicker}</Text>
          ) : null}
          <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
            {title}
          </Text>
        </View>
        {rightAction ? <View style={styles.rightAction}>{rightAction}</View> : null}
      </View>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  kicker: {
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    fontSize: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subtitle: {
    lineHeight: 20,
    fontSize: 14,
  },
  rightAction: {
    justifyContent: 'center',
  },
});


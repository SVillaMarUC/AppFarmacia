import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppLogo } from '@/components/ui/AppLogo';

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
  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <AppLogo size={logoSize} showBadge={false} />
        <View style={styles.textContainer}>
          {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
        </View>
        {rightAction ? <View style={styles.rightAction}>{rightAction}</View> : null}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
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
    color: '#0f766e',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    fontSize: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.4,
  },
  subtitle: {
    color: '#334155',
    lineHeight: 20,
    fontSize: 14,
  },
  rightAction: {
    justifyContent: 'center',
  },
});

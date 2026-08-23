import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

type ButtonProps = {
  texto: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primario' | 'secundario' | 'peligro';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const Button = ({ texto, onPress, loading, variant = 'primario', disabled, style }: ButtonProps) => {
  const { theme } = useTheme();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        variant === 'primario' && [
          styles.primario,
          { backgroundColor: theme.colors.buttonPrimary, borderColor: theme.colors.buttonPrimary },
        ],
        variant === 'secundario' && [
          styles.secundario,
          {
            backgroundColor: theme.colors.buttonSecondaryBg,
            borderColor: theme.colors.buttonSecondaryBorder,
          },
        ],
        variant === 'peligro' && [
          styles.peligro,
          { backgroundColor: theme.colors.error, borderColor: theme.colors.error },
        ],
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secundario' ? theme.colors.buttonSecondaryText : '#ffffff'} />
      ) : (
        <Text
          style={[
            styles.texto,
            variant === 'secundario' && { color: theme.colors.buttonSecondaryText },
          ]}
        >
          {texto}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderWidth: 1,
  },
  primario: {
    shadowColor: '#0f766e',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  secundario: {},
  peligro: {
    shadowColor: '#dc2626',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  texto: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
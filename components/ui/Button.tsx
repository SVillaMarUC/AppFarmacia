import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

type ButtonProps = {
  texto: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primario' | 'secundario' | 'peligro';
  disabled?: boolean;
};

export const Button = ({ texto, onPress, loading, variant = 'primario', disabled }: ButtonProps) => {
  const { theme } = useTheme();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        variant === 'primario' && [styles.primario, { backgroundColor: theme.buttonPrimary, borderColor: theme.buttonPrimary }],
        variant === 'secundario' && [styles.secundario, { backgroundColor: theme.buttonSecondaryBg, borderColor: theme.buttonSecondaryBorder }],
        variant === 'peligro' && styles.peligro,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={[styles.texto, variant === 'secundario' && styles.textoSecundario, variant === 'secundario' && { color: theme.buttonSecondaryText }]}>{texto}</Text>}
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
    backgroundColor: '#0f766e',
    borderColor: '#0f766e',
    shadowColor: '#0f766e',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  secundario: {
    backgroundColor: '#ffffff',
    borderColor: '#dbe4ee',
  },
  peligro: {
    backgroundColor: '#b91c1c',
    borderColor: '#b91c1c',
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
  textoSecundario: {
    color: '#0f172a',
  },
});
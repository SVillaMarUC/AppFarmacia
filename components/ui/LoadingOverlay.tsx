import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

export const LoadingOverlay = ({ texto = 'Cargando...' }: { texto?: string }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.loadingBg }]}> 
      <View
        style={[
          styles.pulse,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
      <Text style={[styles.texto, { color: theme.colors.loadingText }]}>{texto}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  pulse: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  texto: {
    fontSize: 15,
    fontWeight: '600',
  },
});
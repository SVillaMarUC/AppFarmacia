import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

export const LoadingOverlay = ({ texto = 'Cargando...' }: { texto?: string }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.loadingBg }]}> 
      <View style={styles.pulse}>
        <ActivityIndicator size="large" color="#0f766e" />
      </View>
      <Text style={[styles.texto, { color: theme.loadingText }]}>{texto}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#eef4f8',
  },
  pulse: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe4ee',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  texto: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '600',
  },
});
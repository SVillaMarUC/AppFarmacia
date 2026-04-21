import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/hooks/useAuth';

export default function PerfilDespachadorScreen() {
  const { perfil, logout } = useAuth();
  const { mode, cycleMode } = useTheme();

  const nombreModo = mode === 'system' ? 'Sistema' : mode === 'light' ? 'Claro' : 'Oscuro';

  const onSalir = async () => {
    try {
      await logout();
    } catch (error) {
      Alert.alert('Error', 'No se pudo cerrar sesión.');
    }
  };

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>Mi cuenta</Text>
          <Text style={styles.titulo}>Perfil de despachador</Text>
          <Text style={styles.subtitulo}>Revisa tu información y controla la sesión desde esta pestaña.</Text>
        </View>

        <Card>
          <View style={styles.cardContent}>
            <Text style={styles.linea}>Nombre: {perfil?.nombre}</Text>
            <Text style={styles.linea}>Cédula: {perfil?.cedula}</Text>
            <Text style={styles.linea}>Rol: {perfil?.rol}</Text>
            <Text style={styles.linea}>EPS: {perfil?.eps}</Text>
          </View>
        </Card>

        <Button texto={`Tema: ${nombreModo}`} onPress={() => void cycleMode()} variant="secundario" />
        <Button texto="Cerrar sesión" onPress={onSalir} variant="peligro" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 14,
  },
  hero: {
    gap: 6,
  },
  kicker: {
    color: '#0f766e',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    fontSize: 12,
  },
  titulo: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.4,
  },
  subtitulo: {
    color: '#334155',
    lineHeight: 20,
  },
  cardContent: {
    gap: 10,
  },
  linea: {
    color: '#334155',
    fontWeight: '600',
  },
});

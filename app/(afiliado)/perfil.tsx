import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ThemeSelector } from '@/components/ui/ThemeSelector';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/hooks/useAuth';

export default function PerfilScreen() {
  const { perfil, logout } = useAuth();
  const { theme } = useTheme();

  const onSalir = async () => {
    try {
      await logout();
    } catch (error) {
      Alert.alert('Error', 'No se pudo cerrar sesión.');
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          kicker="Mi cuenta"
          title="Perfil de afiliado"
          subtitle="Tus datos se muestran en una tarjeta limpia y fácil de revisar."
        />

        <Card>
          <View style={styles.cardContent}>
            <Text style={[styles.linea, { color: theme.colors.text }]}>
              Nombre: <Text style={{ color: theme.colors.textSecondary }}>{perfil?.nombre}</Text>
            </Text>
            <Text style={[styles.linea, { color: theme.colors.text }]}>
              Cédula: <Text style={{ color: theme.colors.textSecondary }}>{perfil?.cedula}</Text>
            </Text>
            <Text style={[styles.linea, { color: theme.colors.text }]}>
              EPS: <Text style={{ color: theme.colors.textSecondary }}>{perfil?.eps}</Text>
            </Text>
            <Text style={[styles.linea, { color: theme.colors.text }]}>
              Teléfono: <Text style={{ color: theme.colors.textSecondary }}>{perfil?.telefono}</Text>
            </Text>
          </View>
        </Card>

        <ThemeSelector />

        <Button texto="Cerrar sesión" onPress={onSalir} variant="peligro" />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 14,
    paddingBottom: 32,
  },
  cardContent: {
    gap: 10,
  },
  linea: {
    fontWeight: '700',
    fontSize: 14,
  },
});
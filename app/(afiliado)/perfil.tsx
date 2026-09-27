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
          title="Perfil de Afiliado"
          subtitle="Consulta tu información personal, direcciones registradas y preferencias de tema."
        />

        {/* Datos Personales */}
        <Card>
          <View style={styles.cardContent}>
            <Text style={[styles.seccionTitulo, { color: theme.colors.text }]}>Datos Personales</Text>
            <Text style={[styles.linea, { color: theme.colors.text }]}>
              Nombre: <Text style={{ color: theme.colors.textSecondary, fontWeight: 'normal' }}>{perfil?.nombre || 'No registrado'}</Text>
            </Text>
            <Text style={[styles.linea, { color: theme.colors.text }]}>
              Cédula: <Text style={{ color: theme.colors.textSecondary, fontWeight: 'normal' }}>{perfil?.cedula || 'No registrada'}</Text>
            </Text>
            <Text style={[styles.linea, { color: theme.colors.text }]}>
              Correo: <Text style={{ color: theme.colors.textSecondary, fontWeight: 'normal' }}>{perfil?.email || 'No registrado'}</Text>
            </Text>
            <Text style={[styles.linea, { color: theme.colors.text }]}>
              EPS: <Text style={{ color: theme.colors.textSecondary, fontWeight: 'normal' }}>{perfil?.eps || 'No asignada'}</Text>
            </Text>
            <Text style={[styles.linea, { color: theme.colors.text }]}>
              Teléfono: <Text style={{ color: theme.colors.textSecondary, fontWeight: 'normal' }}>{perfil?.telefono || 'No registrado'}</Text>
            </Text>
            <Text style={[styles.linea, { color: theme.colors.text }]}>
              Ciudad: <Text style={{ color: theme.colors.textSecondary, fontWeight: 'normal' }}>{perfil?.ciudad || 'No registrada'}</Text>
            </Text>
          </View>
        </Card>

        {/* Direcciones Registradas */}
        <Card>
          <View style={styles.cardContent}>
            <Text style={[styles.seccionTitulo, { color: theme.colors.text }]}>Direcciones de Entrega</Text>
            {perfil?.direcciones && perfil.direcciones.length > 0 ? (
              perfil.direcciones.map((dir, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.direccionItem,
                    {
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.surfaceSecondary,
                    },
                  ]}
                >
                  <Text style={[styles.dirEtiqueta, { color: theme.colors.primary }]}>
                    📍 {dir.etiqueta || `Dirección ${idx + 1}`}
                  </Text>
                  <Text style={[styles.dirTexto, { color: theme.colors.text }]}>{dir.direccion}</Text>
                  <Text style={[styles.dirCiudad, { color: theme.colors.textSecondary }]}>{dir.ciudad}</Text>
                </View>
              ))
            ) : (
              <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
                No tienes direcciones registradas actualmente.
              </Text>
            )}
          </View>
        </Card>

        {/* Contacto de Emergencia */}
        {perfil?.contactoEmergencia && (
          <Card>
            <View style={styles.cardContent}>
              <Text style={[styles.seccionTitulo, { color: theme.colors.text }]}>Contacto de Emergencia</Text>
              <Text style={[styles.linea, { color: theme.colors.text }]}>
                Nombre: <Text style={{ color: theme.colors.textSecondary, fontWeight: 'normal' }}>{perfil.contactoEmergencia.nombre}</Text>
              </Text>
              <Text style={[styles.linea, { color: theme.colors.text }]}>
                Parentesco: <Text style={{ color: theme.colors.textSecondary, fontWeight: 'normal' }}>{perfil.contactoEmergencia.parentesco}</Text>
              </Text>
              <Text style={[styles.linea, { color: theme.colors.text }]}>
                Teléfono: <Text style={{ color: theme.colors.textSecondary, fontWeight: 'normal' }}>{perfil.contactoEmergencia.telefono}</Text>
              </Text>
            </View>
          </Card>
        )}

        {/* Selector de Tema */}
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
    paddingBottom: 36,
  },
  cardContent: {
    gap: 10,
  },
  seccionTitulo: {
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4,
  },
  linea: {
    fontWeight: '700',
    fontSize: 14,
  },
  direccionItem: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 3,
  },
  dirEtiqueta: {
    fontSize: 13,
    fontWeight: '700',
  },
  dirTexto: {
    fontSize: 14,
  },
  dirCiudad: {
    fontSize: 12,
  },
});
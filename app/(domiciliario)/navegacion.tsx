import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';

export default function NavegacionScreen() {
  return (
    <Screen>
      <View style={styles.container}>
        <Card>
          <View style={styles.content}>
            <Text style={styles.kicker}>Ruta en curso</Text>
            <Text style={styles.titulo}>Navegación activa</Text>
            <Text style={styles.texto}>Usa la pantalla de pedidos asignados para abrir Google Maps y enviar ubicación periódica.</Text>
          </View>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    gap: 8,
  },
  kicker: {
    color: '#0f766e',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    fontSize: 12,
  },
  titulo: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  texto: {
    color: '#334155',
    lineHeight: 20,
  },
});
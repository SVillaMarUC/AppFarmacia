import { StyleSheet, Text, View } from 'react-native';

const coloresEstado: Record<string, string> = {
  pendiente: '#f59e0b',
  en_preparacion: '#3b82f6',
  listo: '#10b981',
  en_camino: '#0ea5e9',
  entregado: '#22c55e',
};

export const EstadoPedidoBadge = ({ estado }: { estado: string }) => {
  const color = coloresEstado[estado] ?? '#64748b';
  return (
    <View style={[styles.badge, { backgroundColor: color }]}> 
      <Text style={styles.texto}>{estado.replace('_', ' ')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: 'flex-start',
    shadowColor: '#0f172a',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  texto: {
    color: '#ffffff',
    fontWeight: '700',
    textTransform: 'capitalize',
    fontSize: 12,
    letterSpacing: 0.2,
  },
});
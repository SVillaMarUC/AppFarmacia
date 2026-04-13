import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { Pedido } from '@/types';

type Props = {
  pedido: Pedido;
  onIniciarNavegacion: () => void;
  onConfirmarEntrega: () => void;
};

export const PedidoCard = ({ pedido, onIniciarNavegacion, onConfirmarEntrega }: Props) => {
  return (
    <Card>
      <View style={styles.header}>
        <Text style={styles.title}>Pedido {pedido.id.slice(0, 6).toUpperCase()}</Text>
        <Text style={styles.tag}>{pedido.modoEntrega}</Text>
      </View>
      <Text style={styles.linea}>Estado: {pedido.estado.replace('_', ' ')}</Text>
      <View style={styles.actions}>
        <Button texto="Iniciar navegación" onPress={onIniciarNavegacion} />
        <Button texto="Confirmar entrega" onPress={onConfirmarEntrega} variant="secundario" />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  tag: {
    color: '#0f766e',
    backgroundColor: '#d9f4ef',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  linea: {
    color: '#334155',
    marginTop: 6,
  },
  actions: {
    gap: 8,
    marginTop: 10,
  },
});
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  stock: number;
  stockMinimo: number;
};

export const StockIndicator = ({ stock, stockMinimo }: Props) => {
  const color = stock <= Math.max(1, Math.floor(stockMinimo * 0.5)) ? '#dc2626' : stock <= stockMinimo ? '#ca8a04' : '#16a34a';
  const etiqueta = color === '#dc2626' ? 'Crítico' : color === '#ca8a04' ? 'Bajo' : 'OK';

  return (
    <View style={[styles.container, { backgroundColor: color }]}> 
      <Text style={styles.texto}>{etiqueta}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 12,
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
    fontSize: 12,
    letterSpacing: 0.2,
  },
});
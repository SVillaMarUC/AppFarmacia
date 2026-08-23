import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

type Props = {
  stock: number;
  stockMinimo: number;
};

export const StockIndicator = ({ stock, stockMinimo }: Props) => {
  const { theme } = useTheme();

  const isCritico = stock <= Math.max(1, Math.floor(stockMinimo * 0.5));
  const isBajo = !isCritico && stock <= stockMinimo;

  const bg = isCritico ? theme.colors.errorBg : isBajo ? theme.colors.warningBg : theme.colors.successBg;
  const textColor = isCritico ? theme.colors.errorText : isBajo ? theme.colors.warningText : theme.colors.successText;
  const borderColor = isCritico ? theme.colors.error : isBajo ? theme.colors.warning : theme.colors.success;
  const etiqueta = isCritico ? 'Crítico' : isBajo ? 'Bajo' : 'OK';

  return (
    <View style={[styles.container, { backgroundColor: bg, borderColor }]}> 
      <Text style={[styles.texto, { color: textColor }]}>{etiqueta}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  texto: {
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.2,
  },
});
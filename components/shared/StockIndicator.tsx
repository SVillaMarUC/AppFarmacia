import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

type Props = {
  stock: number;
  stockMinimo: number;
  tipo?: 'stock' | 'vencimiento';
  vencimientoEstado?: 'vigente' | 'proximo_a_vencer' | 'vencido' | 'sin_fecha';
  diasRestantes?: number;
};

export const StockIndicator = ({
  stock,
  stockMinimo,
  tipo = 'stock',
  vencimientoEstado,
  diasRestantes,
}: Props) => {
  const { theme } = useTheme();

  if (tipo === 'vencimiento') {
    if (!vencimientoEstado || vencimientoEstado === 'sin_fecha') {
      return null;
    }

    const isVencido = vencimientoEstado === 'vencido';
    const isProximo = vencimientoEstado === 'proximo_a_vencer';

    const bg = isVencido ? theme.colors.errorBg : isProximo ? theme.colors.warningBg : theme.colors.successBg;
    const textColor = isVencido ? theme.colors.errorText : isProximo ? theme.colors.warningText : theme.colors.successText;
    const borderColor = isVencido ? theme.colors.error : isProximo ? theme.colors.warning : theme.colors.success;
    const etiqueta = isVencido
      ? 'Vencido'
      : isProximo
      ? `Vence en ${diasRestantes}d`
      : 'Vigente';

    return (
      <View style={[styles.container, { backgroundColor: bg, borderColor }]}>
        <Text style={[styles.texto, { color: textColor }]}>{etiqueta}</Text>
      </View>
    );
  }

  const isCritico = stock <= 0 || stock <= Math.max(1, Math.floor(stockMinimo * 0.5));
  const isBajo = !isCritico && stock <= stockMinimo;

  const bg = isCritico ? theme.colors.errorBg : isBajo ? theme.colors.warningBg : theme.colors.successBg;
  const textColor = isCritico ? theme.colors.errorText : isBajo ? theme.colors.warningText : theme.colors.successText;
  const borderColor = isCritico ? theme.colors.error : isBajo ? theme.colors.warning : theme.colors.success;
  const etiqueta = stock <= 0 ? 'Agotado' : isCritico ? 'Crítico' : isBajo ? 'Bajo' : 'OK';

  return (
    <View style={[styles.container, { backgroundColor: bg, borderColor }]}>
      <Text style={[styles.texto, { color: textColor }]}>{etiqueta}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  texto: {
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.2,
  },
});
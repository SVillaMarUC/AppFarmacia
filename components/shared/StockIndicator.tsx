import { StyleSheet, Text, View } from 'react-native';
import type { Timestamp } from 'firebase/firestore';
import { useTheme } from '@/context/ThemeContext';
import { medicationService } from '@/services/medication.service';

type Props = {
  stock: number;
  stockMinimo: number;
  tipo?: 'stock' | 'vencimiento';
  vencimientoEstado?: 'vigente' | 'proximo_a_vencer' | 'vencido' | 'sin_fecha';
  diasRestantes?: number;
  fechaVencimiento?: Timestamp | Date | string | null;
};

export const StockIndicator = ({
  stock,
  stockMinimo,
  tipo = 'stock',
  vencimientoEstado,
  diasRestantes,
  fechaVencimiento,
}: Props) => {
  const { theme } = useTheme();

  // Si se pasa fechaVencimiento directamente y tipo es vencimiento o general
  let finalVencimientoEstado = vencimientoEstado;
  let finalDiasRestantes = diasRestantes;

  if (fechaVencimiento && (!finalVencimientoEstado || finalVencimientoEstado === 'sin_fecha')) {
    const ev = medicationService.evaluarVencimiento(fechaVencimiento);
    finalVencimientoEstado = ev.estado;
    finalDiasRestantes = ev.diasRestantes;
  }

  if (tipo === 'vencimiento') {
    if (!finalVencimientoEstado || finalVencimientoEstado === 'sin_fecha') {
      return null;
    }

    const isVencido = finalVencimientoEstado === 'vencido';
    const isProximo = finalVencimientoEstado === 'proximo_a_vencer';

    const bg = isVencido ? theme.colors.errorBg : isProximo ? theme.colors.warningBg : theme.colors.successBg;
    const textColor = isVencido ? theme.colors.errorText : isProximo ? theme.colors.warningText : theme.colors.successText;
    const borderColor = isVencido ? theme.colors.error : isProximo ? theme.colors.warning : theme.colors.success;
    const etiqueta = isVencido
      ? 'Vencido'
      : isProximo
      ? `Vence en ${finalDiasRestantes}d`
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
  const etiqueta = stock <= 0 ? 'Agotado' : isCritico ? `Crítico (${stock})` : isBajo ? `Bajo (${stock})` : `Stock: ${stock}`;

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
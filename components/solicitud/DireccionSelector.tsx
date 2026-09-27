import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/context/ThemeContext';
import type { Direccion } from '@/types';

interface DireccionSelectorProps {
  modoEntrega: 'domicilio' | 'recogida';
  setModoEntrega: (modo: 'domicilio' | 'recogida') => void;
  direcciones: Direccion[];
  indiceDireccion: number;
  setIndiceDireccion: (index: number) => void;
}

export function DireccionSelector({
  modoEntrega,
  setModoEntrega,
  direcciones,
  indiceDireccion,
  setIndiceDireccion,
}: DireccionSelectorProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Card>
        <View style={styles.block}>
          <Text style={[styles.titulo, { color: theme.colors.text }]}>Método de Entrega</Text>

          <View style={styles.modoRow}>
            <Pressable
              style={[
                styles.modoBtn,
                {
                  backgroundColor:
                    modoEntrega === 'domicilio' ? theme.colors.primaryLight : theme.colors.surfaceSecondary,
                  borderColor:
                    modoEntrega === 'domicilio' ? theme.colors.primary : theme.colors.border,
                },
              ]}
              onPress={() => setModoEntrega('domicilio')}
            >
              <Ionicons
                name="bicycle-outline"
                size={24}
                color={modoEntrega === 'domicilio' ? theme.colors.primary : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.modoText,
                  { color: modoEntrega === 'domicilio' ? theme.colors.primary : theme.colors.text },
                ]}
              >
                Entrega a Domicilio
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.modoBtn,
                {
                  backgroundColor:
                    modoEntrega === 'recogida' ? theme.colors.primaryLight : theme.colors.surfaceSecondary,
                  borderColor:
                    modoEntrega === 'recogida' ? theme.colors.primary : theme.colors.border,
                },
              ]}
              onPress={() => setModoEntrega('recogida')}
            >
              <Ionicons
                name="storefront-outline"
                size={24}
                color={modoEntrega === 'recogida' ? theme.colors.primary : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.modoText,
                  { color: modoEntrega === 'recogida' ? theme.colors.primary : theme.colors.text },
                ]}
              >
                Recogida en Farmacia
              </Text>
            </Pressable>
          </View>
        </View>
      </Card>

      {modoEntrega === 'domicilio' && (
        <Card>
          <View style={styles.block}>
            <Text style={[styles.titulo, { color: theme.colors.text }]}>Dirección de Entrega</Text>

            {direcciones && direcciones.length > 0 ? (
              <View style={styles.direccionesList}>
                {direcciones.map((dir, idx) => {
                  const seleccionada = indiceDireccion === idx;
                  return (
                    <Pressable
                      key={`${dir.direccion}-${idx}`}
                      style={[
                        styles.dirCard,
                        {
                          backgroundColor: seleccionada
                            ? theme.colors.primaryLight
                            : theme.colors.surfaceSecondary,
                          borderColor: seleccionada
                            ? theme.colors.primary
                            : theme.colors.border,
                        },
                      ]}
                      onPress={() => setIndiceDireccion(idx)}
                    >
                      <Ionicons
                        name={seleccionada ? 'radio-button-on' : 'radio-button-off'}
                        size={20}
                        color={seleccionada ? theme.colors.primary : theme.colors.textSecondary}
                      />
                      <View style={styles.dirInfo}>
                        <Text
                          style={[
                            styles.dirEtiqueta,
                            {
                              color: seleccionada ? theme.colors.primary : theme.colors.text,
                              fontWeight: seleccionada ? '700' : '600',
                            },
                          ]}
                        >
                          {dir.etiqueta || `Dirección #${idx + 1}`}
                        </Text>
                        <Text style={[styles.dirDetalle, { color: theme.colors.textSecondary }]}>
                          {dir.direccion} • {dir.ciudad || 'Principal'}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View
                style={[
                  styles.noDirBox,
                  {
                    backgroundColor: theme.colors.surfaceSecondary,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Ionicons name="location-outline" size={24} color={theme.colors.textSecondary} />
                <Text style={{ color: theme.colors.textSecondary, fontSize: 13, textAlign: 'center' }}>
                  No tienes direcciones registradas en tu perfil. Se usará la sede principal de EPS.
                </Text>
              </View>
            )}
          </View>
        </Card>
      )}

      {modoEntrega === 'recogida' && (
        <Card>
          <View style={styles.block}>
            <Text style={[styles.titulo, { color: theme.colors.text }]}>Punto de Recogida</Text>
            <View
              style={[
                styles.recogidaInfo,
                {
                  backgroundColor: theme.colors.surfaceSecondary,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Ionicons name="business" size={24} color={theme.colors.primary} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.sedeNombre, { color: theme.colors.text }]}>
                  Farmacia Central EPS FarmaYa
                </Text>
                <Text style={[styles.sedeDir, { color: theme.colors.textSecondary }]}>
                  Carrera 7 # 32-16, Torre Médica Piso 1
                </Text>
                <Text style={[styles.sedeHorario, { color: theme.colors.primary }]}>
                  Lunes a Sábado: 7:00 AM - 7:00 PM
                </Text>
              </View>
            </View>
          </View>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  block: { gap: 10 },
  titulo: { fontSize: 16, fontWeight: '700' },
  modoRow: { flexDirection: 'row', gap: 10 },
  modoBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modoText: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  direccionesList: { gap: 8 },
  dirCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  dirInfo: { flex: 1, gap: 2 },
  dirEtiqueta: { fontSize: 14 },
  dirDetalle: { fontSize: 12 },
  noDirBox: { padding: 16, borderRadius: 10, borderWidth: 1, alignItems: 'center', gap: 6 },
  recogidaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  sedeNombre: { fontSize: 14, fontWeight: '700' },
  sedeDir: { fontSize: 12 },
  sedeHorario: { fontSize: 12, fontWeight: '600' },
});

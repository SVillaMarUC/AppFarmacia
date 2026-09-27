import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/context/ThemeContext';
import type { Direccion, Medicamento, Usuario } from '@/types';

interface ResumenSolicitudProps {
  perfil: Usuario | null;
  medicamentos: Medicamento[];
  modoEntrega: 'domicilio' | 'recogida';
  direccionSeleccionada?: Direccion;
  imagenUri: string | null;
  requiereReceta: boolean;
}

export function ResumenSolicitud({
  perfil,
  medicamentos,
  modoEntrega,
  direccionSeleccionada,
  imagenUri,
  requiereReceta,
}: ResumenSolicitudProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {/* Datos del Paciente */}
      <Card>
        <View style={styles.block}>
          <Text style={[styles.titulo, { color: theme.colors.text }]}>Paciente Afiliado</Text>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Nombre:</Text>
            <Text style={[styles.val, { color: theme.colors.text }]}>{perfil?.nombre || 'Afiliado'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Cédula:</Text>
            <Text style={[styles.val, { color: theme.colors.text }]}>{perfil?.cedula}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>EPS:</Text>
            <Text style={[styles.val, { color: theme.colors.text }]}>{perfil?.eps || 'FarmaYa EPS'}</Text>
          </View>
        </View>
      </Card>

      {/* Lista de Medicamentos */}
      <Card>
        <View style={styles.block}>
          <Text style={[styles.titulo, { color: theme.colors.text }]}>
            Medicamentos Solicitados ({medicamentos.length})
          </Text>
          <View style={styles.list}>
            {medicamentos.map((m, idx) => (
              <View key={`${m.nombre}-${idx}`} style={styles.medItem}>
                <Text style={[styles.medNombre, { color: theme.colors.text }]}>
                  • {m.nombre} (x{m.cantidad})
                </Text>
                {m.dosis ? (
                  <Text style={[styles.medDosis, { color: theme.colors.textSecondary }]}>
                    {m.dosis}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      </Card>

      {/* Entrega */}
      <Card>
        <View style={styles.block}>
          <Text style={[styles.titulo, { color: theme.colors.text }]}>Modalidad de Entrega</Text>
          <Text style={[styles.modoLabel, { color: theme.colors.primary }]}>
            {modoEntrega === 'domicilio' ? '🛵 Entrega a Domicilio' : '🏥 Recogida en Sede Farmacia'}
          </Text>
          {modoEntrega === 'domicilio' && direccionSeleccionada && (
            <Text style={[styles.dirText, { color: theme.colors.textSecondary }]}>
              Destino: {direccionSeleccionada.direccion} ({direccionSeleccionada.etiqueta || 'Principal'})
            </Text>
          )}
        </View>
      </Card>

      {/* Estado de Fórmula Médica */}
      <Card>
        <View style={styles.block}>
          <Text style={[styles.titulo, { color: theme.colors.text }]}>Fórmula Médica Adjunta</Text>
          {imagenUri ? (
            <View style={styles.recetaBox}>
              <Image source={{ uri: imagenUri }} style={styles.recetaImg} />
              <View style={styles.recetaStatusRow}>
                <Ionicons name="shield-checkmark" size={18} color={theme.colors.successText} />
                <Text style={[styles.recetaStatusText, { color: theme.colors.successText }]}>
                  Receta lista para validación del farmacéutico
                </Text>
              </View>
            </View>
          ) : requiereReceta ? (
            <View
              style={[
                styles.alertaBox,
                { backgroundColor: theme.colors.errorBg, borderColor: theme.colors.error },
              ]}
            >
              <Ionicons name="alert-circle" size={18} color={theme.colors.error} />
              <Text style={[styles.alertaText, { color: theme.colors.errorText }]}>
                Uno o más medicamentos requieren fórmula médica obligatoria.
              </Text>
            </View>
          ) : (
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
              No se requiere receta médica para esta solicitud.
            </Text>
          )}
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  block: { gap: 8 },
  titulo: { fontSize: 15, fontWeight: '700' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 13 },
  val: { fontSize: 13, fontWeight: '700' },
  list: { gap: 6, marginTop: 4 },
  medItem: { gap: 2 },
  medNombre: { fontSize: 13, fontWeight: '600' },
  medDosis: { fontSize: 12, paddingLeft: 12 },
  modoLabel: { fontSize: 14, fontWeight: '700' },
  dirText: { fontSize: 13 },
  recetaBox: { gap: 8, alignItems: 'center' },
  recetaImg: { width: '100%', height: 140, borderRadius: 8, resizeMode: 'cover' },
  recetaStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recetaStatusText: { fontSize: 12, fontWeight: '700' },
  alertaBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, borderWidth: 1 },
  alertaText: { fontSize: 12, fontWeight: '600', flex: 1 },
});

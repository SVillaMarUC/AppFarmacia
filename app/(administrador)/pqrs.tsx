import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { firestoreService } from '@/services/firebase/firestore.service';
import type { Pqrs } from '@/types';

type FiltroPqrs = 'todos' | 'pendiente' | 'en_revision' | 'resuelto';

export default function PqrsScreen() {
  const router = useRouter();
  const { perfil } = useAuth();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Pqrs[]>([]);
  const [filtro, setFiltro] = useState<FiltroPqrs>('todos');
  const [ticketSeleccionado, setTicketSeleccionado] = useState<Pqrs | null>(null);
  const [respuesta, setRespuesta] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const unsub = firestoreService.escucharPqrs((data) => {
      setTickets(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const ticketsFiltrados = useMemo(() => {
    if (filtro === 'todos') return tickets;
    return tickets.filter((t) => t.estado === filtro);
  }, [tickets, filtro]);

  const conteos = useMemo(() => {
    return {
      todos: tickets.length,
      pendiente: tickets.filter((t) => t.estado === 'pendiente').length,
      en_revision: tickets.filter((t) => t.estado === 'en_revision').length,
      resuelto: tickets.filter((t) => t.estado === 'resuelto').length,
    };
  }, [tickets]);

  const abrirRespuesta = (t: Pqrs) => {
    setTicketSeleccionado(t);
    setRespuesta(t.respuesta || '');
  };

  const enviarRespuesta = async () => {
    if (!ticketSeleccionado?.id) return;
    if (!respuesta.trim()) {
      Alert.alert('Respuesta requerida', 'Ingresa una respuesta o resolución formal para el usuario.');
      return;
    }

    try {
      setGuardando(true);
      await firestoreService.responderPqrs(
        ticketSeleccionado.id,
        respuesta.trim(),
        perfil?.nombre || 'Administrador FarmaYa',
        'resuelto'
      );
      Alert.alert('PQRS Resuelto', 'Se ha registrado la respuesta y notificado al afiliado.');
      setTicketSeleccionado(null);
    } catch (error) {
      Alert.alert('Error', 'No se pudo registrar la respuesta.');
    } finally {
      setGuardando(false);
    }
  };

  const getTipoStyle = (tipo: string) => {
    switch (tipo) {
      case 'reclamo':
        return { bg: '#fee2e2', text: '#b91c1c' };
      case 'queja':
        return { bg: '#ffedd5', text: '#c2410c' };
      case 'sugerencia':
        return { bg: '#eff6ff', text: '#1d4ed8' };
      default:
        return { bg: '#f3e8ff', text: '#7e22ce' };
    }
  };

  const getEstadoStyle = (estado: string) => {
    switch (estado) {
      case 'resuelto':
        return { bg: '#dcfce7', text: '#15803d', label: 'Resuelto ✓' };
      case 'en_revision':
        return { bg: '#eff6ff', text: '#2563eb', label: 'En Revisión ⏱' };
      default:
        return { bg: '#fef3c7', text: '#b45309', label: 'Pendiente ●' };
    }
  };

  const renderItem = ({ item }: { item: Pqrs }) => {
    const tipoStyle = getTipoStyle(item.tipo);
    const estadoStyle = getEstadoStyle(item.estado);

    return (
      <Card>
        <TouchableOpacity activeOpacity={0.8} onPress={() => abrirRespuesta(item)} style={styles.cardItem}>
          <View style={styles.cardHeader}>
            <View style={[styles.tipoBadge, { backgroundColor: tipoStyle.bg }]}>
              <Text style={[styles.tipoTag, { color: tipoStyle.text }]}>
                {item.tipo.toUpperCase()}
              </Text>
            </View>

            <View style={[styles.chip, { backgroundColor: estadoStyle.bg }]}>
              <Text style={[styles.chipText, { color: estadoStyle.text }]}>
                {estadoStyle.label}
              </Text>
            </View>
          </View>

          <Text style={[styles.asunto, { color: theme.colors.text }]}>{item.asunto}</Text>
          <Text style={[styles.descripcion, { color: theme.colors.textSecondary }]} numberOfLines={2}>
            {item.descripcion}
          </Text>

          {item.respuesta ? (
            <View style={[styles.respBox, { backgroundColor: theme.colors.surfaceSecondary }]}>
              <Ionicons name="checkmark-done" size={14} color={theme.colors.successText} />
              <Text style={[styles.respuestaPreview, { color: theme.colors.successText }]} numberOfLines={1}>
                {item.respuesta}
              </Text>
            </View>
          ) : (
            <View style={styles.sinRespRow}>
              <Ionicons name="time-outline" size={14} color="#d97706" />
              <Text style={[styles.sinResponder, { color: '#d97706' }]}>
                Toca para responder y resolver solicitud
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </Card>
    );
  };

  return (
    <Screen>
      <View style={styles.container}>
        <ScreenHeader
          kicker="Atención al Afiliado"
          title="Gestión de PQRS"
          subtitle="Responde peticiones, quejas, reclamos y sugerencias de los usuarios."
        />

        <Button texto="← Volver al Dashboard" onPress={() => router.back()} variant="secundario" />

        {/* Filtros con Contadores */}
        <View style={styles.filtrosGrid}>
          {[
            { id: 'todos', label: 'Todos', count: conteos.todos, icon: 'grid-outline' },
            { id: 'pendiente', label: 'Pendientes', count: conteos.pendiente, icon: 'time-outline' },
            { id: 'en_revision', label: 'En Revisión', count: conteos.en_revision, icon: 'eye-outline' },
            { id: 'resuelto', label: 'Resueltos', count: conteos.resuelto, icon: 'checkmark-circle-outline' },
          ].map((f) => {
            const activo = filtro === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                onPress={() => setFiltro(f.id as FiltroPqrs)}
                style={[
                  styles.filtroTile,
                  {
                    backgroundColor: activo ? theme.colors.primary : theme.colors.surface,
                    borderColor: activo ? theme.colors.primary : theme.colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={f.icon as any}
                  size={18}
                  color={activo ? '#ffffff' : theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.filtroTileLabel,
                    { color: activo ? '#ffffff' : theme.colors.text },
                  ]}
                  numberOfLines={1}
                >
                  {f.label}
                </Text>
                <Text
                  style={[
                    styles.filtroTileCount,
                    { color: activo ? 'rgba(255,255,255,0.8)' : theme.colors.textSecondary },
                  ]}
                >
                  {f.count}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={ticketsFiltrados}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <Card>
                <View style={styles.emptyWrap}>
                  <Ionicons name="chatbubble-ellipses-outline" size={44} color={theme.colors.textSecondary} />
                  <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>
                    No hay solicitudes PQRS en esta categoría.
                  </Text>
                </View>
              </Card>
            }
          />
        )}

        {/* Modal de Detalle y Respuesta */}
        <Modal
          visible={Boolean(ticketSeleccionado)}
          transparent
          animationType="fade"
          onRequestClose={() => setTicketSeleccionado(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.modalHeaderRow}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  {ticketSeleccionado?.tipo.toUpperCase()}: {ticketSeleccionado?.asunto}
                </Text>
                <TouchableOpacity onPress={() => setTicketSeleccionado(null)}>
                  <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.modalSub, { color: theme.colors.textSecondary }]}>
                Afiliado ID: {ticketSeleccionado?.usuarioId}
              </Text>

              <View style={[styles.descBox, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border }]}>
                <Text style={[styles.modalDesc, { color: theme.colors.text }]}>
                  "{ticketSeleccionado?.descripcion}"
                </Text>
              </View>

              <Text style={[styles.labelRespuesta, { color: theme.colors.text }]}>Respuesta o resolución oficial:</Text>
              <TextInput
                style={[
                  styles.inputRespuesta,
                  {
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                    backgroundColor: theme.colors.surfaceSecondary,
                  },
                ]}
                placeholder="Escribe la respuesta formal para el usuario..."
                placeholderTextColor={theme.colors.textSecondary}
                value={respuesta}
                onChangeText={setRespuesta}
                multiline
                numberOfLines={4}
              />

              <View style={styles.modalAcciones}>
                <Button texto="Enviar Respuesta" onPress={enviarRespuesta} loading={guardando} />
                <Button texto="Cancelar" onPress={() => setTicketSeleccionado(null)} variant="secundario" />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  filtrosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filtroTile: {
    width: '48%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  filtroTileLabel: { fontSize: 12, fontWeight: '700' },
  filtroTileCount: { fontSize: 18, fontWeight: '800' },
  list: { gap: 10, paddingBottom: 24 },
  cardItem: { gap: 6 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tipoBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  tipoTag: { fontSize: 11, fontWeight: '800' },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  chipText: { fontSize: 11, fontWeight: '700' },
  asunto: { fontSize: 15, fontWeight: '700' },
  descripcion: { fontSize: 13, lineHeight: 18 },
  respBox: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 6, borderRadius: 6, marginTop: 2 },
  respuestaPreview: { fontSize: 12, fontWeight: '600', flex: 1 },
  sinRespRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  sinResponder: { fontSize: 12, fontWeight: '600' },
  emptyWrap: { padding: 24, alignItems: 'center', gap: 8 },
  empty: { textAlign: 'center', fontSize: 13 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 },
  modalCard: { borderRadius: 16, borderWidth: 1, padding: 18, gap: 10, maxHeight: '85%' },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '800', flex: 1 },
  modalSub: { fontSize: 12 },
  descBox: { padding: 10, borderRadius: 8, borderWidth: 1 },
  modalDesc: { fontSize: 13, lineHeight: 18, fontStyle: 'italic' },
  labelRespuesta: { fontSize: 13, fontWeight: '700' },
  inputRespuesta: { borderWidth: 1, borderRadius: 8, padding: 10, minHeight: 90, textAlignVertical: 'top', fontSize: 13 },
  modalAcciones: { gap: 8, marginTop: 4 },
});

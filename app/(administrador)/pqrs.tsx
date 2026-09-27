import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
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

  const abrirRespuesta = (t: Pqrs) => {
    setTicketSeleccionado(t);
    setRespuesta(t.respuesta || '');
  };

  const enviarRespuesta = async () => {
    if (!ticketSeleccionado?.id) return;
    if (!respuesta.trim()) {
      Alert.alert('Respuesta requerida', 'Ingresa una respuesta o resolución para el usuario.');
      return;
    }

    try {
      setGuardando(true);
      await firestoreService.responderPqrs(
        ticketSeleccionado.id,
        respuesta.trim(),
        perfil?.nombre || 'Administrador',
        'resuelto'
      );
      Alert.alert('PQRS Resuelto', 'Se ha registrado la respuesta y notificado la resolución.');
      setTicketSeleccionado(null);
    } catch (error) {
      Alert.alert('Error', 'No se pudo registrar la respuesta.');
    } finally {
      setGuardando(false);
    }
  };

  const renderItem = ({ item }: { item: Pqrs }) => {
    const chipBg =
      item.estado === 'pendiente'
        ? '#fef3c7'
        : item.estado === 'en_revision'
        ? '#eff6ff'
        : '#dcfce7';

    const chipColor =
      item.estado === 'pendiente'
        ? '#d97706'
        : item.estado === 'en_revision'
        ? '#2563eb'
        : '#16a34a';

    return (
      <Card>
        <TouchableOpacity activeOpacity={0.8} onPress={() => abrirRespuesta(item)} style={styles.cardItem}>
          <View style={styles.cardHeader}>
            <Text style={[styles.tipoTag, { color: theme.colors.primary }]}>
              {item.tipo.toUpperCase()}
            </Text>
            <View style={[styles.chip, { backgroundColor: chipBg }]}>
              <Text style={[styles.chipText, { color: chipColor }]}>{item.estado.replace('_', ' ')}</Text>
            </View>
          </View>

          <Text style={[styles.asunto, { color: theme.colors.text }]}>{item.asunto}</Text>
          <Text style={[styles.descripcion, { color: theme.colors.textSecondary }]} numberOfLines={2}>
            {item.descripcion}
          </Text>

          {item.respuesta ? (
            <Text style={[styles.respuestaPreview, { color: theme.colors.successText }]}>
              ✓ Respondido: {item.respuesta}
            </Text>
          ) : (
            <Text style={[styles.sinResponder, { color: '#d97706' }]}>
              ● Pendiente de respuesta
            </Text>
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

        {/* Filtros */}
        <View style={styles.filtrosRow}>
          {(['todos', 'pendiente', 'en_revision', 'resuelto'] as FiltroPqrs[]).map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFiltro(f)}
              style={[
                styles.filtroBtn,
                filtro === f && { backgroundColor: theme.colors.primary },
                filtro !== f && { borderColor: theme.colors.border, borderWidth: 1 },
              ]}
            >
              <Text
                style={[
                  styles.filtroText,
                  { color: filtro === f ? '#ffffff' : theme.colors.textSecondary },
                ]}
              >
                {f.charAt(0).toUpperCase() + f.slice(1).replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
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
                <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>
                  No hay solicitudes PQRS en esta categoría.
                </Text>
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
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {ticketSeleccionado?.tipo.toUpperCase()}: {ticketSeleccionado?.asunto}
              </Text>

              <Text style={[styles.modalSub, { color: theme.colors.textSecondary }]}>
                Usuario ID: {ticketSeleccionado?.usuarioId}
              </Text>

              <Text style={[styles.modalDesc, { color: theme.colors.text }]}>
                {ticketSeleccionado?.descripcion}
              </Text>

              <Text style={[styles.labelRespuesta, { color: theme.colors.text }]}>Respuesta oficial:</Text>
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
                <Button texto="Cerrar" onPress={() => setTicketSeleccionado(null)} variant="secundario" />
                <Button texto="Enviar Respuesta" onPress={enviarRespuesta} loading={guardando} />
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
  filtrosRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  filtroBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  filtroText: { fontSize: 12, fontWeight: '700' },
  list: { gap: 10, paddingBottom: 24 },
  cardItem: { gap: 6 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tipoTag: { fontSize: 12, fontWeight: '800' },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  chipText: { fontSize: 11, fontWeight: '700' },
  asunto: { fontSize: 15, fontWeight: '700' },
  descripcion: { fontSize: 13, lineHeight: 18 },
  respuestaPreview: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  sinResponder: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  empty: { textAlign: 'center', paddingVertical: 20, fontSize: 14 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  modalTitle: { fontSize: 17, fontWeight: '800' },
  modalSub: { fontSize: 12 },
  modalDesc: { fontSize: 14, lineHeight: 20, marginVertical: 4 },
  labelRespuesta: { fontSize: 13, fontWeight: '700', marginTop: 6 },
  inputRespuesta: { borderWidth: 1, borderRadius: 8, padding: 10, minHeight: 80, textAlignVertical: 'top' },
  modalAcciones: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 8 },
});

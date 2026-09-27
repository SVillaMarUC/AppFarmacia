import { useEffect, useState } from 'react';
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
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/services/firebase/config';
import { firestoreService } from '@/services/firebase/firestore.service';
import type { Pqrs, TipoPqrs } from '@/types';

export default function PqrsAfiliadoScreen() {
  const router = useRouter();
  const { perfil } = useAuth();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Pqrs[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [tipo, setTipo] = useState<TipoPqrs>('peticion');
  const [asunto, setAsunto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!perfil?.uid) return;

    const q = query(collection(db, 'pqrs'), where('usuarioId', '==', perfil.uid));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        setTickets(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Pqrs, 'id'>) })));
        setLoading(false);
      },
      (err) => {
        console.error('Error al escuchar PQRS del usuario:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [perfil?.uid]);

  const handleCrear = async () => {
    if (!perfil?.uid) return;
    if (!asunto.trim() || !descripcion.trim()) {
      Alert.alert('Campos requeridos', 'Por favor completa el asunto y la descripción detallada.');
      return;
    }

    try {
      setGuardando(true);
      await firestoreService.crearPqrs({
        usuarioId: perfil.uid,
        usuarioNombre: perfil.nombre,
        usuarioEmail: perfil.email,
        tipo,
        asunto: asunto.trim(),
        descripcion: descripcion.trim(),
      });

      setModalVisible(false);
      setAsunto('');
      setDescripcion('');
      Alert.alert('Solicitud Registrada', 'Tu solicitud PQRS ha sido recibida y será atendida por nuestro equipo.');
    } catch (error) {
      Alert.alert('Error', 'No fue posible registrar la solicitud.');
    } finally {
      setGuardando(false);
    }
  };

  const renderItem = ({ item }: { item: Pqrs }) => {
    return (
      <Card>
        <View style={styles.ticketItem}>
          <View style={styles.headerRow}>
            <Text style={[styles.tipoTag, { color: theme.colors.primary }]}>
              {item.tipo.toUpperCase()}
            </Text>
            <View
              style={[
                styles.badgeEstado,
                {
                  backgroundColor:
                    item.estado === 'resuelto'
                      ? theme.colors.successBg
                      : theme.colors.warningBg,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  {
                    color:
                      item.estado === 'resuelto'
                        ? theme.colors.successText
                        : theme.colors.warningText,
                  },
                ]}
              >
                {item.estado.replace('_', ' ')}
              </Text>
            </View>
          </View>

          <Text style={[styles.asunto, { color: theme.colors.text }]}>{item.asunto}</Text>
          <Text style={[styles.desc, { color: theme.colors.textSecondary }]}>{item.descripcion}</Text>

          {item.respuesta ? (
            <View
              style={[
                styles.respuestaBox,
                {
                  backgroundColor: theme.colors.surfaceSecondary,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text style={[styles.respLabel, { color: theme.colors.primary }]}>
                Respuesta oficial de {item.respondidoPor || 'Atención al Usuario'}:
              </Text>
              <Text style={[styles.respTexto, { color: theme.colors.text }]}>{item.respuesta}</Text>
            </View>
          ) : (
            <Text style={[styles.pendienteText, { color: theme.colors.textMuted }]}>
              En proceso de revisión por el equipo administrativo.
            </Text>
          )}
        </View>
      </Card>
    );
  };

  return (
    <Screen>
      <View style={styles.container}>
        <ScreenHeader
          kicker="Atención y Soporte"
          title="Tus Solicitudes PQRS"
          subtitle="Radica peticiones, quejas, reclamos o sugerencias y consulta las respuestas oficiales."
        />

        <View style={styles.accionesRow}>
          <Button texto="← Volver" onPress={() => router.back()} variant="secundario" />
          <Button texto="+ Radicar PQRS" onPress={() => setModalVisible(true)} />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={tickets}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <Card>
                <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>
                  No has radicado solicitudes PQRS aún.
                </Text>
              </Card>
            }
          />
        )}

        {/* Modal para Crear PQRS */}
        <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Radicar Solicitud PQRS</Text>

              {/* Selector de Tipo */}
              <View style={styles.tiposGrid}>
                {(['peticion', 'queja', 'reclamo', 'sugerencia'] as TipoPqrs[]).map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setTipo(t)}
                    style={[
                      styles.tipoBtn,
                      tipo === t && { backgroundColor: theme.colors.primary },
                      tipo !== t && { borderColor: theme.colors.border, borderWidth: 1 },
                    ]}
                  >
                    <Text style={[styles.tipoBtnText, { color: tipo === t ? '#ffffff' : theme.colors.text }]}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={[
                  styles.input,
                  { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.surfaceSecondary },
                ]}
                placeholder="Asunto breve (ej: Demora en entrega de medicamento)"
                placeholderTextColor={theme.colors.textSecondary}
                value={asunto}
                onChangeText={setAsunto}
              />

              <TextInput
                style={[
                  styles.input,
                  styles.inputDesc,
                  { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.surfaceSecondary },
                ]}
                placeholder="Describe tu solicitud con todos los detalles relevantes..."
                placeholderTextColor={theme.colors.textSecondary}
                value={descripcion}
                onChangeText={setDescripcion}
                multiline
                numberOfLines={4}
              />

              <View style={styles.modalAcciones}>
                <Button texto="Cancelar" onPress={() => setModalVisible(false)} variant="secundario" />
                <Button texto="Radicar Solicitud" onPress={handleCrear} loading={guardando} />
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
  accionesRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  list: { gap: 10, paddingBottom: 24 },
  ticketItem: { gap: 6 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tipoTag: { fontSize: 12, fontWeight: '800' },
  badgeEstado: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  asunto: { fontSize: 15, fontWeight: '700' },
  desc: { fontSize: 13, lineHeight: 18 },
  respuestaBox: { padding: 10, borderRadius: 8, borderWidth: 1, gap: 4, marginTop: 4 },
  respLabel: { fontSize: 12, fontWeight: '700' },
  respTexto: { fontSize: 13 },
  pendienteText: { fontSize: 12, fontStyle: 'italic', marginTop: 2 },
  empty: { textAlign: 'center', paddingVertical: 20, fontSize: 14 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  tiposGrid: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tipoBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  tipoBtnText: { fontSize: 12, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14 },
  inputDesc: { minHeight: 80, textAlignVertical: 'top' },
  modalAcciones: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 8 },
});

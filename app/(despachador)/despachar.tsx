import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { db } from '@/services/firebase/config';
import { prescriptionService } from '@/services/prescription.service';
import { orderService } from '@/services/order.service';
import { notificationService } from '@/services/notification.service';
import type { Pedido, RecetaMedica, Usuario } from '@/types';

type DomiciliarioDisponible = Pick<Usuario, 'uid' | 'nombre' | 'cedula'> & { pedidosActivos: number };
type TabDespacho = 'pendientes' | 'preparacion' | 'listos';

export default function DespacharScreen() {
  const { theme } = useTheme();
  const [tab, setTab] = useState<TabDespacho>('pendientes');

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [domiciliariosRaw, setDomiciliariosRaw] = useState<Array<Pick<Usuario, 'uid' | 'nombre' | 'cedula'>>>([]);

  // Modal de Asignación
  const [modalAsignarVisible, setModalAsignarVisible] = useState(false);
  const [pedidoParaAsignar, setPedidoParaAsignar] = useState<Pedido | null>(null);
  const [seleccionadoUid, setSeleccionadoUid] = useState('');
  const [guardandoAsignacion, setGuardandoAsignacion] = useState(false);

  // Modal de Receta & OCR
  const [modalRecetaVisible, setModalRecetaVisible] = useState(false);
  const [recetaActiva, setRecetaActiva] = useState<RecetaMedica | null>(null);
  const [pedidoRecetaActivo, setPedidoRecetaActivo] = useState<Pedido | null>(null);
  const [cargandoReceta, setCargandoReceta] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [procesandoAccionReceta, setProcesandoAccionReceta] = useState(false);

  // Procesamiento de pedido
  const [procesandoPedidoId, setProcesandoPedidoId] = useState<string | null>(null);

  useEffect(() => {
    const qPedidos = query(
      collection(db, 'pedidos'),
      where('estado', 'in', ['pendiente', 'en_preparacion', 'listo'])
    );

    const unsubPedidos = onSnapshot(
      qPedidos,
      (snapshot) => {
        const lista = snapshot.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Pedido, 'id'>) } as Pedido))
          .sort((a, b) => {
            const timeA = a.timestampCreacion && 'toMillis' in a.timestampCreacion ? a.timestampCreacion.toMillis() : 0;
            const timeB = b.timestampCreacion && 'toMillis' in b.timestampCreacion ? b.timestampCreacion.toMillis() : 0;
            return timeA - timeB;
          });
        setPedidos(lista);
      },
      (err) => {
        console.error('Error pedidos:', err);
        Alert.alert('Error', 'No fue posible cargar pedidos.');
      }
    );

    const qDomiciliarios = query(
      collection(db, 'usuarios'),
      where('rol', '==', 'domiciliario'),
      where('disponible', '==', true)
    );

    const unsubDomiciliarios = onSnapshot(
      qDomiciliarios,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ ...(d.data() as Omit<Usuario, 'uid'>), uid: d.id }));
        setDomiciliariosRaw(
          data.map((item) => ({
            uid: item.uid,
            nombre: item.nombre,
            cedula: item.cedula,
          }))
        );
      },
      () => Alert.alert('Error', 'No fue posible cargar domiciliarios disponibles.')
    );

    return () => {
      unsubPedidos();
      unsubDomiciliarios();
    };
  }, []);

  const domiciliarios: DomiciliarioDisponible[] = useMemo(
    () =>
      domiciliariosRaw.map((item) => ({
        ...item,
        pedidosActivos: pedidos.filter(
          (p) => p.domiciliarioId === item.uid && (p.estado === 'asignado' || p.estado === 'en_camino')
        ).length,
      })),
    [domiciliariosRaw, pedidos]
  );

  const pedidosFiltrados = useMemo(() => {
    if (tab === 'pendientes') {
      return pedidos.filter((p) => p.estado === 'pendiente');
    }
    if (tab === 'preparacion') {
      return pedidos.filter((p) => p.estado === 'en_preparacion');
    }
    return pedidos.filter((p) => p.estado === 'listo');
  }, [pedidos, tab]);

  // Abrir visor de receta médica
  const abrirRevisionReceta = async (pedido: Pedido) => {
    if (!pedido.recetaId && !pedido.recetaUrl) {
      Alert.alert('Sin receta', 'Este pedido no tiene una receta médica asociada.');
      return;
    }

    setPedidoRecetaActivo(pedido);
    setRecetaActiva(null);
    setMotivoRechazo('');
    setModalRecetaVisible(true);
    setCargandoReceta(true);

    try {
      if (pedido.recetaId) {
        const r = await prescriptionService.obtenerReceta(pedido.recetaId);
        setRecetaActiva(r);
      } else if (pedido.recetaUrl) {
        // Fallback receta legacy con URL directa
        setRecetaActiva({
          id: 'legacy',
          usuarioId: pedido.usuarioId,
          storagePath: pedido.recetaUrl,
          urlTemporal: pedido.recetaUrl,
          estado: (pedido.recetaEstado as RecetaMedica['estado']) || 'pendiente',
          creadoEn: pedido.timestampCreacion,
          actualizadoEn: pedido.timestampCreacion,
        });
      }
    } catch (error) {
      Alert.alert('Error', 'No fue posible cargar la receta médica.');
    } finally {
      setCargandoReceta(false);
    }
  };

  const aprobarReceta = async () => {
    if (!recetaActiva || !pedidoRecetaActivo) return;
    try {
      setProcesandoAccionReceta(true);
      if (recetaActiva.id !== 'legacy') {
        await prescriptionService.actualizarEstadoReceta(recetaActiva.id, 'aprobada');
      }
      await updateDoc(doc(db, 'pedidos', pedidoRecetaActivo.id), {
        recetaEstado: 'aprobada',
      });
      setRecetaActiva({ ...recetaActiva, estado: 'aprobada' });
      void notificationService.enviarNotificacionLocal(
        'Fórmula Médica Aprobada ✅',
        `La receta del pedido #${pedidoRecetaActivo.id.slice(0, 6)} fue aprobada.`
      );
      Alert.alert('Receta Aprobada', 'La fórmula médica ha sido validada satisfactoriamente.');
    } catch (error) {
      Alert.alert('Error', 'No fue posible aprobar la receta.');
    } finally {
      setProcesandoAccionReceta(false);
    }
  };

  const rechazarReceta = async () => {
    if (!recetaActiva || !pedidoRecetaActivo) return;
    if (!motivoRechazo.trim()) {
      Alert.alert('Motivo requerido', 'Ingresa una observación o motivo de rechazo para el afiliado.');
      return;
    }

    try {
      setProcesandoAccionReceta(true);
      if (recetaActiva.id !== 'legacy') {
        await prescriptionService.actualizarEstadoReceta(recetaActiva.id, 'rechazada', {
          motivoRechazo: motivoRechazo.trim(),
        });
      }
      await updateDoc(doc(db, 'pedidos', pedidoRecetaActivo.id), {
        recetaEstado: 'rechazada',
        observacionesDespacho: `Receta rechazada: ${motivoRechazo.trim()}`,
      });
      setRecetaActiva({ ...recetaActiva, estado: 'rechazada', motivoRechazo: motivoRechazo.trim() });
      void notificationService.enviarNotificacionLocal(
        'Fórmula Médica Rechazada ⚠️',
        `Motivo: ${motivoRechazo.trim()}`
      );
      Alert.alert('Receta Rechazada', 'Se ha notificado el rechazo de la fórmula.');
    } catch (error) {
      Alert.alert('Error', 'No fue posible rechazar la receta.');
    } finally {
      setProcesandoAccionReceta(false);
    }
  };

  // Preparar pedido y descontar stock atómicamente
  const prepararYDescontarStock = async (pedido: Pedido) => {
    try {
      setProcesandoPedidoId(pedido.id);
      await orderService.procesarYPrepararPedido(pedido.id);
      Alert.alert('¡Pedido Listo!', 'El stock fue descontado y el pedido está listo para ser asignado.');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'No fue posible preparar el pedido.';
      Alert.alert('Validación de Despacho', msg);
    } finally {
      setProcesandoPedidoId(null);
    }
  };

  // Asignar pedido a Domiciliario
  const abrirAsignacion = (pedido: Pedido) => {
    setPedidoParaAsignar(pedido);
    setSeleccionadoUid('');
    setModalAsignarVisible(true);
  };

  const confirmarAsignacion = async () => {
    if (!pedidoParaAsignar?.id || !seleccionadoUid) {
      return;
    }

    try {
      setGuardandoAsignacion(true);
      await updateDoc(doc(db, 'pedidos', pedidoParaAsignar.id), {
        estado: 'asignado',
        domiciliarioId: seleccionadoUid,
        asignadoEn: serverTimestamp(),
      });
      setModalAsignarVisible(false);
      void notificationService.enviarNotificacionLocal(
        'Pedido Asignado a Domiciliario 🛵',
        `El pedido #${pedidoParaAsignar.id.slice(0, 6)} fue asignado para entrega.`
      );
      Alert.alert('Éxito', 'Pedido asignado al domiciliario correctamente.');
    } catch (error) {
      Alert.alert('Error', 'No fue posible asignar el pedido.');
    } finally {
      setGuardandoAsignacion(false);
    }
  };

  return (
    <Screen>
      <View style={styles.container}>
        <ScreenHeader
          kicker="Módulo Despachador"
          title="Gestión de Despacho"
          subtitle="Valida recetas médicas, prepara pedidos con descuento atómico de stock y asigna entregas."
        />

        {/* Pestañas de Estado */}
        <View style={styles.tabsRow}>
          {[
            { id: 'pendientes', label: 'Pendientes', icon: 'time-outline' },
            { id: 'listos', label: 'Listos para Envío', icon: 'checkmark-circle-outline' },
          ].map((t) => {
            const activo = tab === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.tabBtn,
                  {
                    backgroundColor: activo ? theme.colors.primary : theme.colors.surfaceSecondary,
                    borderColor: activo ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => setTab(t.id as TabDespacho)}
              >
                <Ionicons
                  name={t.icon as any}
                  size={16}
                  color={activo ? '#ffffff' : theme.colors.textSecondary}
                />
                <Text style={[styles.tabText, { color: activo ? '#ffffff' : theme.colors.textSecondary }]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView contentContainerStyle={styles.listContent}>
          {pedidosFiltrados.length === 0 ? (
            <Card>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No hay pedidos en la sección de {tab === 'pendientes' ? 'pendientes' : 'listos'}.
              </Text>
            </Card>
          ) : (
            pedidosFiltrados.map((pedido) => {
              const tieneReceta = Boolean(pedido.recetaId || pedido.recetaUrl);
              const requiereReceta = pedido.medicamentos.some((m) => m.requiereReceta);

              return (
                <Card key={pedido.id}>
                  <View style={styles.pedidoHeader}>
                    <View>
                      <Text style={[styles.pedidoId, { color: theme.colors.text }]}>
                        Pedido #{pedido.id.slice(0, 8).toUpperCase()}
                      </Text>
                      <Text style={[styles.pedidoModo, { color: theme.colors.textSecondary }]}>
                        Modo: {pedido.modoEntrega === 'domicilio' ? 'A Domicilio' : 'Recogida en Sede'}
                        {pedido.ciudad ? ` (${pedido.ciudad})` : ''}
                      </Text>
                    </View>

                    {/* Badge Estado Receta */}
                    {requiereReceta || tieneReceta ? (
                      <View
                        style={[
                          styles.badgeReceta,
                          {
                            backgroundColor:
                              pedido.recetaEstado === 'aprobada'
                                ? theme.colors.successBg
                                : pedido.recetaEstado === 'rechazada'
                                ? theme.colors.errorBg
                                : theme.colors.warningBg,
                            borderColor:
                              pedido.recetaEstado === 'aprobada'
                                ? theme.colors.success
                                : pedido.recetaEstado === 'rechazada'
                                ? theme.colors.error
                                : theme.colors.warning,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeRecetaText,
                            {
                              color:
                                pedido.recetaEstado === 'aprobada'
                                  ? theme.colors.successText
                                  : pedido.recetaEstado === 'rechazada'
                                  ? theme.colors.errorText
                                  : theme.colors.warningText,
                            },
                          ]}
                        >
                          Receta: {pedido.recetaEstado || 'Pendiente'}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Medicamentos en el pedido */}
                  <View style={styles.medsBox}>
                    <Text style={[styles.medsTitulo, { color: theme.colors.textSecondary }]}>
                      Medicamentos solicitados:
                    </Text>
                    {pedido.medicamentos.map((m, i) => (
                      <View key={i} style={styles.medRow}>
                        <Text style={[styles.medItemTexto, { color: theme.colors.text }]}>
                          • {m.nombre} {m.concentracion ? `(${m.concentracion})` : ''}
                        </Text>
                        <Text style={[styles.medItemCant, { color: theme.colors.textSecondary }]}>
                          x{m.cantidad} {m.requiereReceta ? '💊 Rx' : ''}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Botones de Acción según estado */}
                  <View style={styles.accionesRow}>
                    {tieneReceta ? (
                      <TouchableOpacity
                        style={[styles.btnSecundario, { borderColor: theme.colors.primary }]}
                        onPress={() => abrirRevisionReceta(pedido)}
                      >
                        <Ionicons name="document-text-outline" size={16} color={theme.colors.primary} />
                        <Text style={[styles.btnSecundarioTexto, { color: theme.colors.primary }]}>
                          Revisar Receta
                        </Text>
                      </TouchableOpacity>
                    ) : null}

                    {pedido.estado === 'pendiente' ? (
                      <View style={{ flex: 1 }}>
                        <Button
                          texto="Preparar y Descontar Stock"
                          loading={procesandoPedidoId === pedido.id}
                          onPress={() => prepararYDescontarStock(pedido)}
                        />
                      </View>
                    ) : pedido.estado === 'listo' && pedido.modoEntrega === 'domicilio' ? (
                      <View style={{ flex: 1 }}>
                        <Button texto="Asignar Domiciliario" onPress={() => abrirAsignacion(pedido)} />
                      </View>
                    ) : null}
                  </View>
                </Card>
              );
            })
          )}
        </ScrollView>

        {/* MODAL REVISIÓN DE RECETA MÉDICA & OCR */}
        <Modal visible={modalRecetaVisible} animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  Revisión de Fórmula Médica
                </Text>
                <TouchableOpacity onPress={() => setModalRecetaVisible(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalBody}>
                {cargandoReceta ? (
                  <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 24 }} />
                ) : recetaActiva?.urlTemporal ? (
                  <View style={styles.recetaPreviewWrap}>
                    <Image
                      source={{ uri: recetaActiva.urlTemporal }}
                      style={[styles.recetaImagen, { borderColor: theme.colors.border }]}
                      resizeMode="contain"
                    />

                    {/* Texto OCR Extraído */}
                    {recetaActiva.ocr?.textoCrudo ? (
                      <View
                        style={[
                          styles.ocrBox,
                          {
                            backgroundColor: theme.colors.surfaceSecondary,
                            borderColor: theme.colors.borderLight,
                          },
                        ]}
                      >
                        <Text style={[styles.ocrTitulo, { color: theme.colors.text }]}>
                          Texto Extraído por OCR:
                        </Text>
                        <Text style={[styles.ocrTexto, { color: theme.colors.textSecondary }]}>
                          {recetaActiva.ocr.textoCrudo}
                        </Text>
                      </View>
                    ) : null}

                    {/* Estado actual */}
                    <View style={styles.estadoRecetaRow}>
                      <Text style={[styles.medsTitulo, { color: theme.colors.textSecondary }]}>
                        Estado actual:{' '}
                        <Text style={{ fontWeight: '700', color: theme.colors.text }}>
                          {recetaActiva.estado.toUpperCase()}
                        </Text>
                      </Text>
                    </View>

                    {/* Input Motivo de Rechazo */}
                    <Input
                      label="Observación / Motivo de Rechazo (si aplica)"
                      value={motivoRechazo}
                      onChangeText={setMotivoRechazo}
                      placeholder="Ej: Fórmula vencida o ilegible..."
                    />

                    {/* Acciones de Validación */}
                    <View style={styles.recetaBotones}>
                      <View style={{ flex: 1 }}>
                        <Button
                          texto="Aprobar Receta"
                          loading={procesandoAccionReceta}
                          onPress={aprobarReceta}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Button
                          texto="Rechazar Receta"
                          variant="peligro"
                          loading={procesandoAccionReceta}
                          onPress={rechazarReceta}
                        />
                      </View>
                    </View>
                  </View>
                ) : (
                  <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                    No fue posible cargar la imagen de la receta.
                  </Text>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* MODAL ASIGNACIÓN DOMICILIARIO */}
        <Modal visible={modalAsignarVisible} animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  Asignar Domiciliario
                </Text>
                <TouchableOpacity onPress={() => setModalAsignarVisible(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalBody}>
                <Text style={[styles.medsTitulo, { color: theme.colors.textSecondary }]}>
                  Selecciona un domiciliario disponible en servicio:
                </Text>

                {domiciliarios.length === 0 ? (
                  <Text style={[styles.emptyText, { color: theme.colors.errorText }]}>
                    No hay domiciliarios disponibles en este momento.
                  </Text>
                ) : (
                  domiciliarios.map((dom) => {
                    const seleccionado = seleccionadoUid === dom.uid;
                    return (
                      <TouchableOpacity
                        key={dom.uid}
                        style={[
                          styles.domiciliarioCard,
                          {
                            backgroundColor: seleccionado
                              ? theme.colors.primaryLight
                              : theme.colors.surfaceSecondary,
                            borderColor: seleccionado ? theme.colors.primary : theme.colors.border,
                          },
                        ]}
                        onPress={() => setSeleccionadoUid(dom.uid)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.domNombre, { color: theme.colors.text }]}>
                            {dom.nombre}
                          </Text>
                          <Text style={[styles.domSub, { color: theme.colors.textSecondary }]}>
                            Cédula: {dom.cedula} · Pedidos activos: {dom.pedidosActivos}
                          </Text>
                        </View>
                        {seleccionado ? (
                          <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary} />
                        ) : null}
                      </TouchableOpacity>
                    );
                  })
                )}

                <View style={styles.modalBotones}>
                  <Button
                    texto="Confirmar Asignación"
                    disabled={!seleccionadoUid}
                    loading={guardandoAsignacion}
                    onPress={confirmarAsignacion}
                  />
                  <Button
                    texto="Cancelar"
                    variant="secundario"
                    onPress={() => setModalAsignarVisible(false)}
                  />
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: {
    gap: 12,
    paddingBottom: 24,
  },
  pedidoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pedidoId: {
    fontSize: 15,
    fontWeight: '700',
  },
  pedidoModo: {
    fontSize: 12,
    marginTop: 2,
  },
  badgeReceta: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeRecetaText: {
    fontSize: 11,
    fontWeight: '700',
  },
  medsBox: {
    marginVertical: 10,
    gap: 4,
  },
  medsTitulo: {
    fontSize: 12,
    fontWeight: '600',
  },
  medRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  medItemTexto: {
    fontSize: 13,
  },
  medItemCant: {
    fontSize: 12,
    fontWeight: '600',
  },
  accionesRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  btnSecundario: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  btnSecundarioTexto: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    padding: 16,
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    borderRadius: 16,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalBody: {
    padding: 16,
    gap: 12,
  },
  recetaPreviewWrap: {
    gap: 10,
  },
  recetaImagen: {
    width: '100%',
    height: 240,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: '#000',
  },
  ocrBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  ocrTitulo: {
    fontSize: 12,
    fontWeight: '700',
  },
  ocrTexto: {
    fontSize: 12,
    lineHeight: 16,
  },
  estadoRecetaRow: {
    paddingVertical: 4,
  },
  recetaBotones: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  domiciliarioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  domNombre: {
    fontSize: 14,
    fontWeight: '700',
  },
  domSub: {
    fontSize: 12,
  },
  modalBotones: {
    gap: 8,
    marginTop: 10,
  },
});

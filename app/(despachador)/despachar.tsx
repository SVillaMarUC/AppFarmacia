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
import { collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
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
type TabDespacho = 'por_preparar' | 'listos' | 'en_ruta';

export default function DespacharScreen() {
  const { theme } = useTheme();
  const [tab, setTab] = useState<TabDespacho>('por_preparar');
  const [busqueda, setBusqueda] = useState('');

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
      where('estado', 'in', ['pendiente', 'en_preparacion', 'listo', 'asignado', 'en_camino'])
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

  const conteos = useMemo(() => {
    const porPreparar = pedidos.filter((p) => p.estado === 'pendiente' || p.estado === 'en_preparacion').length;
    const listos = pedidos.filter((p) => p.estado === 'listo').length;
    const enRuta = pedidos.filter((p) => p.estado === 'asignado' || p.estado === 'en_camino').length;
    return { porPreparar, listos, enRuta };
  }, [pedidos]);

  const pedidosFiltrados = useMemo(() => {
    let result = pedidos;
    if (tab === 'por_preparar') {
      result = pedidos.filter((p) => p.estado === 'pendiente' || p.estado === 'en_preparacion');
    } else if (tab === 'listos') {
      result = pedidos.filter((p) => p.estado === 'listo');
    } else {
      result = pedidos.filter((p) => p.estado === 'asignado' || p.estado === 'en_camino');
    }

    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.id.toLowerCase().includes(q) ||
          p.usuarioId.toLowerCase().includes(q) ||
          p.medicamentos.some((m) => m.nombre.toLowerCase().includes(q)) ||
          (p.ciudad && p.ciudad.toLowerCase().includes(q))
      );
    }

    return result;
  }, [pedidos, tab, busqueda]);

  // Abrir visor de receta médica
  const abrirRevisionReceta = async (pedido: Pedido) => {
    if (!pedido.recetaId && !pedido.recetaUrl) {
      Alert.alert('Sin receta', 'Este pedido no tiene una receta médica adjunta.');
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
      Alert.alert('Receta Aprobada', 'La fórmula médica ha sido validada. Ahora puedes preparar el pedido.');
      setModalRecetaVisible(false);
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
      Alert.alert('Receta Rechazada', 'Se ha notificado el motivo del rechazo al afiliado.');
      setModalRecetaVisible(false);
    } catch (error) {
      Alert.alert('Error', 'No fue posible rechazar la receta.');
    } finally {
      setProcesandoAccionReceta(false);
    }
  };

  // Preparar pedido y descontar stock atómicamente
  const prepararYDescontarStock = async (pedido: Pedido) => {
    const requiereReceta = pedido.medicamentos.some((m) => m.requiereReceta);
    if (requiereReceta && pedido.recetaEstado !== 'aprobada') {
      Alert.alert(
        'Validación Requerida',
        'Este pedido incluye medicamentos bajo prescripción médica. Debes revisar y aprobar la fórmula antes de descontar stock.'
      );
      return;
    }

    try {
      setProcesandoPedidoId(pedido.id);
      await orderService.procesarYPrepararPedido(pedido.id);
      Alert.alert('¡Pedido Listo!', 'El stock fue descontado atómicamente y el pedido pasó a estado "Listo".');
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
        'Pedido Asignado 🛵',
        `El pedido #${pedidoParaAsignar.id.slice(0, 6)} fue asignado al domiciliario.`
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
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <ScreenHeader
          kicker="Módulo Despachador"
          title="Gestión de Despacho"
          subtitle="Flujo guiado en 3 pasos: valida recetas, descuenta stock atómicamente y asigna entregas."
        />

        {/* Banner Explicativo del Flujo de 3 Pasos */}
        <Card>
          <View style={styles.workflowCard}>
            <Text style={[styles.workflowTitle, { color: theme.colors.text }]}>
              Flujo Operativo de Despacho
            </Text>
            <View style={styles.workflowSteps}>
              <View style={[styles.workflowStep, { backgroundColor: theme.colors.surfaceSecondary }]}>
                <View style={[styles.stepNumberBadge, { backgroundColor: '#3b82f6' }]}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Text style={[styles.stepLabel, { color: theme.colors.text }]}>Validar Receta</Text>
                <Text style={[styles.stepSub, { color: theme.colors.textSecondary }]}>Revisa Rx médica</Text>
              </View>

              <Ionicons name="arrow-forward" size={16} color={theme.colors.textSecondary} style={{ alignSelf: 'center' }} />

              <View style={[styles.workflowStep, { backgroundColor: theme.colors.surfaceSecondary }]}>
                <View style={[styles.stepNumberBadge, { backgroundColor: '#0f766e' }]}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text style={[styles.stepLabel, { color: theme.colors.text }]}>Descontar Stock</Text>
                <Text style={[styles.stepSub, { color: theme.colors.textSecondary }]}>Empaca y descuenta</Text>
              </View>

              <Ionicons name="arrow-forward" size={16} color={theme.colors.textSecondary} style={{ alignSelf: 'center' }} />

              <View style={[styles.workflowStep, { backgroundColor: theme.colors.surfaceSecondary }]}>
                <View style={[styles.stepNumberBadge, { backgroundColor: '#16a34a' }]}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <Text style={[styles.stepLabel, { color: theme.colors.text }]}>Asignar Entrega</Text>
                <Text style={[styles.stepSub, { color: theme.colors.textSecondary }]}>Asigna domiciliario</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Buscador de Pedidos */}
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={theme.colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              },
            ]}
            placeholder="Buscar por ID, medicamento o afiliado..."
            placeholderTextColor={theme.colors.textSecondary}
            value={busqueda}
            onChangeText={setBusqueda}
          />
          {busqueda ? (
            <TouchableOpacity onPress={() => setBusqueda('')} style={styles.clearSearchBtn}>
              <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Pestañas con Contadores */}
        <View style={styles.tabsRow}>
          {[
            { id: 'por_preparar', label: 'Pendientes', count: conteos.porPreparar, icon: 'time-outline' },
            { id: 'listos', label: 'Listos', count: conteos.listos, icon: 'checkmark-done-outline' },
            { id: 'en_ruta', label: 'En Ruta', count: conteos.enRuta, icon: 'bicycle-outline' },
          ].map((t) => {
            const activo = tab === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.tabBtn,
                  {
                    backgroundColor: activo ? theme.colors.primary : theme.colors.surface,
                    borderColor: activo ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => setTab(t.id as TabDespacho)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={t.icon as any}
                  size={15}
                  color={activo ? '#ffffff' : theme.colors.textSecondary}
                />
                <Text style={[styles.tabText, { color: activo ? '#ffffff' : theme.colors.text }]} numberOfLines={1}>
                  {t.label}
                </Text>
                <View
                  style={[
                    styles.tabBadge,
                    {
                      backgroundColor: activo ? 'rgba(255,255,255,0.25)' : theme.colors.surfaceSecondary,
                    },
                  ]}
                >
                  <Text style={[styles.tabBadgeText, { color: activo ? '#ffffff' : theme.colors.textSecondary }]}>
                    {t.count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Lista de Pedidos */}
        <View style={styles.pedidosContainer}>
          {pedidosFiltrados.length === 0 ? (
            <Card>
              <View style={styles.emptyWrap}>
                <Ionicons name="file-tray-outline" size={44} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  No hay pedidos en la sección de {tab === 'por_preparar' ? 'Por Preparar' : tab === 'listos' ? 'Listos para Envío' : 'En Ruta'}.
                </Text>
              </View>
            </Card>
          ) : (
            pedidosFiltrados.map((pedido) => {
              const tieneReceta = Boolean(pedido.recetaId || pedido.recetaUrl);
              const requiereReceta = pedido.medicamentos.some((m) => m.requiereReceta);
              const recetaAprobada = pedido.recetaEstado === 'aprobada';
              const recetaRechazada = pedido.recetaEstado === 'rechazada';

              return (
                <Card key={pedido.id}>
                  <View style={styles.pedidoCardContent}>
                    {/* Encabezado del Pedido */}
                    <View style={styles.pedidoHeader}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.idRow}>
                          <Text style={[styles.pedidoId, { color: theme.colors.text }]}>
                            #{pedido.id.slice(0, 8).toUpperCase()}
                          </Text>
                          <View
                            style={[
                              styles.chipModo,
                              {
                                backgroundColor:
                                  pedido.modoEntrega === 'domicilio'
                                    ? theme.colors.primaryLight
                                    : theme.colors.surfaceSecondary,
                              },
                            ]}
                          >
                            <Ionicons
                              name={pedido.modoEntrega === 'domicilio' ? 'bicycle-outline' : 'business-outline'}
                              size={12}
                              color={pedido.modoEntrega === 'domicilio' ? theme.colors.primary : theme.colors.textSecondary}
                            />
                            <Text
                              style={[
                                styles.chipModoText,
                                {
                                  color:
                                    pedido.modoEntrega === 'domicilio'
                                      ? theme.colors.primary
                                      : theme.colors.textSecondary,
                                },
                              ]}
                            >
                              {pedido.modoEntrega === 'domicilio' ? 'A Domicilio' : 'Recogida en Sede'}
                            </Text>
                          </View>
                        </View>

                        <Text style={[styles.pedidoDireccion, { color: theme.colors.textSecondary }]}>
                          📍 {pedido.direccionEntrega?.direccion ?? 'Entrega en farmacia'}
                          {pedido.ciudad ? ` · ${pedido.ciudad}` : ''}
                        </Text>
                      </View>

                      {/* Badge Estado Receta */}
                      {requiereReceta || tieneReceta ? (
                        <View
                          style={[
                            styles.badgeReceta,
                            {
                              backgroundColor: recetaAprobada
                                ? '#dcfce7'
                                : recetaRechazada
                                ? '#fee2e2'
                                : '#fef3c7',
                              borderColor: recetaAprobada
                                ? '#16a34a'
                                : recetaRechazada
                                ? '#b91c1c'
                                : '#d97706',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgeRecetaText,
                              {
                                color: recetaAprobada
                                  ? '#15803d'
                                  : recetaRechazada
                                  ? '#b91c1c'
                                  : '#b45309',
                              },
                            ]}
                          >
                            {recetaAprobada ? 'Rx Aprobada ✓' : recetaRechazada ? 'Rx Rechazada ✕' : 'Rx Pendiente ⏱'}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Guía Visual del Estado Actual */}
                    <View
                      style={[
                        styles.guiaPasoBox,
                        {
                          backgroundColor:
                            pedido.estado === 'pendiente' && requiereReceta && !recetaAprobada
                              ? '#fffbeb'
                              : pedido.estado === 'pendiente'
                              ? '#eff6ff'
                              : pedido.estado === 'listo'
                              ? '#ecfdf5'
                              : theme.colors.surfaceSecondary,
                          borderColor:
                            pedido.estado === 'pendiente' && requiereReceta && !recetaAprobada
                              ? '#fde68a'
                              : pedido.estado === 'pendiente'
                              ? '#bfdbfe'
                              : pedido.estado === 'listo'
                              ? '#a7f3d0'
                              : theme.colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          pedido.estado === 'pendiente' && requiereReceta && !recetaAprobada
                            ? 'alert-circle'
                            : pedido.estado === 'pendiente'
                            ? 'cube-outline'
                            : pedido.estado === 'listo'
                            ? 'checkmark-circle'
                            : 'bicycle'
                        }
                        size={15}
                        color={
                          pedido.estado === 'pendiente' && requiereReceta && !recetaAprobada
                            ? '#b45309'
                            : pedido.estado === 'pendiente'
                            ? '#2563eb'
                            : pedido.estado === 'listo'
                            ? '#059669'
                            : theme.colors.primary
                        }
                      />
                      <Text
                        style={[
                          styles.guiaPasoTexto,
                          {
                            color:
                              pedido.estado === 'pendiente' && requiereReceta && !recetaAprobada
                                ? '#92400e'
                                : pedido.estado === 'pendiente'
                                ? '#1e40af'
                                : pedido.estado === 'listo'
                                ? '#065f46'
                                : theme.colors.text,
                          },
                        ]}
                        numberOfLines={3}
                      >
                        {pedido.estado === 'pendiente' && requiereReceta && !recetaAprobada
                          ? 'Paso 1: Revisa y valida la fórmula médica antes de empacar.'
                          : pedido.estado === 'pendiente'
                          ? 'Paso 2: Presiona "Preparar y Descontar Stock" para procesar inventario.'
                          : pedido.estado === 'listo' && pedido.modoEntrega === 'domicilio'
                          ? 'Paso 3: Stock descontado. Asigna un domiciliario para iniciar entrega.'
                          : pedido.estado === 'listo'
                          ? 'Paso 3: Stock descontado. Listo para entrega en ventanilla de farmacia.'
                          : `En camino con domiciliario (ID: ${pedido.domiciliarioId?.slice(0, 6) || 'Asignado'})`}
                      </Text>
                    </View>

                    {/* Medicamentos solicitados */}
                    <View style={styles.medsBox}>
                      <Text style={[styles.medsTitulo, { color: theme.colors.textSecondary }]}>
                        Medicamentos solicitados ({pedido.medicamentos.length}):
                      </Text>
                      {pedido.medicamentos.map((m, i) => (
                        <View key={i} style={[styles.medRow, { borderBottomColor: theme.colors.borderLight }]}>
                          <View style={styles.medInfo}>
                            <Text style={[styles.medNombre, { color: theme.colors.text }]}>
                              • {m.nombre}
                            </Text>
                            {m.concentracion ? (
                              <Text style={[styles.medConcentracion, { color: theme.colors.textSecondary }]}>
                                {m.concentracion}
                              </Text>
                            ) : null}
                          </View>

                          <View style={styles.medBadges}>
                            {m.requiereReceta && (
                              <View style={[styles.rxMiniBadge, { backgroundColor: '#fee2e2' }]}>
                                <Text style={styles.rxMiniText}>Rx</Text>
                              </View>
                            )}
                            <View style={[styles.cantBadge, { backgroundColor: theme.colors.surfaceSecondary }]}>
                              <Text style={[styles.cantText, { color: theme.colors.text }]}>
                                x{m.cantidad}
                              </Text>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>

                    {/* Acciones del Pedido */}
                    <View style={styles.accionesContainer}>
                      {tieneReceta ? (
                        <TouchableOpacity
                          style={[
                            styles.btnRevisionReceta,
                            {
                              backgroundColor: recetaAprobada ? '#f0fdf4' : '#f8fafc',
                              borderColor: recetaAprobada ? '#86efac' : theme.colors.border,
                            },
                          ]}
                          onPress={() => abrirRevisionReceta(pedido)}
                        >
                          <Ionicons
                            name="document-text"
                            size={16}
                            color={recetaAprobada ? '#16a34a' : theme.colors.primary}
                          />
                          <Text
                            style={[
                              styles.btnRevisionRecetaText,
                              { color: recetaAprobada ? '#15803d' : theme.colors.primary },
                            ]}
                          >
                            {recetaAprobada ? 'Ver Receta Aprobada' : 'Revisar Fórmula Médica'}
                          </Text>
                        </TouchableOpacity>
                      ) : null}

                      {pedido.estado === 'pendiente' ? (
                        <Button
                          texto="📦 Preparar y Descontar Stock"
                          loading={procesandoPedidoId === pedido.id}
                          onPress={() => prepararYDescontarStock(pedido)}
                        />
                      ) : pedido.estado === 'listo' && pedido.modoEntrega === 'domicilio' ? (
                        <Button
                          texto="🛵 Asignar Domiciliario"
                          onPress={() => abrirAsignacion(pedido)}
                        />
                      ) : null}
                    </View>
                  </View>
                </Card>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* MODAL REVISIÓN DE RECETA MÉDICA & OCR */}
      <Modal visible={modalRecetaVisible} animationType="slide" transparent onRequestClose={() => setModalRecetaVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  Validación de Fórmula Médica
                </Text>
                <Text style={[styles.modalSub, { color: theme.colors.textSecondary }]}>
                  Pedido #{pedidoRecetaActivo?.id.slice(0, 8)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalRecetaVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              {cargandoReceta ? (
                <View style={styles.modalLoadingBox}>
                  <ActivityIndicator color={theme.colors.primary} size="large" />
                  <Text style={{ color: theme.colors.textSecondary, marginTop: 8 }}>Cargando imagen de fórmula...</Text>
                </View>
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
                          borderColor: theme.colors.border,
                        },
                      ]}
                    >
                      <View style={styles.ocrHeader}>
                        <Ionicons name="scan-outline" size={16} color={theme.colors.primary} />
                        <Text style={[styles.ocrTitulo, { color: theme.colors.text }]}>
                          Texto Reconocido por OCR:
                        </Text>
                      </View>
                      <Text style={[styles.ocrTexto, { color: theme.colors.textSecondary }]}>
                        {recetaActiva.ocr.textoCrudo}
                      </Text>
                    </View>
                  ) : null}

                  {/* Motivo de rechazo si aplica */}
                  <Input
                    label="Motivo u Observación (requerido para rechazo)"
                    value={motivoRechazo}
                    onChangeText={setMotivoRechazo}
                    placeholder="Ej: Fórmula ilegible, fecha vencida o firma no visible..."
                  />

                  {/* Botones de Aprobación / Rechazo */}
                  <View style={styles.recetaBotones}>
                    <View style={{ flex: 1 }}>
                      <Button
                        texto="✓ Aprobar Receta"
                        loading={procesandoAccionReceta}
                        onPress={aprobarReceta}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button
                        texto="✕ Rechazar"
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
      <Modal visible={modalAsignarVisible} animationType="slide" transparent onRequestClose={() => setModalAsignarVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  Asignar Domiciliario
                </Text>
                <Text style={[styles.modalSub, { color: theme.colors.textSecondary }]}>
                  Pedido #{pedidoParaAsignar?.id.slice(0, 8)} · {pedidoParaAsignar?.direccionEntrega?.direccion || 'Domicilio'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalAsignarVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <Text style={[styles.domiciliariosTitulo, { color: theme.colors.text }]}>
                Selecciona un domiciliario disponible:
              </Text>

              {domiciliarios.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Ionicons name="alert-circle-outline" size={36} color={theme.colors.error} />
                  <Text style={[styles.emptyText, { color: theme.colors.errorText }]}>
                    No hay domiciliarios disponibles en este momento.
                  </Text>
                </View>
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
                      activeOpacity={0.8}
                    >
                      <View style={[styles.domAvatar, { backgroundColor: theme.colors.primary }]}>
                        <Ionicons name="person" size={18} color="#ffffff" />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[styles.domNombre, { color: theme.colors.text }]}>
                          {dom.nombre}
                        </Text>
                        <Text style={[styles.domSub, { color: theme.colors.textSecondary }]}>
                          C.C. {dom.cedula} · {dom.pedidosActivos} pedido(s) activo(s)
                        </Text>
                      </View>
                      {seleccionado ? (
                        <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary} />
                      ) : (
                        <Ionicons name="ellipse-outline" size={22} color={theme.colors.textSecondary} />
                      )}
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 36 },
  workflowCard: { gap: 10 },
  workflowTitle: { fontSize: 14, fontWeight: '700' },
  workflowSteps: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  workflowStep: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    gap: 2,
  },
  stepNumberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  stepNumberText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },
  stepLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  stepSub: { fontSize: 10, textAlign: 'center' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  searchIcon: { position: 'absolute', left: 12, zIndex: 2 },
  searchInput: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingLeft: 38,
    paddingRight: 36,
    fontSize: 13,
  },
  clearSearchBtn: { position: 'absolute', right: 12, zIndex: 2 },
  tabsRow: { flexDirection: 'row', gap: 8 },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  tabText: { fontSize: 11, fontWeight: '700', flexShrink: 1 },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tabBadgeText: { fontSize: 11, fontWeight: '700' },
  pedidosContainer: { gap: 12 },
  pedidoCardContent: { gap: 10 },
  pedidoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pedidoId: { fontSize: 16, fontWeight: '800' },
  chipModo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  chipModoText: { fontSize: 11, fontWeight: '600' },
  pedidoDireccion: { fontSize: 12, marginTop: 4 },
  badgeReceta: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeRecetaText: { fontSize: 11, fontWeight: '700' },
  guiaPasoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  guiaPasoTexto: { fontSize: 12, fontWeight: '600', flex: 1 },
  medsBox: { gap: 6 },
  medsTitulo: { fontSize: 12, fontWeight: '700' },
  medRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  medInfo: { flex: 1, gap: 1 },
  medNombre: { fontSize: 13, fontWeight: '600' },
  medConcentracion: { fontSize: 11 },
  medBadges: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rxMiniBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  rxMiniText: { color: '#b91c1c', fontSize: 10, fontWeight: '800' },
  cantBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  cantText: { fontSize: 12, fontWeight: '700' },
  accionesContainer: { gap: 8, marginTop: 4 },
  btnRevisionReceta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  btnRevisionRecetaText: { fontSize: 13, fontWeight: '700' },
  emptyWrap: { padding: 24, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 13, textAlign: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 },
  modalContent: { borderRadius: 16, maxHeight: '90%', borderWidth: 1, overflow: 'hidden' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#cbd5e1',
  },
  modalTitle: { fontSize: 16, fontWeight: '800' },
  modalSub: { fontSize: 12 },
  modalCloseBtn: { padding: 4 },
  modalBody: { padding: 16, gap: 12 },
  modalLoadingBox: { padding: 30, alignItems: 'center' },
  recetaPreviewWrap: { gap: 10 },
  recetaImagen: { width: '100%', height: 260, borderRadius: 10, borderWidth: 1, backgroundColor: '#0f172a' },
  ocrBox: { padding: 10, borderRadius: 8, borderWidth: 1, gap: 4 },
  ocrHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ocrTitulo: { fontSize: 12, fontWeight: '700' },
  ocrTexto: { fontSize: 12, lineHeight: 16 },
  recetaBotones: { flexDirection: 'row', gap: 8, marginTop: 6 },
  domiciliariosTitulo: { fontSize: 13, fontWeight: '700' },
  domiciliarioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  domAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  domNombre: { fontSize: 14, fontWeight: '700' },
  domSub: { fontSize: 12 },
  modalBotones: { gap: 8, marginTop: 10 },
});

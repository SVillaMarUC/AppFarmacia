import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { serverTimestamp, updateDoc, doc } from 'firebase/firestore';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { PlatformMap } from '@/components/shared/PlatformMap';

import { useTheme } from '@/context/ThemeContext';
import { usePedido } from '@/context/PedidoContext';
import { useAuth } from '@/hooks/useAuth';

import { db } from '@/services/firebase/config';
import { firestoreService } from '@/services/firebase/firestore.service';

import type {
  Checkpoint,
  EstadoCheckpoint,
  TipoCheckpoint,
} from '@/types';

type EstadoUbicacion = {
  latitud: number;
  longitud: number;
  precision: number;
};

type CheckpointConfig = {
  tipo: TipoCheckpoint;
  titulo: string;
  descripcion: string;
};

const CHECKPOINTS_CONFIG: CheckpointConfig[] = [
  {
    tipo: 'pedido_recibido',
    titulo: 'Pedido recibido',
    descripcion: 'Has recibido el pedido para realizar la entrega.',
  },
  {
    tipo: 'pedido_recogido',
    titulo: 'Pedido recogido',
    descripcion: 'El pedido fue recogido de la farmacia.',
  },
  {
    tipo: 'en_camino',
    titulo: 'En camino',
    descripcion: 'Te encuentras desplazándote hacia el destino.',
  },
  {
    tipo: 'cerca_destino',
    titulo: 'Cerca del destino',
    descripcion: 'Has llegado cerca de la ubicación del paciente.',
  },
  {
    tipo: 'pedido_entregado',
    titulo: 'Pedido entregado',
    descripcion: 'El pedido fue entregado correctamente.',
  },
];

const ESTADOS_COMPLETADOS: EstadoCheckpoint[] = [
  'completado',
];

export default function NavegacionScreen() {
  const { perfil } = useAuth();
  const { pedidoActivo } = usePedido();
  const { theme } = useTheme();

  const [ubicacion, setUbicacion] =
    useState<EstadoUbicacion | null>(null);

  const [cargandoUbicacion, setCargandoUbicacion] =
    useState(true);

  const [errorUbicacion, setErrorUbicacion] =
    useState<string | null>(null);

  const [checkpoints, setCheckpoints] =
    useState<Checkpoint[]>([]);

  const [procesandoCheckpoint, setProcesandoCheckpoint] =
    useState(false);

  const [observacion, setObservacion] =
    useState('');

  /**
   * -------------------------------------------------------
   * UBICACIÓN
   * -------------------------------------------------------
   */

  const obtenerUbicacion = useCallback(async () => {
    try {
      setCargandoUbicacion(true);
      setErrorUbicacion(null);

      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== Location.PermissionStatus.GRANTED) {
        setErrorUbicacion(
          'No se concedió permiso para acceder a la ubicación.'
        );
        setCargandoUbicacion(false);
        return;
      }

      const posicion =
        await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

      const nuevaUbicacion: EstadoUbicacion = {
        latitud: posicion.coords.latitude,
        longitud: posicion.coords.longitude,
        precision: posicion.coords.accuracy ?? 0,
      };

      setUbicacion(nuevaUbicacion);

      if (perfil?.uid) {
        await firestoreService.actualizarUbicacionDomiciliario(
          perfil.uid,
          nuevaUbicacion.latitud,
          nuevaUbicacion.longitud,
          nuevaUbicacion.precision,
          pedidoActivo?.id
        );
      }
    } catch (error) {
      console.error(
        '[Navegacion] Error obteniendo ubicación:',
        error
      );

      setErrorUbicacion(
        'No fue posible obtener tu ubicación actual.'
      );
    } finally {
      setCargandoUbicacion(false);
    }
  }, [perfil?.uid, pedidoActivo?.id]);

  useEffect(() => {
    void obtenerUbicacion();
  }, [obtenerUbicacion]);

  /**
   * Actualizar ubicación periódicamente mientras exista
   * un pedido activo.
   */
  useEffect(() => {
    if (!perfil?.uid || !pedidoActivo?.id) {
      return;
    }

    const intervalo = setInterval(() => {
      void obtenerUbicacion();
    }, 30000);

    return () => {
      clearInterval(intervalo);
    };
  }, [
    perfil?.uid,
    pedidoActivo?.id,
    obtenerUbicacion,
  ]);

  /**
   * -------------------------------------------------------
   * CHECKPOINTS FIRESTORE
   * -------------------------------------------------------
   */

  useEffect(() => {
    if (!pedidoActivo?.id) {
      setCheckpoints([]);
      return;
    }

    const unsubscribe =
      firestoreService.escucharCheckpoints(
        pedidoActivo.id,
        (datos) => {
          setCheckpoints(datos);
        }
      );

    return unsubscribe;
  }, [pedidoActivo?.id]);

  /**
   * -------------------------------------------------------
   * CHECKPOINT ACTUAL
   * -------------------------------------------------------
   */

  const checkpointsVisuales = useMemo(() => {
    return CHECKPOINTS_CONFIG.map(
      (config, index) => {
        const guardado = checkpoints.find(
          (item) => item.tipo === config.tipo
        );

        if (guardado) {
          return {
            ...config,
            checkpoint: guardado,
            estado: guardado.estado,
          };
        }

        return {
          ...config,
          checkpoint: null,
          estado:
            index === 0
              ? ('en_proceso' as EstadoCheckpoint)
              : ('pendiente' as EstadoCheckpoint),
        };
      }
    );
  }, [checkpoints]);

  const indiceCheckpointActual = useMemo(() => {
    const indiceCompletado = checkpointsVisuales.findIndex(
      (item) => item.estado !== 'completado'
    );

    if (indiceCompletado === -1) {
      return checkpointsVisuales.length - 1;
    }

    return indiceCompletado;
  }, [checkpointsVisuales]);

  const checkpointActual =
    checkpointsVisuales[indiceCheckpointActual];

  /**
   * -------------------------------------------------------
   * FUNCIONES AUXILIARES
   * -------------------------------------------------------
   */

  const obtenerNombreEstado = (
    estado: EstadoCheckpoint
  ) => {
    switch (estado) {
      case 'completado':
        return 'Completado';

      case 'en_proceso':
        return 'En proceso';

      case 'incidencia':
        return 'Incidencia';

      case 'pendiente':
      default:
        return 'Pendiente';
    }
  };

  const obtenerColorEstado = (
    estado: EstadoCheckpoint
  ) => {
    switch (estado) {
      case 'completado':
        return theme.colors.primary;

      case 'en_proceso':
        return theme.colors.primary;

      case 'incidencia':
        return theme.colors.error;

      case 'pendiente':
      default:
        return theme.colors.textMuted;
    }
  };

  const formatearFecha = (
    checkpoint: Checkpoint | null
  ) => {
    if (!checkpoint?.fechaHora) {
      return 'Pendiente';
    }

    try {
      return checkpoint.fechaHora
        .toDate()
        .toLocaleString('es-CO', {
          dateStyle: 'short',
          timeStyle: 'short',
        });
    } catch {
      return 'Fecha no disponible';
    }
  };

  /**
   * -------------------------------------------------------
   * COMPLETAR CHECKPOINT
   * -------------------------------------------------------
   */

  const completarCheckpoint = useCallback(async () => {
    if (!pedidoActivo?.id) {
      Alert.alert(
        'Sin pedido activo',
        'No tienes un pedido activo para actualizar.'
      );
      return;
    }

    if (!perfil?.uid) {
      Alert.alert(
        'Sesión no disponible',
        'No se pudo identificar al domiciliario.'
      );
      return;
    }

    if (!ubicacion) {
      Alert.alert(
        'Ubicación requerida',
        'Debes tener una ubicación GPS válida antes de completar el checkpoint.'
      );
      return;
    }

    if (!checkpointActual) {
      return;
    }

    if (
      checkpointActual.estado === 'completado'
    ) {
      return;
    }

    try {
      setProcesandoCheckpoint(true);

      await firestoreService.registrarCheckpoint(
        pedidoActivo.id,
        perfil.uid,
        {
          tipo: checkpointActual.tipo,
          nombre: checkpointActual.titulo,
          estado: 'completado',
          latitud: ubicacion.latitud,
          longitud: ubicacion.longitud,
          precisionGPS: ubicacion.precision,
          observacion:
            observacion.trim() || undefined,
        }
      );

      const siguienteIndice =
        indiceCheckpointActual + 1;

      if (
        siguienteIndice <
        CHECKPOINTS_CONFIG.length
      ) {
        const siguiente =
          CHECKPOINTS_CONFIG[siguienteIndice];

        await firestoreService.registrarCheckpoint(
          pedidoActivo.id,
          perfil.uid,
          {
            tipo: siguiente.tipo,
            nombre: siguiente.titulo,
            estado: 'en_proceso',
            latitud: ubicacion.latitud,
            longitud: ubicacion.longitud,
            precisionGPS: ubicacion.precision,
          }
        );
      } else {
        /**
         * Último checkpoint:
         * el pedido pasa a entregado.
         */
        await updateDoc(
          doc(db, 'pedidos', pedidoActivo.id),
          {
            estado: 'entregado',
            timestampEntrega: serverTimestamp(),
            ubicacionEntrega: {
              latitude: ubicacion.latitud,
              longitude: ubicacion.longitud,
            },
          }
        );

        Alert.alert(
          'Entrega completada',
          'El pedido fue marcado como entregado correctamente.'
        );
      }

      setObservacion('');
    } catch (error) {
      console.error(
        '[Navegacion] Error completando checkpoint:',
        error
      );

      Alert.alert(
        'Error',
        'No fue posible guardar el checkpoint. Intenta nuevamente.'
      );
    } finally {
      setProcesandoCheckpoint(false);
    }
  }, [
    pedidoActivo?.id,
    perfil?.uid,
    ubicacion,
    checkpointActual,
    indiceCheckpointActual,
    observacion,
  ]);

  /**
   * -------------------------------------------------------
   * REGISTRAR INCIDENCIA
   * -------------------------------------------------------
   */

  const registrarIncidencia = useCallback(async () => {
    if (!pedidoActivo?.id) {
      Alert.alert(
        'Sin pedido activo',
        'No tienes un pedido activo.'
      );
      return;
    }

    if (!perfil?.uid) {
      Alert.alert(
        'Sesión no disponible',
        'No se pudo identificar al domiciliario.'
      );
      return;
    }

    if (!checkpointActual) {
      return;
    }

    if (!ubicacion) {
      Alert.alert(
        'Ubicación requerida',
        'Debes tener una ubicación GPS válida para registrar la incidencia.'
      );
      return;
    }

    Alert.alert(
      'Registrar incidencia',
      '¿Deseas registrar una incidencia en este checkpoint?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Registrar',
          onPress: async () => {
            try {
              setProcesandoCheckpoint(true);

              await firestoreService.registrarCheckpoint(
                pedidoActivo.id,
                perfil.uid,
                {
                  tipo: checkpointActual.tipo,
                  nombre: checkpointActual.titulo,
                  estado: 'incidencia',
                  latitud: ubicacion.latitud,
                  longitud: ubicacion.longitud,
                  precisionGPS: ubicacion.precision,
                  observacion:
                    observacion.trim() ||
                    'Incidencia registrada durante la entrega.',
                }
              );

              Alert.alert(
                'Incidencia registrada',
                'La incidencia fue guardada correctamente.'
              );

              setObservacion('');
            } catch (error) {
              console.error(
                '[Navegacion] Error registrando incidencia:',
                error
              );

              Alert.alert(
                'Error',
                'No fue posible registrar la incidencia.'
              );
            } finally {
              setProcesandoCheckpoint(false);
            }
          },
        },
      ]
    );
  }, [
    pedidoActivo?.id,
    perfil?.uid,
    checkpointActual,
    ubicacion,
    observacion,
  ]);

  /**
   * -------------------------------------------------------
   * NAVEGAR A GOOGLE MAPS / MAPA EXTERNO
   * -------------------------------------------------------
   */

  const abrirNavegacion = async () => {
    const destino =
      pedidoActivo?.direccionEntrega;

    if (!destino) {
      Alert.alert(
        'Sin destino',
        'El pedido no tiene una dirección de entrega.'
      );
      return;
    }

    const url =
      `https://www.google.com/maps/dir/?api=1` +
      `&destination=${destino.latitud},${destino.longitud}` +
      `&travelmode=driving`;

    try {
      const disponible =
        await Linking.canOpenURL(url);

      if (!disponible) {
        Alert.alert(
          'No disponible',
          'No se pudo abrir la navegación.'
        );
        return;
      }

      await Linking.openURL(url);
    } catch (error) {
      console.error(
        '[Navegacion] Error abriendo mapas:',
        error
      );

      Alert.alert(
        'Error',
        'No se pudo abrir Google Maps.'
      );
    }
  };

  /**
   * -------------------------------------------------------
   * INFORMACIÓN DEL DESTINO
   * -------------------------------------------------------
   */

  const direccionDestino =
    pedidoActivo?.direccionEntrega?.direccion ??
    'Sin dirección registrada';

  const ciudadDestino =
    pedidoActivo?.direccionEntrega?.ciudad ??
    pedidoActivo?.ciudad ??
    'Sin ciudad';

  const latitudDestino =
    pedidoActivo?.direccionEntrega?.latitud;

  const longitudDestino =
    pedidoActivo?.direccionEntrega?.longitud;

  /**
   * -------------------------------------------------------
   * RENDER
   * -------------------------------------------------------
   */

  return (
    <Screen>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text
            style={[
              styles.kicker,
              { color: theme.colors.primary },
            ]}
          >
            MÓDULO DOMICILIARIO
          </Text>

          <Text
            style={[
              styles.title,
              { color: theme.colors.text },
            ]}
          >
            Navegación
          </Text>

          <Text
            style={[
              styles.subtitle,
              { color: theme.colors.textSecondary },
            ]}
          >
            Sigue los checkpoints de la entrega y registra
            tu ubicación en tiempo real.
          </Text>
        </View>

        {!pedidoActivo ? (
          <Card>
            <View style={styles.emptyContainer}>
              <Text
                style={[
                  styles.emptyTitle,
                  { color: theme.colors.text },
                ]}
              >
                No hay pedido activo
              </Text>

              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Cuando tengas un pedido en camino,
                aparecerá aquí toda la información de
                navegación y checkpoints.
              </Text>
            </View>
          </Card>
        ) : (
          <>
            {/* ------------------------------------------------ */}
            {/* INFORMACIÓN DEL PEDIDO */}
            {/* ------------------------------------------------ */}

            <Card>
              <View style={styles.section}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  Pedido activo
                </Text>

                <View style={styles.infoBlock}>
                  <Text
                    style={[
                      styles.label,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    ID del pedido
                  </Text>

                  <Text
                    style={[
                      styles.value,
                      { color: theme.colors.text },
                    ]}
                  >
                    {pedidoActivo.id}
                  </Text>
                </View>

                <View style={styles.infoBlock}>
                  <Text
                    style={[
                      styles.label,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    Dirección
                  </Text>

                  <Text
                    style={[
                      styles.value,
                      { color: theme.colors.text },
                    ]}
                  >
                    {direccionDestino}
                  </Text>
                </View>

                <View style={styles.infoBlock}>
                  <Text
                    style={[
                      styles.label,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    Ciudad
                  </Text>

                  <Text
                    style={[
                      styles.value,
                      { color: theme.colors.text },
                    ]}
                  >
                    {ciudadDestino}
                  </Text>
                </View>

                <Button
                  texto="Abrir navegación"
                  onPress={abrirNavegacion}
                />
              </View>
            </Card>

            {/* ------------------------------------------------ */}
            {/* UBICACIÓN */}
            {/* ------------------------------------------------ */}

            <Card>
              <View style={styles.section}>
                <View style={styles.titleRow}>
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: theme.colors.text },
                    ]}
                  >
                    Mi ubicación
                  </Text>

                  {cargandoUbicacion ? (
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.primary}
                    />
                  ) : null}
                </View>

                {errorUbicacion ? (
                  <Text
                    style={[
                      styles.errorText,
                      { color: theme.colors.error },
                    ]}
                  >
                    {errorUbicacion}
                  </Text>
                ) : null}

                {ubicacion ? (
                  <View style={styles.locationGrid}>
                    <View style={styles.locationItem}>
                      <Text
                        style={[
                          styles.label,
                          {
                            color:
                              theme.colors.textMuted,
                          },
                        ]}
                      >
                        Latitud
                      </Text>

                      <Text
                        style={[
                          styles.locationValue,
                          { color: theme.colors.text },
                        ]}
                      >
                        {ubicacion.latitud.toFixed(6)}
                      </Text>
                    </View>

                    <View style={styles.locationItem}>
                      <Text
                        style={[
                          styles.label,
                          {
                            color:
                              theme.colors.textMuted,
                          },
                        ]}
                      >
                        Longitud
                      </Text>

                      <Text
                        style={[
                          styles.locationValue,
                          { color: theme.colors.text },
                        ]}
                      >
                        {ubicacion.longitud.toFixed(6)}
                      </Text>
                    </View>

                    <View style={styles.locationItem}>
                      <Text
                        style={[
                          styles.label,
                          {
                            color:
                              theme.colors.textMuted,
                          },
                        ]}
                      >
                        Precisión GPS
                      </Text>

                      <Text
                        style={[
                          styles.locationValue,
                          { color: theme.colors.text },
                        ]}
                      >
                        ±
                        {Math.round(
                          ubicacion.precision
                        )}{' '}
                        m
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text
                    style={[
                      styles.infoText,
                      {
                        color:
                          theme.colors.textSecondary,
                      },
                    ]}
                  >
                    Esperando ubicación GPS...
                  </Text>
                )}
              </View>
            </Card>

            {/* ------------------------------------------------ */}
            {/* MAPA */}
            {/* ------------------------------------------------ */}

            <Card>
              <View style={styles.section}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  Mapa
                </Text>

                {ubicacion &&
                latitudDestino != null &&
                longitudDestino != null ? (
                  <View style={styles.mapContainer}>
                    <PlatformMap
                      latitude={ubicacion.latitud}
                      longitude={ubicacion.longitud}
                    />
                  </View>
                ) : (
                  <View
                    style={[
                      styles.mapPlaceholder,
                      {
                        backgroundColor:
                          theme.colors.surfaceSecondary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.infoText,
                        {
                          color:
                            theme.colors.textSecondary,
                        },
                      ]}
                    >
                      No hay información suficiente
                      para mostrar el mapa.
                    </Text>
                  </View>
                )}
              </View>
            </Card>

            {/* ------------------------------------------------ */}
            {/* CHECKPOINT ACTUAL */}
            {/* ------------------------------------------------ */}

            {checkpointActual ? (
              <Card>
                <View style={styles.section}>
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: theme.colors.text },
                    ]}
                  >
                    Checkpoint actual
                  </Text>

                  <View
                    style={[
                      styles.currentCheckpoint,
                      {
                        borderColor:
                          theme.colors.primary,
                        backgroundColor:
                          theme.colors.surfaceSecondary,
                      },
                    ]}
                  >
                    <View style={styles.currentIcon}>
                      <Text
                        style={[
                          styles.currentNumber,
                          {
                            color:
                              theme.colors.primary,
                          },
                        ]}
                      >
                        {indiceCheckpointActual + 1}
                      </Text>
                    </View>

                    <View
                      style={styles.currentContent}
                    >
                      <Text
                        style={[
                          styles.currentTitle,
                          { color: theme.colors.text },
                        ]}
                      >
                        {checkpointActual.titulo}
                      </Text>

                      <Text
                        style={[
                          styles.currentDescription,
                          {
                            color:
                              theme.colors.textSecondary,
                          },
                        ]}
                      >
                        {checkpointActual.descripcion}
                      </Text>

                      <Text
                        style={[
                          styles.currentStatus,
                          {
                            color:
                              obtenerColorEstado(
                                checkpointActual.estado
                              ),
                          },
                        ]}
                      >
                        {obtenerNombreEstado(
                          checkpointActual.estado
                        )}
                      </Text>
                    </View>
                  </View>

                  {/* Observación */}
                  <View style={styles.observacionBox}>
                    <Text
                      style={[
                        styles.label,
                        {
                          color:
                            theme.colors.textMuted,
                        },
                      ]}
                    >
                      Observación
                    </Text>

                    <View
                      style={[
                        styles.observacionInput,
                        {
                          backgroundColor:
                            theme.colors
                              .surfaceSecondary,
                          borderColor:
                            theme.colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.observacionText,
                          {
                            color:
                              observacion
                                ? theme.colors.text
                                : theme.colors
                                    .textMuted,
                          },
                        ]}
                      >
                        {observacion ||
                          'Puedes agregar una observación antes de guardar.'}
                      </Text>
                    </View>
                  </View>

                  <Button
                    texto={
                      procesandoCheckpoint
                        ? 'Guardando...'
                        : '✓ Completar Checkpoint'
                    }
                    onPress={completarCheckpoint}
                    loading={procesandoCheckpoint}
                  />

                  <Button
                    texto="⚠ Registrar incidencia"
                    onPress={registrarIncidencia}
                    loading={procesandoCheckpoint}
                    variant="peligro"
                  />
                </View>
              </Card>
            ) : null}

            {/* ------------------------------------------------ */}
            {/* HISTORIAL DE CHECKPOINTS */}
            {/* ------------------------------------------------ */}

            <Card>
              <View style={styles.section}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  Seguimiento de la entrega
                </Text>

                <View style={styles.timeline}>
                  {checkpointsVisuales.map(
                    (item, index) => {
                      const esUltimo =
                        index ===
                        checkpointsVisuales.length -
                          1;

                      const completado =
                        ESTADOS_COMPLETADOS.includes(
                          item.estado
                        );

                      const incidencia =
                        item.estado ===
                        'incidencia';

                      return (
                        <View
                          key={item.tipo}
                          style={styles.timelineItem}
                        >
                          <View
                            style={
                              styles.timelineLeft
                            }
                          >
                            <View
                              style={[
                                styles.timelineCircle,
                                {
                                  backgroundColor:
                                    completado
                                      ? theme.colors
                                          .primary
                                      : incidencia
                                      ? theme.colors
                                          .error
                                      : theme.colors
                                          .surfaceSecondary,
                                  borderColor:
                                    completado
                                      ? theme.colors
                                          .primary
                                      : incidencia
                                      ? theme.colors
                                          .error
                                      : theme.colors
                                          .border,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.timelineNumber,
                                  {
                                    color:
                                      completado ||
                                      incidencia
                                        ? '#ffffff'
                                        : theme
                                            .colors
                                            .textMuted,
                                  },
                                ]}
                              >
                                {index + 1}
                              </Text>
                            </View>

                            {!esUltimo ? (
                              <View
                                style={[
                                  styles.timelineLine,
                                  {
                                    backgroundColor:
                                      completado
                                        ? theme.colors
                                            .primary
                                        : theme.colors
                                            .border,
                                  },
                                ]}
                              />
                            ) : null}
                          </View>

                          <View
                            style={
                              styles.timelineContent
                            }
                          >
                            <Text
                              style={[
                                styles.timelineTitle,
                                {
                                  color:
                                    theme.colors.text,
                                },
                              ]}
                            >
                              {item.titulo}
                            </Text>

                            <Text
                              style={[
                                styles.timelineDescription,
                                {
                                  color:
                                    theme.colors
                                      .textSecondary,
                                },
                              ]}
                            >
                              {item.descripcion}
                            </Text>

                            <Text
                              style={[
                                styles.timelineStatus,
                                {
                                  color:
                                    obtenerColorEstado(
                                      item.estado
                                    ),
                                },
                              ]}
                            >
                              {obtenerNombreEstado(
                                item.estado
                              )}
                            </Text>

                            {item.checkpoint ? (
                              <>
                                <Text
                                  style={[
                                    styles.timelineDate,
                                    {
                                      color:
                                        theme.colors
                                          .textMuted,
                                    },
                                  ]}
                                >
                                  {formatearFecha(
                                    item.checkpoint
                                  )}
                                </Text>

                                {item.checkpoint
                                  .precisionGPS !=
                                null ? (
                                  <Text
                                    style={[
                                      styles.timelineDate,
                                      {
                                        color:
                                          theme.colors
                                            .textMuted,
                                      },
                                    ]}
                                  >
                                    GPS: ±
                                    {Math.round(
                                      item.checkpoint
                                        .precisionGPS
                                    )}{' '}
                                    m
                                  </Text>
                                ) : null}

                                {item.checkpoint
                                  .observacion ? (
                                  <Text
                                    style={[
                                      styles.timelineObservation,
                                      {
                                        color:
                                          theme.colors
                                            .textSecondary,
                                      },
                                    ]}
                                  >
                                    {
                                      item
                                        .checkpoint
                                        .observacion
                                    }
                                  </Text>
                                ) : null}
                              </>
                            ) : null}
                          </View>
                        </View>
                      );
                    }
                  )}
                </View>
              </View>
            </Card>

            {/* ------------------------------------------------ */}
            {/* RESUMEN GPS */}
            {/* ------------------------------------------------ */}

            <Card>
              <View style={styles.section}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  Resumen
                </Text>

                <View style={styles.summaryGrid}>
                  <View
                    style={[
                      styles.summaryItem,
                      {
                        backgroundColor:
                          theme.colors
                            .surfaceSecondary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.summaryNumber,
                        {
                          color:
                            theme.colors.primary,
                        },
                      ]}
                    >
                      {
                        checkpoints.filter(
                          (item) =>
                            item.estado ===
                            'completado'
                        ).length
                      }
                    </Text>

                    <Text
                      style={[
                        styles.summaryLabel,
                        {
                          color:
                            theme.colors
                              .textSecondary,
                        },
                      ]}
                    >
                      Completados
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.summaryItem,
                      {
                        backgroundColor:
                          theme.colors
                            .surfaceSecondary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.summaryNumber,
                        {
                          color:
                            theme.colors.error,
                        },
                      ]}
                    >
                      {
                        checkpoints.filter(
                          (item) =>
                            item.estado ===
                            'incidencia'
                        ).length
                      }
                    </Text>

                    <Text
                      style={[
                        styles.summaryLabel,
                        {
                          color:
                            theme.colors
                              .textSecondary,
                        },
                      ]}
                    >
                      Incidencias
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.summaryItem,
                      {
                        backgroundColor:
                          theme.colors
                            .surfaceSecondary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.summaryNumber,
                        {
                          color:
                            theme.colors.primary,
                        },
                      ]}
                    >
                      {checkpoints.length}
                    </Text>

                    <Text
                      style={[
                        styles.summaryLabel,
                        {
                          color:
                            theme.colors
                              .textSecondary,
                        },
                      ]}
                    >
                      Registros
                    </Text>
                  </View>
                </View>
              </View>
            </Card>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },

  header: {
    gap: 4,
    marginBottom: 4,
  },

  kicker: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 21,
  },

  section: {
    gap: 10,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  infoBlock: {
    gap: 3,
  },

  label: {
    fontSize: 12,
    fontWeight: '700',
  },

  value: {
    fontSize: 14,
    lineHeight: 20,
  },

  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },

  errorText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },

  locationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  locationItem: {
    flex: 1,
    minWidth: 100,
    gap: 3,
  },

  locationValue: {
    fontSize: 13,
    fontWeight: '700',
  },

  mapContainer: {
    height: 260,
    borderRadius: 16,
    overflow: 'hidden',
  },

  mapPlaceholder: {
    height: 180,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  currentCheckpoint: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
  },

  currentIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },

  currentNumber: {
    fontSize: 20,
    fontWeight: '900',
  },

  currentContent: {
    flex: 1,
    gap: 4,
  },

  currentTitle: {
    fontSize: 16,
    fontWeight: '800',
  },

  currentDescription: {
    fontSize: 13,
    lineHeight: 19,
  },

  currentStatus: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },

  observacionBox: {
    gap: 5,
  },

  observacionInput: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'center',
  },

  observacionText: {
    fontSize: 13,
    lineHeight: 19,
  },

  timeline: {
    gap: 0,
  },

  timelineItem: {
    flexDirection: 'row',
    minHeight: 100,
  },

  timelineLeft: {
    width: 42,
    alignItems: 'center',
  },

  timelineCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  timelineNumber: {
    fontSize: 13,
    fontWeight: '900',
  },

  timelineLine: {
    width: 2,
    flex: 1,
    marginVertical: 2,
  },

  timelineContent: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 20,
    gap: 3,
  },

  timelineTitle: {
    fontSize: 15,
    fontWeight: '800',
  },

  timelineDescription: {
    fontSize: 13,
    lineHeight: 18,
  },

  timelineStatus: {
    fontSize: 12,
    fontWeight: '800',
  },

  timelineDate: {
    fontSize: 11,
    marginTop: 2,
  },

  timelineObservation: {
    fontSize: 12,
    lineHeight: 17,
    fontStyle: 'italic',
    marginTop: 2,
  },

  summaryGrid: {
    flexDirection: 'row',
    gap: 8,
  },

  summaryItem: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 3,
  },

  summaryNumber: {
    fontSize: 22,
    fontWeight: '900',
  },

  summaryLabel: {
    fontSize: 11,
    textAlign: 'center',
  },

  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
  },

  emptyText: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
});
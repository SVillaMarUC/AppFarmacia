import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  collection,
  doc,
  limit,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';

import { useTheme } from '@/context/ThemeContext';
import { usePedido } from '@/context/PedidoContext';

import { useAuth } from '@/hooks/useAuth';

import { db } from '@/services/firebase/config';

import type { Pedido } from '@/types';

export default function PedidosAsignadosScreen() {
  const { perfil } = useAuth();
  const { setPedidoActivo } = usePedido();
  const { theme } = useTheme();

  const [disponible, setDisponible] = useState<boolean>(true);
  const [actualizandoDisponibilidad, setActualizandoDisponibilidad] =
    useState(false);

  const [pedidoActivoLocal, setPedidoActivoLocal] =
    useState<Pedido | null>(null);

  const [pedidosAsignados, setPedidosAsignados] = useState<Pedido[]>([]);
  const [expandidoId, setExpandidoId] = useState<string | null>(null);

  useEffect(() => {
    if (!perfil?.uid) {
      return;
    }

    const usuarioRef = doc(db, 'usuarios', perfil.uid);

    const unsubUsuario = onSnapshot(usuarioRef, (snapshot) => {
      const data = snapshot.data();

      setDisponible(Boolean(data?.disponible));
    });

    const qActivo = query(
      collection(db, 'pedidos'),
      where('domiciliarioId', '==', perfil.uid),
      where('estado', '==', 'en_camino'),
      limit(1)
    );

    const qPendientes = query(
      collection(db, 'pedidos'),
      where('domiciliarioId', '==', perfil.uid),
      where('estado', '==', 'asignado')
    );

    const unsubActivo = onSnapshot(qActivo, (snapshot) => {
      const docItem = snapshot.docs[0];

      const pedido = docItem
        ? ({
            id: docItem.id,
            ...(docItem.data() as Omit<Pedido, 'id'>),
          } as Pedido)
        : null;

      // Estado local para esta pantalla
      setPedidoActivoLocal(pedido);

      // Estado global para otras pantallas,
      // especialmente navegacion.tsx
      setPedidoActivo(pedido);
    });

    const unsubPendientes = onSnapshot(qPendientes, (snapshot) => {
      const pedidos = snapshot.docs.map(
        (docItem) =>
          ({
            id: docItem.id,
            ...(docItem.data() as Omit<Pedido, 'id'>),
          } as Pedido)
      );

      setPedidosAsignados(pedidos);
    });

    return () => {
      unsubUsuario();
      unsubActivo();
      unsubPendientes();

      // Cuando se desmonta la pantalla,
      // no eliminamos el pedido activo del contexto.
      // Así navegación puede seguir utilizándolo.
    };
  }, [perfil?.uid, setPedidoActivo]);

  const toggleDisponibilidad = async () => {
    if (!perfil?.uid) {
      return;
    }

    try {
      setActualizandoDisponibilidad(true);

      const nuevoEstado = !disponible;

      await updateDoc(doc(db, 'usuarios', perfil.uid), {
        disponible: nuevoEstado,
      });

      setDisponible(nuevoEstado);
    } catch (error) {
      Alert.alert(
        'Error',
        'No fue posible actualizar tu disponibilidad.'
      );
    } finally {
      setActualizandoDisponibilidad(false);
    }
  };

  const marcarEntregado = async () => {
    if (!pedidoActivoLocal?.id) {
      return;
    }

    Alert.alert(
      'Confirmar entrega',
      '¿Deseas marcar este pedido como entregado?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await updateDoc(
                doc(db, 'pedidos', pedidoActivoLocal.id),
                {
                  estado: 'entregado',
                }
              );

              Alert.alert(
                'Éxito',
                'Pedido marcado como entregado.'
              );
            } catch (error) {
              Alert.alert(
                'Error',
                'No fue posible actualizar el pedido.'
              );
            }
          },
        },
      ]
    );
  };

  const tiempoEsperando = (pedido: Pedido) => {
    const raw = pedido.timestampCreacion;

    if (
      !raw ||
      typeof raw !== 'object' ||
      !('toDate' in raw)
    ) {
      return 'Sin fecha';
    }

    const min = Math.max(
      1,
      Math.round(
        (Date.now() - raw.toDate().getTime()) / 60000
      )
    );

    if (min < 60) {
      return `${min} min`;
    }

    return `${Math.round(min / 60)} h`;
  };

  const totalActivos = useMemo(
    () =>
      [pedidoActivoLocal, ...pedidosAsignados].filter(
        (item): item is Pedido => Boolean(item)
      ).length,
    [pedidoActivoLocal, pedidosAsignados]
  );

  return (
    <Screen>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <ScreenHeader
          kicker="Módulo Domiciliario"
          title="Pedidos Asignados"
          subtitle="Monitorea tus entregas en curso, transmite tu ubicación y reporta el estado en tiempo real."
        />

        {/* DISPONIBILIDAD */}
        <Card>
          <View style={styles.estadoRow}>
            <Text
              style={[
                styles.estadoLabel,
                { color: theme.colors.text },
              ]}
            >
              Estado:
            </Text>

            <Pressable
              onPress={toggleDisponibilidad}
              style={[
                styles.estadoPill,
                {
                  backgroundColor: disponible
                    ? theme.colors.primaryLight
                    : theme.colors.surfaceSecondary,
                },
              ]}
            >
              {actualizandoDisponibilidad ? (
                <ActivityIndicator
                  color={theme.colors.primary}
                  size="small"
                />
              ) : (
                <Text
                  style={[
                    styles.estadoTexto,
                    {
                      color: disponible
                        ? theme.colors.primary
                        : theme.colors.textMuted,
                    },
                  ]}
                >
                  {disponible
                    ? 'Disponible'
                    : 'No disponible'}
                </Text>
              )}
            </Pressable>
          </View>

          <Text
            style={[
              styles.info,
              { color: theme.colors.textSecondary },
            ]}
          >
            Pedidos activos: {totalActivos}
          </Text>
        </Card>

        {/* PEDIDO ACTIVO */}
        {pedidoActivoLocal ? (
          <Card>
            <View style={styles.section}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.colors.text },
                ]}
              >
                Entrega activa
              </Text>

              <Text
                style={[
                  styles.info,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Paciente: {pedidoActivoLocal.usuarioId}
              </Text>

              <Text
                style={[
                  styles.info,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Dirección:{' '}
                {pedidoActivoLocal.direccionEntrega?.direccion ??
                  'Sin dirección'}
              </Text>

              <Text
                style={[
                  styles.info,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Medicamentos:{' '}
                {pedidoActivoLocal.medicamentos
                  .map((m) => m.nombre)
                  .join(', ')}
              </Text>

              <Button
                texto="Marcar como entregado"
                onPress={marcarEntregado}
              />
            </View>
          </Card>
        ) : null}

        {/* PEDIDOS ASIGNADOS */}
        <Card>
          <View style={styles.section}>
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.colors.text },
              ]}
            >
              Pedidos asignados
            </Text>

            {!pedidosAsignados.length ? (
              <Text
                style={[
                  styles.info,
                  { color: theme.colors.textSecondary },
                ]}
              >
                No tienes pedidos asignados en este momento.
              </Text>
            ) : null}

            {pedidosAsignados.map((pedido) => {
              const expandido = expandidoId === pedido.id;

              return (
                <Pressable
                  key={pedido.id}
                  style={[
                    styles.rowPedido,
                    {
                      borderColor: theme.colors.border,
                      backgroundColor:
                        theme.colors.surfaceSecondary,
                    },
                  ]}
                  onPress={() =>
                    setExpandidoId((prev) =>
                      prev === pedido.id
                        ? null
                        : pedido.id
                    )
                  }
                >
                  <Text
                    style={[
                      styles.rowMain,
                      { color: theme.colors.text },
                    ]}
                  >
                    {pedido.direccionEntrega?.direccion ??
                      'Sin dirección'}
                  </Text>

                  <Text
                    style={[
                      styles.info,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Medicamentos:{' '}
                    {pedido.medicamentos
                      .map((m) => m.nombre)
                      .join(', ')}
                  </Text>

                  <Text
                    style={[
                      styles.info,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Tiempo esperando:{' '}
                    {tiempoEsperando(pedido)}
                  </Text>

                  {expandido ? (
                    <View
                      style={[
                        styles.detalleExpandido,
                        {
                          borderTopColor:
                            theme.colors.borderLight,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.info,
                          {
                            color:
                              theme.colors.textSecondary,
                          },
                        ]}
                      >
                        Modo de entrega:{' '}
                        {pedido.modoEntrega}
                      </Text>

                      <Text
                        style={[
                          styles.info,
                          {
                            color:
                              theme.colors.textSecondary,
                          },
                        ]}
                      >
                        Estado: {pedido.estado}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </Card>
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
  },

  estadoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  estadoLabel: {
    fontWeight: '700',
    fontSize: 14,
  },

  estadoPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 122,
    alignItems: 'center',
  },

  estadoTexto: {
    fontWeight: '700',
    fontSize: 14,
  },

  section: {
    gap: 8,
  },

  sectionTitle: {
    fontWeight: '700',
    fontSize: 16,
  },

  info: {
    fontSize: 14,
    lineHeight: 20,
  },

  rowPedido: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },

  rowMain: {
    fontWeight: '700',
    fontSize: 14,
  },

  detalleExpandido: {
    marginTop: 4,
    borderTopWidth: 1,
    paddingTop: 6,
    gap: 2,
  },
});
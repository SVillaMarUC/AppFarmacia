import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { EstadoPedidoBadge } from '@/components/afiliado/EstadoPedidoBadge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { firestoreService } from '@/services/firebase/firestore.service';
import type { Pedido } from '@/types';

export default function InicioAfiliadoScreen() {
  const { perfil } = useAuth();
  const { theme } = useTheme();
  const [pedidoActivo, setPedidoActivo] = useState<Pedido | null>(null);

  useEffect(() => {
    if (!perfil?.uid) {
      return;
    }
    const unsub = firestoreService.escucharPedidoActivo(perfil.uid, setPedidoActivo);
    return unsub;
  }, [perfil?.uid]);

  return (
    <Screen>
      <View style={styles.container}>
        <ScreenHeader
          kicker="Panel afiliado"
          title={`Hola, ${perfil?.nombre ?? 'afiliado'}`}
          subtitle="Consulta tus pedidos, crea una nueva solicitud y sigue el estado de entrega desde un solo lugar."
        />

        {perfil?.esPrioritario ? (
          <Text
            style={[
              styles.badge,
              {
                backgroundColor: theme.colors.warningBg,
                color: theme.colors.warningText,
              },
            ]}
          >
            Prioritario: atención preferencial
          </Text>
        ) : null}

        <Card>
          <Text style={[styles.cardTitulo, { color: theme.colors.text }]}>Pedido activo</Text>
          {pedidoActivo ? (
            <View style={styles.cardBody}>
              <EstadoPedidoBadge estado={pedidoActivo.estado} />
              <Text style={[styles.cardTexto, { color: theme.colors.textSecondary }]}>
                Modo: {pedidoActivo.modoEntrega}
              </Text>
            </View>
          ) : (
            <Text style={[styles.cardTexto, { color: theme.colors.textSecondary }]}>
              No tienes pedidos activos en este momento.
            </Text>
          )}
        </Card>

        <View style={styles.acciones}>
          <Button texto="Nueva Solicitud" onPress={() => router.push('/(afiliado)/nueva-solicitud')} />
          <Button texto="Mis Pedidos" onPress={() => router.push('/(afiliado)/historial')} variant="secundario" />
          <Button
            texto="Soporte y PQRS"
            onPress={() =>
              Alert.alert('Próximamente', 'La creación de PQRS para afiliados se habilita en una siguiente fase.')
            }
            variant="secundario"
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 14,
  },
  badge: {
    alignSelf: 'flex-start',
    fontWeight: '700',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cardTitulo: {
    fontSize: 17,
    fontWeight: '700',
  },
  cardTexto: {
    marginTop: 8,
  },
  cardBody: {
    gap: 8,
  },
  acciones: {
    gap: 10,
  },
});
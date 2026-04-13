import { Stack } from 'expo-router';
import { RoleGate } from '@/components/auth/RoleGate';

export default function DomiciliarioLayout() {
  return (
    <RoleGate role="domiciliario">
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#eef4f8' },
          headerShadowVisible: false,
          headerTintColor: '#0f172a',
          contentStyle: { backgroundColor: '#eef4f8' },
        }}
      >
        <Stack.Screen name="pedidos-asignados" options={{ title: 'Pedidos asignados' }} />
        <Stack.Screen name="navegacion" options={{ title: 'Navegación' }} />
      </Stack>
    </RoleGate>
  );
}
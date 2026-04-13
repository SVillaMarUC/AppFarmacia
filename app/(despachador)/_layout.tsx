import { Stack } from 'expo-router';
import { RoleGate } from '@/components/auth/RoleGate';

export default function DespachadorLayout() {
  return (
    <RoleGate role="despachador">
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#eef4f8' },
          headerShadowVisible: false,
          headerTintColor: '#0f172a',
          contentStyle: { backgroundColor: '#eef4f8' },
        }}
      >
        <Stack.Screen name="inventario" options={{ title: 'Inventario' }} />
        <Stack.Screen name="despachar" options={{ title: 'Despachar pedidos' }} />
      </Stack>
    </RoleGate>
  );
}
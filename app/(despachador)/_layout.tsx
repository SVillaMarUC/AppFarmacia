import { Stack } from 'expo-router';
import { RoleGate } from '@/components/auth/RoleGate';

export default function DespachadorLayout() {
  return (
    <RoleGate role="despachador">
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0f766e' },
          headerShadowVisible: false,
          headerTintColor: '#ffffff',
          headerTitleAlign: 'center',
          headerTitleStyle: {
            color: '#ffffff',
            fontWeight: '700',
          },
          contentStyle: { backgroundColor: '#eef4f8' },
        }}
      >
        <Stack.Screen name="inventario" options={{ title: 'Inventario' }} />
        <Stack.Screen name="despachar" options={{ title: 'Despachar pedidos' }} />
      </Stack>
    </RoleGate>
  );
}
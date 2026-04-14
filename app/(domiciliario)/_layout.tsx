import { Stack } from 'expo-router';
import { RoleGate } from '@/components/auth/RoleGate';

export default function DomiciliarioLayout() {
  return (
    <RoleGate role="domiciliario">
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
        <Stack.Screen name="pedidos-asignados" options={{ title: 'Pedidos asignados' }} />
        <Stack.Screen name="navegacion" options={{ title: 'Navegación' }} />
      </Stack>
    </RoleGate>
  );
}
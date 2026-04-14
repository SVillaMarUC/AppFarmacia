import { Stack } from 'expo-router';
import { RoleGate } from '@/components/auth/RoleGate';

export default function AdministradorLayout() {
  return (
    <RoleGate role="administrador">
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
        <Stack.Screen name="dashboard" options={{ title: 'Dashboard EPS' }} />
        <Stack.Screen name="reportes" options={{ title: 'Reportes' }} />
        <Stack.Screen name="pqrs" options={{ title: 'PQRS' }} />
      </Stack>
    </RoleGate>
  );
}
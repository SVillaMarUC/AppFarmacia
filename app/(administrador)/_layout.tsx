import { Stack } from 'expo-router';
import { RoleGate } from '@/components/auth/RoleGate';

export default function AdministradorLayout() {
  return (
    <RoleGate role="administrador">
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#eef4f8' },
          headerShadowVisible: false,
          headerTintColor: '#0f172a',
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
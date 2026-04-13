import { Tabs } from 'expo-router';
import { RoleGate } from '@/components/auth/RoleGate';

export default function AfiliadoLayout() {
  return (
    <RoleGate role="afiliado">
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: '#eef4f8' },
          headerShadowVisible: false,
          headerTintColor: '#0f172a',
          tabBarActiveTintColor: '#0f766e',
          tabBarInactiveTintColor: '#64748b',
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopColor: '#dbe4ee',
            height: 62,
            paddingBottom: 8,
            paddingTop: 6,
          },
        }}
      >
        <Tabs.Screen name="inicio" options={{ title: 'Inicio' }} />
        <Tabs.Screen name="nueva-solicitud" options={{ title: 'Solicitud' }} />
        <Tabs.Screen name="rastreo" options={{ title: 'Rastreo' }} />
        <Tabs.Screen name="historial" options={{ title: 'Historial' }} />
        <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
      </Tabs>
    </RoleGate>
  );
}
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { RoleGate } from '@/components/auth/RoleGate';

export default function AdministradorLayout() {
  return (
    <RoleGate role="administrador">
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: '#0f766e' },
          headerShadowVisible: false,
          headerTintColor: '#ffffff',
          headerTitleAlign: 'center',
          headerTitleStyle: { color: '#ffffff', fontWeight: '700' },
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
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Inicio',
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? 'grid' : 'grid-outline'} color={color} size={size ?? 24} />
            ),
          }}
        />
        <Tabs.Screen
          name="reportes"
          options={{
            title: 'Reportes',
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} color={color} size={size ?? 24} />
            ),
          }}
        />
        <Tabs.Screen
          name="pqrs"
          options={{
            title: 'PQRS',
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? 'chatbubble' : 'chatbubble-outline'} color={color} size={size ?? 24} />
            ),
          }}
        />
        <Tabs.Screen
          name="perfil"
          options={{
            title: 'Perfil',
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? 'person' : 'person-outline'} color={color} size={size ?? 24} />
            ),
          }}
        />
      </Tabs>
    </RoleGate>
  );
}
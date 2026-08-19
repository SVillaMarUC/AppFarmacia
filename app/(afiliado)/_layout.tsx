import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { RoleGate } from '@/components/auth/RoleGate';

export default function AfiliadoLayout() {
  return (
    <RoleGate role="afiliado">
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: '#0f766e' },
          headerShadowVisible: false,
          headerTintColor: '#ffffff',
          headerTitleAlign: 'center',
          headerTitleStyle: {
            color: '#ffffff',
            fontWeight: '700',
          },
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
          name="inicio"
          options={{
            title: 'Inicio',
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} color={color} size={size ?? 24} />
            ),
          }}
        />
        <Tabs.Screen
          name="nueva-solicitud"
          options={{
            title: 'Solicitud',
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? 'add-circle' : 'add-circle-outline'} color={color} size={size ?? 24} />
            ),
          }}
        />
        <Tabs.Screen
          name="rastreo"
          options={{
            title: 'Rastreo',
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? 'location' : 'location-outline'} color={color} size={size ?? 24} />
            ),
          }}
        />
        <Tabs.Screen
          name="historial"
          options={{
            title: 'Historial',
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? 'time' : 'time-outline'} color={color} size={size ?? 24} />
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
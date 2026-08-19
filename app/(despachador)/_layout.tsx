import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { RoleGate } from '@/components/auth/RoleGate';

export default function DespachadorLayout() {
  return (
    <RoleGate role="despachador">
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
          name="inventario"
          options={{
            title: 'Inventario',
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? 'layers' : 'layers-outline'} color={color} size={size ?? 24} />
            ),
          }}
        />
        <Tabs.Screen
          name="despachar"
          options={{
            title: 'Despachar',
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? 'send' : 'send-outline'} color={color} size={size ?? 24} />
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
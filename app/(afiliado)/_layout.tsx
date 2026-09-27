import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { RoleGate } from '@/components/auth/RoleGate';
import { useTheme } from '@/context/ThemeContext';

export default function AfiliadoLayout() {
  const { theme } = useTheme();

  return (
    <RoleGate role="afiliado">
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.headerBg },
          headerShadowVisible: false,
          headerTintColor: theme.colors.headerText,
          headerTitleAlign: 'center',
          headerTitleStyle: {
            color: theme.colors.headerText,
            fontWeight: '700',
          },
          tabBarActiveTintColor: theme.colors.tabBarActive,
          tabBarInactiveTintColor: theme.colors.tabBarInactive,
          tabBarStyle: {
            backgroundColor: theme.colors.tabBarBg,
            borderTopColor: theme.colors.tabBarBorder,
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
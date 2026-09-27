import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { RoleGate } from '@/components/auth/RoleGate';
import { useTheme } from '@/context/ThemeContext';

export default function AdministradorLayout() {
  const { theme } = useTheme();

  return (
    <RoleGate role="administrador">
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.headerBg },
          headerShadowVisible: false,
          headerTintColor: theme.colors.headerText,
          headerTitleAlign: 'center',
          headerTitleStyle: { color: theme.colors.headerText, fontWeight: '700' },
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
          name="dashboard"
          options={{
            title: 'Inicio',
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? 'grid' : 'grid-outline'} color={color} size={size ?? 24} />
            ),
          }}
        />
        <Tabs.Screen
          name="inventario"
          options={{
            title: 'Inventario',
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? 'medkit' : 'medkit-outline'} color={color} size={size ?? 24} />
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
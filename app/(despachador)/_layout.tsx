import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { RoleGate } from '@/components/auth/RoleGate';
import { useTheme } from '@/context/ThemeContext';

export default function DespachadorLayout() {
  const { theme } = useTheme();

  return (
    <RoleGate role="despachador">
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
          name="inventario"
          options={{
            title: 'Inventario',
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? 'layers' : 'layers-outline'} color={color as string} size={size ?? 24} />
            ),
          }}
        />
        <Tabs.Screen
          name="despachar"
          options={{
            title: 'Despachar',
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? 'send' : 'send-outline'} color={color as string} size={size ?? 24} />
            ),
          }}
        />
        <Tabs.Screen
          name="perfil"
          options={{
            title: 'Perfil',
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? 'person' : 'person-outline'} color={color as string} size={size ?? 24} />
            ),
          }}
        />
      </Tabs>
    </RoleGate>
  );
}
import { useEffect } from 'react';
import { Redirect, Slot, useSegments } from 'expo-router';
import { AuthProvider } from '@/context/AuthContext';
import { PedidoProvider } from '@/context/PedidoContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';

const Guard = () => {
  const { loading, firebaseUser, perfil } = useAuth();
  const segments = useSegments();

  if (loading) {
    return <LoadingOverlay texto="Validando sesión..." />;
  }

  const enAuth = segments[0] === '(auth)';

  if (!firebaseUser) {
    return enAuth ? <Slot /> : <Redirect href="/(auth)/login" />;
  }

  if (!perfil) {
    return <Redirect href="/(auth)/login" />;
  }

  const destinoPorRol: Record<string, '/(afiliado)/inicio' | '/(administrador)/dashboard' | '/(domiciliario)/pedidos-asignados' | '/(despachador)/inventario'> = {
    afiliado: '/(afiliado)/inicio',
    administrador: '/(administrador)/dashboard',
    domiciliario: '/(domiciliario)/pedidos-asignados',
    despachador: '/(despachador)/inventario',
  };

  const destino = destinoPorRol[perfil.rol] ?? '/(auth)/login';

  if (enAuth) {
    return <Redirect href={destino} />;
  }

  return <Slot />;
};

export default function RootLayout() {
  useEffect(() => {
    // Espacio para inicialización de notificaciones o listeners globales.
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider>
        <PedidoProvider>
          <Guard />
        </PedidoProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
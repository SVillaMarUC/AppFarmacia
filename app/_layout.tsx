import { useEffect } from 'react';
import { Slot, usePathname, useRouter, useSegments } from 'expo-router';
import { AuthProvider } from '@/context/AuthContext';
import { PedidoProvider } from '@/context/PedidoContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';

const Guard = () => {
  const { loading, firebaseUser, perfil } = useAuth();
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();

  const enAuth = segments[0] === '(auth)';

  const destinoPorRol: Record<string, '/(afiliado)/inicio' | '/(administrador)/dashboard' | '/(domiciliario)/pedidos-asignados' | '/(despachador)/inventario'> = {
    afiliado: '/(afiliado)/inicio',
    administrador: '/(administrador)/dashboard',
    domiciliario: '/(domiciliario)/pedidos-asignados',
    despachador: '/(despachador)/inventario',
  };

  const destino = perfil ? destinoPorRol[perfil.rol] ?? '/(auth)/login' : '/(auth)/login';

  const redirectTarget = (() => {
    if (loading) {
      return null;
    }
    if (!firebaseUser) {
      return enAuth ? null : '/(auth)/login';
    }
    if (!perfil) {
      return '/(auth)/login';
    }
    if (enAuth) {
      return destino;
    }
    return null;
  })();

  useEffect(() => {
    if (loading) {
      return;
    }
    if (!redirectTarget) {
      return;
    }
    if (pathname !== redirectTarget) {
      router.replace(redirectTarget);
    }
  }, [loading, redirectTarget, pathname, router]);

  if (loading) {
    return <LoadingOverlay texto="Validando sesión..." />;
  }

  if (redirectTarget && pathname !== redirectTarget) {
    return <LoadingOverlay texto="Redirigiendo..." />;
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
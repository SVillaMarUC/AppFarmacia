import { useEffect } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { Slot, usePathname, useRouter, useSegments, type ErrorBoundaryProps } from 'expo-router';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider } from '@/context/AuthContext';
import { PedidoProvider } from '@/context/PedidoContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  console.error('[ErrorBoundary]', error);

  return (
    <ThemeProvider>
      <View style={styles.errorContainer}>
        <Card>
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={48} color="#dc2626" />
            <Text style={styles.errorTitulo}>Ocurrió un error inesperado</Text>
            <Text style={styles.errorDetalle}>
              {error?.message || 'Ha ocurrido un problema al renderizar la pantalla.'}
            </Text>
            <Button texto="Reintentar" onPress={retry} />
          </View>
        </Card>
      </View>
    </ThemeProvider>
  );
}

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

  const mostrarOverlay = loading || (redirectTarget !== null && pathname !== redirectTarget);

  // El <Slot /> se renderiza SIEMPRE para que el navegador no se desmonte
  // mientras se valida la sesión o se redirige. El overlay se dibuja encima.
  return (
    <View style={styles.guardContainer}>
      <Slot />
      {mostrarOverlay ? (
        <View style={StyleSheet.absoluteFill}>
          <LoadingOverlay texto={loading ? 'Validando sesión...' : 'Redirigiendo...'} />
        </View>
      ) : null}
    </View>
  );
};

function RootContent({ fontsLoaded, fontError }: { fontsLoaded: boolean; fontError: Error | null }) {
  const { isDark, theme } = useTheme();

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />
      <AuthProvider>
        <PedidoProvider>
          {!fontsLoaded && !fontError ? (
            <LoadingOverlay texto="Cargando recursos..." />
          ) : (
            <Guard />
          )}
        </PedidoProvider>
      </AuthProvider>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
  });

  useEffect(() => {
    if (fontError) {
      console.error('[Font Error]:', fontError);
    }
  }, [fontError]);

  return (
    <ThemeProvider>
      <RootContent fontsLoaded={fontsLoaded} fontError={fontError} />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  guardContainer: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f1f5f9',
  },
  errorCard: {
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  errorTitulo: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  errorDetalle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
});
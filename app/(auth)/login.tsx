import { useEffect, useMemo, useState } from 'react';
import { Link } from 'expo-router';
import { Alert, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/hooks/useAuth';

const INTENTOS_MAXIMOS = 3;
const BLOQUEO_SEGUNDOS = 60;

export default function LoginScreen() {
  const { login, loading, error } = useAuth();
  const { theme } = useTheme();
  const [cedulaInput, setCedulaInput] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cedulaError, setCedulaError] = useState('');
  const [fallos, setFallos] = useState(0);
  const [bloqueadoHasta, setBloqueadoHasta] = useState<number | null>(null);
  const [segundosRestantes, setSegundosRestantes] = useState(0);

  const bloqueado = useMemo(() => Boolean(bloqueadoHasta && Date.now() < bloqueadoHasta), [bloqueadoHasta]);

  useEffect(() => {
    if (!bloqueadoHasta) {
      return;
    }
    const timer = setInterval(() => {
      const restante = Math.max(0, Math.ceil((bloqueadoHasta - Date.now()) / 1000));
      setSegundosRestantes(restante);
      if (restante === 0) {
        setBloqueadoHasta(null);
        setFallos(0);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [bloqueadoHasta]);

  const manejarFallo = () => {
    const nuevosFallos = fallos + 1;
    setFallos(nuevosFallos);
    if (nuevosFallos >= INTENTOS_MAXIMOS) {
      setBloqueadoHasta(Date.now() + BLOQUEO_SEGUNDOS * 1000);
      Alert.alert('Cuenta bloqueada', 'Se bloqueó el acceso por 60 segundos debido a múltiples intentos fallidos.');
    }
  };

  const onLoginConContrasena = async () => {
    if (bloqueado) {
      return;
    }

    const cedulaLimpia = cedulaInput.replace(/\D/g, '');
    if (cedulaLimpia.length < 7 || cedulaLimpia.length > 10) {
      setCedulaError('La cédula debe tener entre 7 y 10 dígitos.');
      return;
    }

    setCedulaError('');
    Keyboard.dismiss();

    try {
      await login(cedulaLimpia, contrasena);
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'No se pudo iniciar sesión.';
      Alert.alert('Error de inicio de sesión', mensaje);
      manejarFallo();
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.shell}>
          <ScreenHeader
            kicker="EPS • Farmacia • Entregas"
            title="FarmaYa"
            subtitle="Accede con tu cédula EPS y revisa tus medicamentos con un flujo simple y confiable."
          />

          <Card>
            <View style={styles.cardContent}>
              <Input
                label="Cédula"
                value={cedulaInput}
                onChangeText={(value) => {
                  setCedulaInput(value.replace(/\D/g, ''));
                  if (cedulaError) {
                    setCedulaError('');
                  }
                }}
                placeholder="Número de cédula"
                keyboardType="numeric"
                maxLength={10}
              />
              {cedulaError ? (
                <Text style={[styles.error, { color: theme.colors.error }]}>{cedulaError}</Text>
              ) : null}
              <Input
                label="Contraseña"
                value={contrasena}
                onChangeText={setContrasena}
                placeholder="Tu contraseña"
                secureTextEntry
              />

              <Button texto="Ingresar" onPress={onLoginConContrasena} loading={loading} disabled={bloqueado} />

              {bloqueado ? (
                <Text style={[styles.error, { color: theme.colors.error }]}>
                  Acceso bloqueado. Intenta en {segundosRestantes}s.
                </Text>
              ) : null}
              {error ? (
                <View
                  style={[
                    styles.errorBox,
                    {
                      backgroundColor: theme.colors.errorBg,
                      borderColor: theme.colors.error,
                    },
                  ]}
                >
                  <Text style={[styles.errorTitle, { color: theme.colors.errorText }]}>
                    Error de inicio de sesión
                  </Text>
                  <Text style={[styles.error, { color: theme.colors.errorText }]}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.links}>
                <View style={styles.actionsRow}>
                  <Link href="/(auth)/register" asChild style={styles.linkFlex}>
                    <TouchableOpacity
                      style={StyleSheet.flatten([
                        styles.registerButton,
                        {
                          borderColor: theme.colors.primary,
                          backgroundColor: theme.colors.primaryLight,
                        },
                      ])}
                    >
                      <Text style={[styles.registerLink, { color: theme.colors.primary }]}>Crear cuenta</Text>
                    </TouchableOpacity>
                  </Link>
                  <Link href="/(auth)/forgot-password" asChild style={styles.linkFlex}>
                    <TouchableOpacity
                      style={StyleSheet.flatten([
                        styles.resetButton,
                        {
                          borderColor: theme.colors.info,
                          backgroundColor: theme.colors.infoBg,
                        },
                      ])}
                    >
                      <Text style={[styles.resetLink, { color: theme.colors.infoText }]}>
                        Restablecer contraseña
                      </Text>
                    </TouchableOpacity>
                  </Link>
                </View>
              </View>
            </View>
          </Card>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  shell: {
    gap: 14,
  },
  cardContent: {
    gap: 12,
  },
  links: {
    gap: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  linkFlex: {
    flex: 1,
  },
  registerButton: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  registerLink: {
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  resetButton: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  resetLink: {
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  error: {
    fontWeight: '600',
    fontSize: 13,
  },
  errorBox: {
    gap: 4,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorTitle: {
    fontWeight: '800',
    fontSize: 13,
  },
});
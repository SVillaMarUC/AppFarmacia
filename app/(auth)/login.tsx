import { useEffect, useMemo, useState } from 'react';
import { Link } from 'expo-router';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/hooks/useAuth';

const INTENTOS_MAXIMOS = 3;
const BLOQUEO_SEGUNDOS = 60;

export default function LoginScreen() {
  const { login, loginConPin, loading, error } = useAuth();
  const [cedula, setCedula] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [pin, setPin] = useState('');
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
    try {
      await login(cedula, contrasena);
    } catch (e) {
      manejarFallo();
    }
  };

  const onLoginConPin = async () => {
    if (bloqueado) {
      return;
    }
    try {
      if (pin.length !== 4) {
        Alert.alert('PIN inválido', 'El PIN debe tener 4 dígitos.');
        return;
      }
      await loginConPin(cedula, pin);
    } catch (e) {
      manejarFallo();
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.shell}>
          <View style={styles.hero}>
            <Text style={styles.kicker}>EPS • Farmacia • Entregas</Text>
            <Text style={styles.titulo}>FarmaYa</Text>
            <Text style={styles.subtitulo}>Accede con tu cédula EPS y revisa tus medicamentos con un flujo simple y confiable.</Text>
          </View>

          <Card>
            <View style={styles.cardContent}>
              <Input
                label="Cédula"
                value={cedula}
                onChangeText={setCedula}
                placeholder="Ej: 1012345678"
                keyboardType="numeric"
              />
              <Input
                label="Contraseña"
                value={contrasena}
                onChangeText={setContrasena}
                placeholder="Tu contraseña"
                secureTextEntry
              />

              <Button texto="Ingresar" onPress={onLoginConContrasena} loading={loading} disabled={bloqueado} />

              <Text style={styles.separador}>o ingreso alternativo por PIN</Text>

              <Input
                label="PIN numérico (4 dígitos)"
                value={pin}
                onChangeText={setPin}
                placeholder="0000"
                keyboardType="numeric"
                maxLength={4}
              />
              <Button texto="Ingresar con PIN" onPress={onLoginConPin} loading={loading} variant="secundario" disabled={bloqueado} />

              {bloqueado ? <Text style={styles.error}>Acceso bloqueado. Intenta en {segundosRestantes}s.</Text> : null}
              {error ? <Text style={styles.error}>{error}</Text> : null}

              <View style={styles.links}>
                <Link style={styles.link} href="/(auth)/forgot-password">
                  ¿Olvidaste tu contraseña?
                </Link>
                <Link style={styles.link} href="/(auth)/register">
                  Crear cuenta como afiliado
                </Link>
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
  hero: {
    gap: 6,
    marginBottom: 2,
  },
  titulo: {
    fontSize: 30,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  kicker: {
    color: '#0f766e',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    fontSize: 12,
  },
  subtitulo: {
    color: '#334155',
    lineHeight: 20,
  },
  cardContent: {
    gap: 12,
  },
  separador: {
    color: '#475569',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '600',
  },
  links: {
    gap: 8,
  },
  link: {
    color: '#0369a1',
    fontWeight: '600',
  },
  error: {
    color: '#dc2626',
    fontWeight: '600',
  },
});
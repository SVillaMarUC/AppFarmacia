import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { authService } from '@/services/firebase/auth.service';

export default function ForgotPasswordScreen() {
  const [cedula, setCedula] = useState('');
  const [loading, setLoading] = useState(false);

  const onRecover = async () => {
    try {
      setLoading(true);
      await authService.enviarRecuperacion(cedula);
      Alert.alert('Recuperación enviada', 'Revisa tu correo asociado. Si tu EPS tiene canal SMS, lo recibirás también.');
    } catch (error) {
      Alert.alert('Error', 'No se pudo procesar la recuperación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.container}>
        <Card>
          <View style={styles.content}>
            <Text style={styles.kicker}>Acceso seguro</Text>
            <Text style={styles.titulo}>Recuperar contraseña</Text>
            <Text style={styles.descripcion}>Ingresa tu cédula para enviar instrucciones de recuperación.</Text>
            <Input label="Cédula" value={cedula} onChangeText={setCedula} keyboardType="numeric" />
            <Button texto="Enviar recuperación" onPress={onRecover} loading={loading} />
          </View>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  content: {
    gap: 12,
  },
  kicker: {
    color: '#0f766e',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    fontSize: 12,
  },
  titulo: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
  },
  descripcion: {
    color: '#334155',
    lineHeight: 20,
  },
});
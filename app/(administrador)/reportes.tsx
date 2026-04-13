import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { db } from '@/services/firebase/config';

export default function ReportesScreen() {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(false);

  const guardarReporte = async () => {
    try {
      setLoading(true);
      await addDoc(collection(db, 'reportes'), {
        titulo,
        descripcion,
        creadoEn: serverTimestamp(),
      });
      Alert.alert('Reporte guardado', 'El reporte fue registrado.');
      setTitulo('');
      setDescripcion('');
    } catch (error) {
      Alert.alert('Error', 'No fue posible guardar el reporte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>Soporte interno</Text>
          <Text style={styles.titulo}>Crear reporte administrativo</Text>
          <Text style={styles.subtitulo}>Documenta incidencias y hallazgos con una interfaz simple y clara.</Text>
        </View>
        <Card>
          <View style={styles.form}>
            <Input label="Título" value={titulo} onChangeText={setTitulo} />
            <Input label="Descripción" value={descripcion} onChangeText={setDescripcion} />
            <Button texto="Guardar reporte" onPress={guardarReporte} loading={loading} />
          </View>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 14,
  },
  hero: {
    gap: 6,
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
    letterSpacing: -0.4,
  },
  subtitulo: {
    color: '#334155',
    lineHeight: 20,
  },
  form: {
    gap: 12,
  },
});
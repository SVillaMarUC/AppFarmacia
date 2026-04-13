import { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ManualMedicationForm } from '@/components/afiliado/ManualMedicationForm';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/hooks/useAuth';
import { firestoreService } from '@/services/firebase/firestore.service';
import { ocrService } from '@/services/ocr.service';
import { storageService } from '@/services/firebase/storage.service';
import type { Direccion, Medicamento } from '@/types';

export default function NuevaSolicitudScreen() {
  const { perfil } = useAuth();
  const [tipoSolicitud, setTipoSolicitud] = useState<'ocr' | 'manual'>('ocr');
  const [imagenUri, setImagenUri] = useState<string | null>(null);
  const [imagenBase64, setImagenBase64] = useState<string>('');
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([{ nombre: '', cantidad: 1 }]);
  const [modoEntrega, setModoEntrega] = useState<'domicilio' | 'recogida'>('domicilio');
  const [indiceDireccion, setIndiceDireccion] = useState(0);
  const [loading, setLoading] = useState(false);

  const seleccionarImagen = async (desdeCamara: boolean) => {
    try {
      const permisos = await ImagePicker.requestCameraPermissionsAsync();
      if (!permisos.granted) {
        Alert.alert('Permiso requerido', 'Debes permitir acceso a cámara para cargar receta.');
        return;
      }

      const result = desdeCamara
        ? await ImagePicker.launchCameraAsync({ quality: 0.6, base64: true })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.6, base64: true });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      setImagenUri(asset.uri);
      setImagenBase64(asset.base64 ?? '');

      const ocr = await ocrService.procesarReceta(asset.base64 ?? '');
      const meds = ocr.medicamentosDetectados.map((m) => ({ nombre: m.nombre, cantidad: m.cantidad }));
      setMedicamentos(meds.length ? meds : [{ nombre: '', cantidad: 1 }]);
    } catch (error) {
      Alert.alert('Error', 'No se pudo procesar la imagen de la receta.');
    }
  };

  const actualizarMedicamento = (index: number, valor: string) => {
    setMedicamentos((prev) => prev.map((med, i) => (i === index ? { ...med, nombre: valor } : med)));
  };

  const actualizarCantidad = (index: number, valor: string) => {
    const cantidad = Math.max(1, Number(valor.replace(/[^\d]/g, '') || '1'));
    setMedicamentos((prev) => prev.map((med, i) => (i === index ? { ...med, cantidad } : med)));
  };

  const actualizarDosis = (index: number, valor: string) => {
    setMedicamentos((prev) => prev.map((med, i) => (i === index ? { ...med, dosis: valor } : med)));
  };

  const agregarMedicamento = () => {
    setMedicamentos((prev) => [...prev, { nombre: '', cantidad: 1 }]);
  };

  const quitarMedicamento = (index: number) => {
    setMedicamentos((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length ? next : [{ nombre: '', cantidad: 1 }];
    });
  };

  const enviarSolicitud = async () => {
    if (!perfil?.uid) {
      Alert.alert('Sesión inválida', 'Debes iniciar sesión de nuevo.');
      return;
    }

    if (modoEntrega === 'domicilio' && !perfil?.direcciones?.length) {
      Alert.alert('Dirección requerida', 'Tu perfil no tiene direcciones para entrega a domicilio.');
      return;
    }

    if (tipoSolicitud === 'ocr' && !imagenUri) {
      Alert.alert('Faltan datos', 'Debes cargar una receta médica.');
      return;
    }

    const medicamentosValidos = medicamentos
      .map((m) => ({ ...m, nombre: m.nombre.trim() }))
      .filter((m) => m.nombre.length > 0 && m.cantidad > 0);

    if (!medicamentosValidos.length) {
      Alert.alert('Medicamentos requeridos', 'Agrega al menos un medicamento válido.');
      return;
    }

    try {
      setLoading(true);
      const recetaUrl = tipoSolicitud === 'ocr' && imagenUri ? await storageService.subirReceta(imagenUri, perfil.uid) : null;

      const direccionEntrega: Direccion | undefined =
        modoEntrega === 'domicilio' ? perfil.direcciones[indiceDireccion] : undefined;

      await firestoreService.crearPedido({
        usuarioId: perfil.uid,
        medicamentos: medicamentosValidos,
        estado: 'pendiente',
        modoEntrega,
        direccionEntrega,
        recetaUrl,
        recetaOCRData: {
          imagenBase64Disponible: tipoSolicitud === 'ocr' ? Boolean(imagenBase64) : false,
          medicamentosDetectados: tipoSolicitud === 'ocr' ? medicamentosValidos.length : 0,
        },
        origenSolicitud: tipoSolicitud,
      });

      Alert.alert('Solicitud creada', 'Tu pedido fue registrado correctamente.');
      setImagenUri(null);
      setImagenBase64('');
      setMedicamentos([{ nombre: '', cantidad: 1 }]);
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No fue posible crear la solicitud.';
      Alert.alert('Error', mensaje);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>Solicitud digital</Text>
          <Text style={styles.titulo}>Nueva solicitud de medicamentos</Text>
          <Text style={styles.subtitulo}>Puedes crear el pedido con receta por imagen o cargar los medicamentos manualmente.</Text>
        </View>

        <Card>
          <Text style={styles.subtituloSeccion}>Tipo de solicitud</Text>
          <View style={styles.filaBotones}>
            <Button texto="Con receta" onPress={() => setTipoSolicitud('ocr')} variant={tipoSolicitud === 'ocr' ? 'primario' : 'secundario'} />
            <Button texto="Manual" onPress={() => setTipoSolicitud('manual')} variant={tipoSolicitud === 'manual' ? 'primario' : 'secundario'} />
          </View>
        </Card>

        {tipoSolicitud === 'ocr' ? (
          <Card>
            <View style={styles.filaBotones}>
              <Button texto="Tomar foto" onPress={() => seleccionarImagen(true)} />
              <Button texto="Elegir de galería" onPress={() => seleccionarImagen(false)} variant="secundario" />
            </View>
            <Text style={styles.nota}>Si no hay Google Cloud disponible, la imagen se mantiene local y el pedido sigue funcionando.</Text>
          </Card>
        ) : (
          <Card>
            <Text style={styles.nota}>Ingresa los medicamentos manualmente cuando no tengas receta digital.</Text>
          </Card>
        )}

        {tipoSolicitud === 'ocr' && imagenUri ? (
          <Card>
            <Image source={{ uri: imagenUri }} style={styles.preview} />
          </Card>
        ) : null}

        <Card>
          <Text style={styles.subtituloSeccion}>{tipoSolicitud === 'ocr' ? 'Medicamentos detectados (editable)' : 'Medicamentos (manual)'}</Text>
          {tipoSolicitud === 'ocr' && medicamentos.length === 0 ? <Text style={styles.texto}>Sin medicamentos detectados aún.</Text> : null}

          {tipoSolicitud === 'manual' ? (
            <ManualMedicationForm
              medicamentos={medicamentos}
              onChangeNombre={actualizarMedicamento}
              onChangeCantidad={actualizarCantidad}
              onChangeDosis={actualizarDosis}
              onAdd={agregarMedicamento}
              onRemove={quitarMedicamento}
            />
          ) : (
            <View style={styles.formList}>
              {medicamentos.map((medicamento, index) => (
                <Input
                  key={`${medicamento.nombre}-${index}`}
                  label={`Medicamento ${index + 1}`}
                  value={medicamento.nombre}
                  onChangeText={(value) => actualizarMedicamento(index, value)}
                />
              ))}
            </View>
          )}
        </Card>

        <Card>
          <Text style={styles.subtituloSeccion}>Modo de entrega</Text>
          <View style={styles.filaBotones}>
            <Button texto="Domicilio" onPress={() => setModoEntrega('domicilio')} variant={modoEntrega === 'domicilio' ? 'primario' : 'secundario'} />
            <Button texto="Recogida" onPress={() => setModoEntrega('recogida')} variant={modoEntrega === 'recogida' ? 'primario' : 'secundario'} />
          </View>

          {modoEntrega === 'domicilio' ? (
            <View style={styles.direccionBox}>
              <Text style={styles.texto}>Dirección de entrega</Text>
              {!perfil?.direcciones?.length ? <Text style={styles.texto}>No tienes direcciones registradas en tu perfil.</Text> : null}
              {perfil?.direcciones?.map((direccion, index) => (
                <Button
                  key={`${direccion.direccion}-${index}`}
                  texto={`${direccion.etiqueta}: ${direccion.direccion}`}
                  onPress={() => setIndiceDireccion(index)}
                  variant={indiceDireccion === index ? 'primario' : 'secundario'}
                />
              ))}
            </View>
          ) : null}
        </Card>

        <Button texto="Enviar solicitud" onPress={enviarSolicitud} loading={loading} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
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
  subtituloSeccion: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  texto: {
    color: '#334155',
  },
  nota: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 18,
  },
  filaBotones: {
    gap: 8,
  },
  formList: {
    gap: 10,
    marginTop: 12,
  },
  preview: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbe4ee',
  },
  direccionBox: {
    gap: 8,
    marginTop: 12,
  },
});
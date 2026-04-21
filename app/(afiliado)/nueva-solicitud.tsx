import { useState } from 'react';
import { Alert, Image, Keyboard, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
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
  const [paso, setPaso] = useState(1);
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
        ciudad: perfil?.ciudad ?? '',
        direccionEntrega,
        recetaUrl,
        recetaOCRData: {
          imagenBase64Disponible: tipoSolicitud === 'ocr' ? Boolean(imagenBase64) : false,
          medicamentosDetectados: tipoSolicitud === 'ocr' ? medicamentosValidos.length : 0,
        },
        origenSolicitud: tipoSolicitud,
      });

      Alert.alert('Solicitud creada', 'Tu pedido fue registrado correctamente.');
      setPaso(1);
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

  const avanzarDesdePaso1 = () => {
    if (tipoSolicitud === 'ocr' && !imagenUri) {
      Alert.alert('Faltan datos', 'Debes cargar una receta.');
      return;
    }
    setPaso(2);
  };

  const avanzarDesdePaso2 = () => {
    const medicamentosValidos = medicamentos
      .map((m) => ({ ...m, nombre: m.nombre.trim() }))
      .filter((m) => m.nombre.length > 0);

    if (!medicamentosValidos.length) {
      Alert.alert('Medicamentos requeridos', 'Debes agregar al menos un medicamento.');
      return;
    }
    setPaso(3);
  };

  const avanzarDesdePaso3 = () => {
    if (modoEntrega === 'domicilio' && !perfil?.direcciones?.length) {
      Alert.alert('Dirección requerida', 'Debes seleccionar una dirección para entrega a domicilio.');
      return;
    }
    setPaso(4);
  };

  const getResumenTipo = () => (tipoSolicitud === 'ocr' ? 'Con receta' : 'Manual');
  const getResumenEntrega = () => (modoEntrega === 'domicilio' ? 'A domicilio' : 'Recoger en punto');

  const medicamentoResumen = medicamentos
    .map((m) => ({ ...m, nombre: m.nombre.trim() }))
    .filter((m) => m.nombre.length > 0)
    .map((m) => `${m.nombre} x${m.cantidad}`)
    .join(', ');

  return (
    <Screen>
      <View style={styles.pasosHeader}>
        {[
          ['1', 'Tipo'],
          ['2', 'Medicamentos'],
          ['3', 'Entrega'],
          ['4', 'Confirmar'],
        ].map(([numero, label], index) => {
          const activo = paso === index + 1;
          return (
            <View key={numero} style={styles.pasoItem}>
              <View style={[styles.pasoCirculo, activo ? styles.pasoCirculoActivo : styles.pasoCirculoInactivo]}>
                <Text style={[styles.pasoNumero, activo ? styles.pasoNumeroActivo : styles.pasoNumeroInactivo]}>{numero}</Text>
              </View>
              <Text style={styles.pasoLabel}>{label}</Text>
            </View>
          );
        })}
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>Solicitud digital</Text>
          <Text style={styles.titulo}>Nueva solicitud de medicamentos</Text>
          <Text style={styles.subtitulo}>Puedes crear el pedido con receta por imagen o cargar los medicamentos manualmente.</Text>
        </View>

        {paso === 1 ? (
          <Card>
            <Text style={styles.subtituloSeccion}>Tipo de solicitud</Text>
            <View style={styles.toggleCardsWrap}>
              <TouchableOpacity
                style={[styles.toggleCard, tipoSolicitud === 'ocr' ? styles.toggleCardSelected : styles.toggleCardDefault]}
                onPress={() => setTipoSolicitud('ocr')}
              >
                <Text style={styles.toggleTitle}>Con receta</Text>
                <Text style={styles.toggleSub}>Sube una foto de tu receta médica</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleCard, tipoSolicitud === 'manual' ? styles.toggleCardSelected : styles.toggleCardDefault]}
                onPress={() => setTipoSolicitud('manual')}
              >
                <Text style={styles.toggleTitle}>Manual</Text>
                <Text style={styles.toggleSub}>Ingresa los medicamentos directamente</Text>
              </TouchableOpacity>
            </View>

            {tipoSolicitud === 'ocr' ? (
              <View style={styles.filaBotones}>
                <View style={styles.botonFlex}>
                  <Button texto="Tomar foto" onPress={() => seleccionarImagen(true)} />
                </View>
                <View style={styles.botonFlex}>
                  <Button texto="Elegir galería" onPress={() => seleccionarImagen(false)} variant="secundario" />
                </View>
              </View>
            ) : null}

            {tipoSolicitud === 'ocr' && imagenUri ? <Image source={{ uri: imagenUri }} style={styles.preview} /> : null}

            <View style={styles.accionPrincipal}>
              <Button texto="Siguiente" onPress={avanzarDesdePaso1} />
            </View>
          </Card>
        ) : null}

        {paso === 2 ? (
          <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
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
                      onSubmitEditing={() => Keyboard.dismiss()}
                      blurOnSubmit
                      returnKeyType="done"
                    />
                  ))}
                </View>
              )}

              <View style={styles.filaBotones}>
                <View style={styles.botonFlex}>
                  <Button texto="Atrás" onPress={() => setPaso(1)} variant="secundario" />
                </View>
                <View style={styles.botonFlex}>
                  <Button texto="Siguiente" onPress={avanzarDesdePaso2} />
                </View>
              </View>
            </Card>
          </TouchableWithoutFeedback>
        ) : null}

        {paso === 3 ? (
          <Card>
            <Text style={styles.subtituloSeccion}>Entrega</Text>
            <Text style={styles.texto}>Modo de entrega</Text>

            <View style={styles.toggleCardsWrap}>
              <TouchableOpacity
                style={[styles.toggleCard, modoEntrega === 'domicilio' ? styles.toggleCardSelected : styles.toggleCardDefault]}
                onPress={() => setModoEntrega('domicilio')}
              >
                <Text style={styles.toggleTitle}>A domicilio</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleCard, modoEntrega === 'recogida' ? styles.toggleCardSelected : styles.toggleCardDefault]}
                onPress={() => setModoEntrega('recogida')}
              >
                <Text style={styles.toggleTitle}>Recoger en punto</Text>
              </TouchableOpacity>
            </View>

            {modoEntrega === 'domicilio' ? (
              <View style={styles.direccionBox}>
                <Text style={styles.texto}>Ciudad de entrega</Text>
                <View style={styles.infoBox}>
                  <Text style={styles.infoValue}>{perfil?.ciudad ?? 'No registrada'}</Text>
                </View>

                <Text style={styles.texto}>Dirección de entrega</Text>
                {!perfil?.direcciones?.length ? <Text style={styles.texto}>No tienes direcciones registradas en tu perfil.</Text> : null}
                {perfil?.direcciones?.map((direccion, index) => (
                  <TouchableOpacity
                    key={`${direccion.direccion}-${index}`}
                    style={[styles.toggleCard, indiceDireccion === index ? styles.toggleCardSelected : styles.toggleCardDefault]}
                    onPress={() => setIndiceDireccion(index)}
                  >
                    <Text style={styles.toggleTitle}>{direccion.etiqueta}</Text>
                    <Text style={styles.toggleSub}>{direccion.direccion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            <View style={styles.filaBotones}>
              <View style={styles.botonFlex}>
                <Button texto="Atrás" onPress={() => setPaso(2)} variant="secundario" />
              </View>
              <View style={styles.botonFlex}>
                <Button texto="Siguiente" onPress={avanzarDesdePaso3} />
              </View>
            </View>
          </Card>
        ) : null}

        {paso === 4 ? (
          <Card>
            <Text style={styles.subtituloSeccion}>Confirmar</Text>
            <View style={styles.formList}>
              <Text style={styles.info}>Tipo: {getResumenTipo()}</Text>
              <Text style={styles.info}>Medicamentos: {medicamentoResumen || 'Sin medicamentos'}</Text>
              <Text style={styles.info}>Modo de entrega: {getResumenEntrega()}</Text>
              <Text style={styles.info}>
                {modoEntrega === 'domicilio'
                  ? `Dirección: ${perfil?.direcciones?.[indiceDireccion]?.direccion ?? 'No definida'}`
                  : `Ciudad: ${perfil?.ciudad ?? 'No registrada'}`}
              </Text>
            </View>

            <View style={styles.accionPrincipal}>
              <Button texto="Enviar solicitud" onPress={enviarSolicitud} loading={loading} />
            </View>
            <View style={styles.botonAtrasSolo}>
              <Button texto="Atrás" onPress={() => setPaso(3)} variant="secundario" />
            </View>
          </Card>
        ) : null}
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
    paddingTop: 6,
  },
  pasosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
  },
  pasoItem: {
    alignItems: 'center',
    gap: 6,
    width: '24%',
  },
  pasoCirculo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pasoCirculoActivo: {
    backgroundColor: '#0f766e',
  },
  pasoCirculoInactivo: {
    backgroundColor: '#f1f5f9',
  },
  pasoNumero: {
    fontSize: 12,
    fontWeight: '700',
  },
  pasoNumeroActivo: {
    color: '#ffffff',
  },
  pasoNumeroInactivo: {
    color: '#94a3b8',
  },
  pasoLabel: {
    color: '#334155',
    fontSize: 12,
    textAlign: 'center',
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
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 10,
  },
  accionPrincipal: {
    marginTop: 12,
  },
  botonFlex: {
    flex: 1,
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
  toggleCardsWrap: {
    gap: 8,
    marginTop: 10,
  },
  toggleCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  toggleCardSelected: {
    borderColor: '#0f766e',
    backgroundColor: '#f0fdfa',
  },
  toggleCardDefault: {
    borderColor: '#dbe4ee',
    backgroundColor: '#ffffff',
  },
  toggleTitle: {
    color: '#0f172a',
    fontWeight: '700',
  },
  toggleSub: {
    color: '#334155',
  },
  infoBox: {
    borderWidth: 1,
    borderColor: '#dbe4ee',
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#f8fafc',
  },
  infoValue: {
    color: '#334155',
    fontWeight: '600',
  },
  info: {
    color: '#334155',
  },
  botonAtrasSolo: {
    marginTop: 10,
  },
});
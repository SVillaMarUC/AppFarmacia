import { useState } from 'react';
import { Alert, Image, Keyboard, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ManualMedicationForm } from '@/components/afiliado/ManualMedicationForm';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { firestoreService } from '@/services/firebase/firestore.service';
import { ocrService } from '@/services/ocr.service';
import { storageService } from '@/services/firebase/storage.service';
import type { Direccion, Medicamento } from '@/types';

export default function NuevaSolicitudScreen() {
  const { perfil } = useAuth();
  const { theme } = useTheme();
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
      <View
        style={[
          styles.pasosHeader,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.borderLight,
          },
        ]}
      >
        {[
          ['1', 'Tipo'],
          ['2', 'Medicamentos'],
          ['3', 'Entrega'],
          ['4', 'Confirmar'],
        ].map(([numero, label], index) => {
          const activo = paso === index + 1;
          return (
            <View key={numero} style={styles.pasoItem}>
              <View
                style={[
                  styles.pasoCirculo,
                  activo
                    ? { backgroundColor: theme.colors.primary }
                    : { backgroundColor: theme.colors.surfaceSecondary },
                ]}
              >
                <Text
                  style={[
                    styles.pasoNumero,
                    activo ? styles.pasoNumeroActivo : { color: theme.colors.textMuted },
                  ]}
                >
                  {numero}
                </Text>
              </View>
              <Text
                style={[
                  styles.pasoLabel,
                  { color: activo ? theme.colors.primary : theme.colors.textSecondary },
                ]}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <ScreenHeader
          kicker="Solicitud digital"
          title="Nueva solicitud"
          subtitle="Puedes crear el pedido con receta por imagen o cargar los medicamentos manualmente."
        />

        {paso === 1 ? (
          <Card>
            <Text style={[styles.subtituloSeccion, { color: theme.colors.text }]}>Tipo de solicitud</Text>
            <View style={styles.toggleCardsWrap}>
              <TouchableOpacity
                style={[
                  styles.toggleCard,
                  {
                    backgroundColor:
                      tipoSolicitud === 'ocr'
                        ? theme.colors.primaryLight
                        : theme.colors.surfaceSecondary,
                    borderColor:
                      tipoSolicitud === 'ocr' ? theme.colors.primary : theme.colors.borderLight,
                  },
                ]}
                onPress={() => setTipoSolicitud('ocr')}
              >
                <Text style={[styles.toggleTitle, { color: theme.colors.text }]}>Con receta</Text>
                <Text style={[styles.toggleSub, { color: theme.colors.textSecondary }]}>
                  Sube una foto de tu receta médica
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleCard,
                  {
                    backgroundColor:
                      tipoSolicitud === 'manual'
                        ? theme.colors.primaryLight
                        : theme.colors.surfaceSecondary,
                    borderColor:
                      tipoSolicitud === 'manual' ? theme.colors.primary : theme.colors.borderLight,
                  },
                ]}
                onPress={() => setTipoSolicitud('manual')}
              >
                <Text style={[styles.toggleTitle, { color: theme.colors.text }]}>Manual</Text>
                <Text style={[styles.toggleSub, { color: theme.colors.textSecondary }]}>
                  Ingresa los medicamentos directamente
                </Text>
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

            {tipoSolicitud === 'ocr' && imagenUri ? (
              <Image source={{ uri: imagenUri }} style={[styles.preview, { borderColor: theme.colors.border }]} />
            ) : null}

            <View style={styles.accionPrincipal}>
              <Button texto="Siguiente" onPress={avanzarDesdePaso1} />
            </View>
          </Card>
        ) : null}

        {paso === 2 ? (
          <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <Card>
              <Text style={[styles.subtituloSeccion, { color: theme.colors.text }]}>
                {tipoSolicitud === 'ocr' ? 'Medicamentos detectados (editable)' : 'Medicamentos (manual)'}
              </Text>
              {tipoSolicitud === 'ocr' && medicamentos.length === 0 ? (
                <Text style={[styles.texto, { color: theme.colors.textSecondary }]}>
                  Sin medicamentos detectados aún.
                </Text>
              ) : null}

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
            <Text style={[styles.subtituloSeccion, { color: theme.colors.text }]}>Entrega</Text>
            <Text style={[styles.texto, { color: theme.colors.textSecondary }]}>Modo de entrega</Text>

            <View style={styles.toggleCardsWrap}>
              <TouchableOpacity
                style={[
                  styles.toggleCard,
                  {
                    backgroundColor:
                      modoEntrega === 'domicilio'
                        ? theme.colors.primaryLight
                        : theme.colors.surfaceSecondary,
                    borderColor:
                      modoEntrega === 'domicilio' ? theme.colors.primary : theme.colors.borderLight,
                  },
                ]}
                onPress={() => setModoEntrega('domicilio')}
              >
                <Text style={[styles.toggleTitle, { color: theme.colors.text }]}>A domicilio</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleCard,
                  {
                    backgroundColor:
                      modoEntrega === 'recogida'
                        ? theme.colors.primaryLight
                        : theme.colors.surfaceSecondary,
                    borderColor:
                      modoEntrega === 'recogida' ? theme.colors.primary : theme.colors.borderLight,
                  },
                ]}
                onPress={() => setModoEntrega('recogida')}
              >
                <Text style={[styles.toggleTitle, { color: theme.colors.text }]}>Recoger en punto</Text>
              </TouchableOpacity>
            </View>

            {modoEntrega === 'domicilio' ? (
              <View style={styles.direccionBox}>
                <Text style={[styles.texto, { color: theme.colors.textSecondary }]}>Ciudad de entrega</Text>
                <View
                  style={[
                    styles.infoBox,
                    {
                      backgroundColor: theme.colors.surfaceSecondary,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                    {perfil?.ciudad ?? 'No registrada'}
                  </Text>
                </View>

                <Text style={[styles.texto, { color: theme.colors.textSecondary }]}>Dirección de entrega</Text>
                {!perfil?.direcciones?.length ? (
                  <Text style={[styles.texto, { color: theme.colors.textSecondary }]}>
                    No tienes direcciones registradas en tu perfil.
                  </Text>
                ) : null}
                {perfil?.direcciones?.map((direccion, index) => (
                  <TouchableOpacity
                    key={`${direccion.direccion}-${index}`}
                    style={[
                      styles.toggleCard,
                      {
                        backgroundColor:
                          indiceDireccion === index
                            ? theme.colors.primaryLight
                            : theme.colors.surfaceSecondary,
                        borderColor:
                          indiceDireccion === index ? theme.colors.primary : theme.colors.borderLight,
                      },
                    ]}
                    onPress={() => setIndiceDireccion(index)}
                  >
                    <Text style={[styles.toggleTitle, { color: theme.colors.text }]}>
                      {direccion.etiqueta}
                    </Text>
                    <Text style={[styles.toggleSub, { color: theme.colors.textSecondary }]}>
                      {direccion.direccion}
                    </Text>
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
            <Text style={[styles.subtituloSeccion, { color: theme.colors.text }]}>Confirmar</Text>
            <View style={styles.formList}>
              <Text style={[styles.info, { color: theme.colors.textSecondary }]}>
                Tipo: <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{getResumenTipo()}</Text>
              </Text>
              <Text style={[styles.info, { color: theme.colors.textSecondary }]}>
                Medicamentos:{' '}
                <Text style={{ color: theme.colors.text, fontWeight: '700' }}>
                  {medicamentoResumen || 'Sin medicamentos'}
                </Text>
              </Text>
              <Text style={[styles.info, { color: theme.colors.textSecondary }]}>
                Modo de entrega:{' '}
                <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{getResumenEntrega()}</Text>
              </Text>
              <Text style={[styles.info, { color: theme.colors.textSecondary }]}>
                {modoEntrega === 'domicilio' ? (
                  <>
                    Dirección:{' '}
                    <Text style={{ color: theme.colors.text, fontWeight: '700' }}>
                      {perfil?.direcciones?.[indiceDireccion]?.direccion ?? 'No definida'}
                    </Text>
                  </>
                ) : (
                  <>
                    Ciudad:{' '}
                    <Text style={{ color: theme.colors.text, fontWeight: '700' }}>
                      {perfil?.ciudad ?? 'No registrada'}
                    </Text>
                  </>
                )}
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
    paddingBottom: 32,
  },
  pasosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
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
  pasoNumero: {
    fontSize: 12,
    fontWeight: '700',
  },
  pasoNumeroActivo: {
    color: '#ffffff',
  },
  pasoLabel: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  subtituloSeccion: {
    fontSize: 16,
    fontWeight: '700',
  },
  texto: {
    fontSize: 14,
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
  toggleTitle: {
    fontWeight: '700',
  },
  toggleSub: {
    fontSize: 13,
  },
  infoBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  infoValue: {
    fontWeight: '600',
  },
  info: {
    lineHeight: 22,
    fontSize: 14,
  },
  botonAtrasSolo: {
    marginTop: 10,
  },
});
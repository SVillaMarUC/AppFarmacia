import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { StockIndicator } from '@/components/shared/StockIndicator';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { medicationService } from '@/services/medication.service';
import { prescriptionService } from '@/services/prescription.service';
import { orderService } from '@/services/order.service';
import { ocrService } from '@/services/ocr.service';
import type { Direccion, ItemInventario, Medicamento, RecetaOCRItem } from '@/types';

export default function NuevaSolicitudScreen() {
  const { perfil } = useAuth();
  const { theme } = useTheme();

  // Pasos: 1. Medicamentos & Receta, 2. Detalle y Cantidades, 3. Entrega, 4. Confirmar
  const [paso, setPaso] = useState(1);
  const [modoSeleccion, setModoSeleccion] = useState<'catalogo' | 'receta' | 'manual'>('catalogo');

  // Catálogo de inventario
  const [catalogo, setCatalogo] = useState<ItemInventario[]>([]);
  const [busquedaCatalogo, setBusquedaCatalogo] = useState('');
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true);

  // Receta Médica
  const [imagenUri, setImagenUri] = useState<string | null>(null);
  const [imagenBase64, setImagenBase64] = useState<string>('');
  const [ocrTexto, setOcrTexto] = useState<string>('');
  const [ocrMedicamentos, setOcrMedicamentos] = useState<RecetaOCRItem[]>([]);
  const [procesandoOcr, setProcesandoOcr] = useState(false);

  // Lista de Medicamentos en el pedido
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);

  // Entrega
  const [modoEntrega, setModoEntrega] = useState<'domicilio' | 'recogida'>('domicilio');
  const [indiceDireccion, setIndiceDireccion] = useState(0);
  const [loading, setLoading] = useState(false);

  // Cargar catálogo inicial
  useEffect(() => {
    let montado = true;
    const cargar = async () => {
      try {
        setCargandoCatalogo(true);
        const meds = await medicationService.obtenerCatalogoAfiliado();
        if (montado) {
          setCatalogo(meds);
        }
      } catch (err) {
        console.error('Error al cargar catálogo:', err);
      } finally {
        if (montado) setCargandoCatalogo(false);
      }
    };
    cargar();
    return () => {
      montado = false;
    };
  }, []);

  const catalogoFiltrado = useMemo(() => {
    const q = busquedaCatalogo.trim().toLowerCase();
    if (!q) return catalogo;
    return catalogo.filter(
      (m) =>
        m.nombre.toLowerCase().includes(q) ||
        (m.principioActivo && m.principioActivo.toLowerCase().includes(q)) ||
        (m.presentacion && m.presentacion.toLowerCase().includes(q))
    );
  }, [catalogo, busquedaCatalogo]);

  const requiereRecetaObligatoria = useMemo(() => {
    return medicamentos.some((m) => m.requiereReceta) || modoSeleccion === 'receta';
  }, [medicamentos, modoSeleccion]);

  // Selección y captura de imagen de receta
  const seleccionarImagen = async (desdeCamara: boolean) => {
    try {
      if (Platform.OS !== 'web') {
        if (desdeCamara) {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== ImagePicker.PermissionStatus.GRANTED) {
            Alert.alert(
              'Permiso de Cámara requerido',
              'Debes conceder permisos de acceso a la cámara para fotografiar tu receta médica.'
            );
            return;
          }
        } else {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== ImagePicker.PermissionStatus.GRANTED) {
            Alert.alert(
              'Permiso de Galería requerido',
              'Debes conceder permisos de acceso a la galería para seleccionar tu receta médica.'
            );
            return;
          }
        }
      }

      const result = desdeCamara && Platform.OS !== 'web'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.7,
            base64: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.7,
            base64: true,
          });

      if (result.canceled || !result.assets || !result.assets[0]) {
        return;
      }

      const asset = result.assets[0];
      setImagenUri(asset.uri);
      setImagenBase64(asset.base64 ?? '');

      // Procesar OCR si hay base64 disponible
      if (asset.base64) {
        setProcesandoOcr(true);
        try {
          const resOcr = await ocrService.procesarReceta(asset.base64);
          setOcrTexto(resOcr.textoCrudo);
          setOcrMedicamentos(resOcr.medicamentosDetectados);

          if (resOcr.medicamentosDetectados.length > 0) {
            // Incorporar medicamentos detectados
            const nuevosMeds: Medicamento[] = resOcr.medicamentosDetectados.map((item) => ({
              nombre: item.nombre,
              concentracion: item.concentracion,
              dosis: item.dosis,
              cantidad: item.cantidad || 1,
              requiereReceta: true,
            }));
            setMedicamentos(nuevosMeds);
          }
        } catch (ocrErr) {
          console.warn('Fallo OCR:', ocrErr);
        } finally {
          setProcesandoOcr(false);
        }
      }
    } catch (error) {
      console.error('Error al capturar imagen:', error);
      Alert.alert('Error', 'No fue posible cargar la imagen seleccionada.');
    }
  };

  const eliminarImagen = () => {
    setImagenUri(null);
    setImagenBase64('');
    setOcrTexto('');
    setOcrMedicamentos([]);
  };

  // Agregar medicamento desde catálogo
  const agregarDesdeCatalogo = (item: ItemInventario) => {
    setMedicamentos((prev) => {
      const existe = prev.find((m) => m.medicamentoId === item.id);
      if (existe) {
        return prev.map((m) =>
          m.medicamentoId === item.id ? { ...m, cantidad: m.cantidad + 1 } : m
        );
      }
      return [
        ...prev,
        {
          medicamentoId: item.id,
          nombre: item.nombre,
          principioActivo: item.principioActivo,
          concentracion: item.concentracion,
          presentacion: item.presentacion,
          cantidad: 1,
          requiereReceta: item.requiereReceta,
        },
      ];
    });
  };

  const agregarMedicamentoManual = () => {
    setMedicamentos((prev) => [
      ...prev,
      {
        nombre: '',
        cantidad: 1,
        requiereReceta: false,
      },
    ]);
  };

  const actualizarMedicamento = (index: number, campo: keyof Medicamento, valor: unknown) => {
    setMedicamentos((prev) =>
      prev.map((med, i) => (i === index ? { ...med, [campo]: valor } : med))
    );
  };

  const quitarMedicamento = (index: number) => {
    setMedicamentos((prev) => prev.filter((_, i) => i !== index));
  };

  const avanzarDesdePaso1 = () => {
    if (!medicamentos.length && modoSeleccion !== 'receta') {
      Alert.alert('Selección requerida', 'Debes agregar al menos un medicamento al pedido.');
      return;
    }
    if (modoSeleccion === 'receta' && !imagenUri) {
      Alert.alert('Receta requerida', 'Debes tomar una foto o seleccionar la imagen de tu receta.');
      return;
    }
    if (requiereRecetaObligatoria && !imagenUri) {
      Alert.alert(
        'Receta Médica Obligatoria',
        'Uno o más medicamentos seleccionados requieren receta médica. Por favor adjunta la fotografía de tu receta.'
      );
      return;
    }
    if (!medicamentos.length) {
      setMedicamentos([{ nombre: '', cantidad: 1, requiereReceta: true }]);
    }
    setPaso(2);
  };

  const avanzarDesdePaso2 = () => {
    const invalidos = medicamentos.filter((m) => !m.nombre.trim());
    if (invalidos.length > 0) {
      Alert.alert('Datos incompletos', 'Todos los medicamentos deben tener un nombre válido.');
      return;
    }
    if (!medicamentos.length) {
      Alert.alert('Sin medicamentos', 'Debes incluir al menos un medicamento en tu pedido.');
      return;
    }
    setPaso(3);
  };

  const avanzarDesdePaso3 = () => {
    if (modoEntrega === 'domicilio' && !perfil?.direcciones?.length) {
      Alert.alert('Dirección requerida', 'Debes registrar al menos una dirección en tu perfil para entrega a domicilio.');
      return;
    }
    setPaso(4);
  };

  const enviarSolicitud = async () => {
    if (!perfil?.uid) {
      Alert.alert('Sesión expirada', 'Inicia sesión de nuevo.');
      return;
    }

    try {
      setLoading(true);

      let recetaId: string | null = null;
      let recetaUrl: string | null = null;

      // 1. Subir receta médica vía PrescriptionService (Object Storage Supabase)
      if (imagenUri) {
        const recetaCreada = await prescriptionService.crearReceta(perfil.uid, imagenUri, {
          textoCrudo: ocrTexto,
          medicamentosDetectados: ocrMedicamentos,
        });
        recetaId = recetaCreada.id;
        recetaUrl = recetaCreada.urlTemporal ?? recetaCreada.storagePath;
      }

      // 2. Crear pedido con snapshots inmutables
      const direccionEntrega: Direccion | undefined =
        modoEntrega === 'domicilio' ? perfil.direcciones?.[indiceDireccion] : undefined;

      await orderService.crearPedido({
        usuarioId: perfil.uid,
        medicamentos,
        modoEntrega,
        ciudad: perfil.ciudad ?? '',
        direccionEntrega,
        recetaId,
        recetaUrl,
        origenSolicitud: modoSeleccion === 'receta' ? 'ocr' : 'manual',
        recetaOCRData: {
          tieneImagen: Boolean(imagenUri),
          ocrValido: Boolean(ocrMedicamentos.length),
        },
      });

      Alert.alert('¡Pedido Registrado!', 'Tu solicitud ha sido creada y enviada a la farmacia con éxito.', [
        {
          text: 'Entendido',
          onPress: () => {
            setPaso(1);
            setMedicamentos([]);
            setImagenUri(null);
            setImagenBase64('');
            setOcrTexto('');
            setOcrMedicamentos([]);
          },
        },
      ]);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'No fue posible registrar tu pedido.';
      Alert.alert('Error al crear solicitud', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      {/* Indicador de Pasos */}
      <View
        style={[
          styles.pasosHeader,
          { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.borderLight },
        ]}
      >
        {[
          ['1', 'Selección'],
          ['2', 'Revisión'],
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
          kicker="Farma Ya Digital"
          title="Nueva Solicitud"
          subtitle="Consulta el catálogo, fotografía tu fórmula médica o ingresa tus medicamentos fácilmente."
        />

        {/* PASO 1: SELECCIÓN Y CARGA */}
        {paso === 1 ? (
          <View style={styles.pasoContainer}>
            {/* Modalidad de Selección */}
            <View style={styles.toggleCardsWrap}>
              <TouchableOpacity
                style={[
                  styles.toggleCard,
                  {
                    backgroundColor:
                      modoSeleccion === 'catalogo'
                        ? theme.colors.primaryLight
                        : theme.colors.surfaceSecondary,
                    borderColor:
                      modoSeleccion === 'catalogo' ? theme.colors.primary : theme.colors.borderLight,
                  },
                ]}
                onPress={() => setModoSeleccion('catalogo')}
              >
                <Ionicons
                  name="grid"
                  size={20}
                  color={modoSeleccion === 'catalogo' ? theme.colors.primary : theme.colors.textSecondary}
                />
                <Text style={[styles.toggleTitle, { color: theme.colors.text }]}>Catálogo</Text>
                <Text style={[styles.toggleSub, { color: theme.colors.textSecondary }]}>
                  Explora medicamentos disponibles en sede
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.toggleCard,
                  {
                    backgroundColor:
                      modoSeleccion === 'receta'
                        ? theme.colors.primaryLight
                        : theme.colors.surfaceSecondary,
                    borderColor:
                      modoSeleccion === 'receta' ? theme.colors.primary : theme.colors.borderLight,
                  },
                ]}
                onPress={() => setModoSeleccion('receta')}
              >
                <Ionicons
                  name="document-text"
                  size={20}
                  color={modoSeleccion === 'receta' ? theme.colors.primary : theme.colors.textSecondary}
                />
                <Text style={[styles.toggleTitle, { color: theme.colors.text }]}>Foto Receta</Text>
                <Text style={[styles.toggleSub, { color: theme.colors.textSecondary }]}>
                  Foto/OCR de fórmula médica
                </Text>
              </TouchableOpacity>
            </View>

            {/* SECCIÓN CATÁLOGO */}
            {modoSeleccion === 'catalogo' ? (
              <Card>
                <Text style={[styles.subtituloSeccion, { color: theme.colors.text }]}>
                  Buscar en el catálogo
                </Text>

                <TextInput
                  style={[
                    styles.searchInput,
                    {
                      backgroundColor: theme.colors.inputBg,
                      borderColor: theme.colors.inputBorder,
                      color: theme.colors.inputText,
                    },
                  ]}
                  value={busquedaCatalogo}
                  onChangeText={setBusquedaCatalogo}
                  placeholder="Buscar por nombre o principio activo..."
                  placeholderTextColor={theme.colors.inputPlaceholder}
                />

                {cargandoCatalogo ? (
                  <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 16 }} />
                ) : catalogoFiltrado.length === 0 ? (
                  <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                    No se encontraron medicamentos disponibles.
                  </Text>
                ) : (
                  <View style={styles.medsList}>
                    {catalogoFiltrado.slice(0, 10).map((item) => {
                      const agregado = medicamentos.find((m) => m.medicamentoId === item.id);
                      return (
                        <View
                          key={item.id}
                          style={[
                            styles.catalogoItem,
                            {
                              backgroundColor: theme.colors.surfaceSecondary,
                              borderColor: theme.colors.border,
                            },
                          ]}
                        >
                          <View style={{ flex: 1, gap: 3 }}>
                            <Text style={[styles.medNombre, { color: theme.colors.text }]}>
                              {item.nombre}
                            </Text>
                            {item.principioActivo || item.concentracion ? (
                              <Text style={[styles.medSub, { color: theme.colors.textSecondary }]}>
                                {[item.principioActivo, item.concentracion, item.presentacion]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </Text>
                            ) : null}

                            <View style={styles.badgesRow}>
                              <StockIndicator stock={item.stock} stockMinimo={item.stockMinimo} />
                              {item.requiereReceta ? (
                                <View
                                  style={[
                                    styles.rxBadge,
                                    { backgroundColor: theme.colors.errorBg, borderColor: theme.colors.error },
                                  ]}
                                >
                                  <Text style={[styles.rxText, { color: theme.colors.errorText }]}>
                                    Requiere Receta
                                  </Text>
                                </View>
                              ) : (
                                <View
                                  style={[
                                    styles.rxBadge,
                                    { backgroundColor: theme.colors.successBg, borderColor: theme.colors.success },
                                  ]}
                                >
                                  <Text style={[styles.rxText, { color: theme.colors.successText }]}>
                                    Venta Libre
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>

                          <TouchableOpacity
                            style={[
                              styles.btnAgregar,
                              {
                                backgroundColor:
                                  item.stock <= 0
                                    ? theme.colors.border
                                    : agregado
                                    ? theme.colors.primary
                                    : theme.colors.surface,
                                borderColor: theme.colors.primary,
                              },
                            ]}
                            disabled={item.stock <= 0}
                            onPress={() => agregarDesdeCatalogo(item)}
                          >
                            <Text
                              style={[
                                styles.btnAgregarTexto,
                                {
                                  color:
                                    item.stock <= 0
                                      ? theme.colors.textMuted
                                      : agregado
                                      ? '#ffffff'
                                      : theme.colors.primary,
                                },
                              ]}
                            >
                              {agregado ? `Agregado (${agregado.cantidad})` : '+ Agregar'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}
              </Card>
            ) : null}

            {/* SECCIÓN ADJUNTAR RECETA (Si se selecciona o si es obligatoria) */}
            {modoSeleccion === 'receta' || requiereRecetaObligatoria ? (
              <Card>
                <View style={styles.seccionHeader}>
                  <Ionicons name="camera" size={20} color={theme.colors.primary} />
                  <Text style={[styles.subtituloSeccion, { color: theme.colors.text }]}>
                    Receta Médica {requiereRecetaObligatoria ? '(Obligatoria)' : '(Opcional)'}
                  </Text>
                </View>

                <Text style={[styles.texto, { color: theme.colors.textSecondary }]}>
                  Toma una foto clara o sube una imagen de la fórmula médica para que el despachador pueda validarla.
                </Text>

                <View style={styles.filaBotones}>
                  <View style={styles.botonFlex}>
                    <Button texto="Tomar Foto" onPress={() => seleccionarImagen(true)} />
                  </View>
                  <View style={styles.botonFlex}>
                    <Button
                      texto="Elegir Galería"
                      onPress={() => seleccionarImagen(false)}
                      variant="secundario"
                    />
                  </View>
                </View>

                {procesandoOcr ? (
                  <View style={styles.ocrLoading}>
                    <ActivityIndicator color={theme.colors.primary} />
                    <Text style={[styles.texto, { color: theme.colors.textSecondary }]}>
                      Extrayendo datos de la receta con OCR...
                    </Text>
                  </View>
                ) : null}

                {imagenUri ? (
                  <View style={styles.previewWrap}>
                    <Image
                      source={{ uri: imagenUri }}
                      style={[styles.preview, { borderColor: theme.colors.border }]}
                    />
                    <View style={styles.previewAcciones}>
                      <Button texto="Reemplazar" onPress={() => seleccionarImagen(false)} variant="secundario" />
                      <Button texto="Eliminar" onPress={eliminarImagen} variant="peligro" />
                    </View>
                  </View>
                ) : null}
              </Card>
            ) : null}

            {/* Resumen Medicamentos Seleccionados */}
            {medicamentos.length > 0 ? (
              <Card>
                <Text style={[styles.subtituloSeccion, { color: theme.colors.text }]}>
                  Medicamentos en tu pedido ({medicamentos.length})
                </Text>
                {medicamentos.map((m, idx) => (
                  <View key={idx} style={styles.rowResumenMed}>
                    <Text style={[styles.medNombre, { color: theme.colors.text }]}>
                      {m.nombre || 'Medicamento sin nombre'} x{m.cantidad}
                    </Text>
                    <TouchableOpacity onPress={() => quitarMedicamento(idx)}>
                      <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </Card>
            ) : null}

            <View style={styles.accionPrincipal}>
              <Button texto="Continuar a Revisión" onPress={avanzarDesdePaso1} />
            </View>
          </View>
        ) : null}

        {/* PASO 2: REVISIÓN Y AJUSTE DE MEDICAMENTOS */}
        {paso === 2 ? (
          <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <Card>
              <Text style={[styles.subtituloSeccion, { color: theme.colors.text }]}>
                Revisión de Medicamentos
              </Text>
              <Text style={[styles.texto, { color: theme.colors.textSecondary }]}>
                Verifica los nombres, presentaciones y cantidades que deseas solicitar.
              </Text>

              <View style={styles.formList}>
                {medicamentos.map((med, index) => (
                  <View
                    key={index}
                    style={[
                      styles.medEditCard,
                      {
                        backgroundColor: theme.colors.surfaceSecondary,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <View style={styles.medCardHeader}>
                      <Text style={[styles.medEditTitle, { color: theme.colors.text }]}>
                        Medicamento #{index + 1}
                      </Text>
                      {medicamentos.length > 1 ? (
                        <TouchableOpacity onPress={() => quitarMedicamento(index)}>
                          <Ionicons name="close-circle" size={22} color={theme.colors.error} />
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    <Input
                      label="Nombre del Medicamento"
                      value={med.nombre}
                      onChangeText={(val) => actualizarMedicamento(index, 'nombre', val)}
                      placeholder="Ej: Amoxicilina 500mg"
                    />

                    <View style={styles.rowInputs}>
                      <View style={{ flex: 1 }}>
                        <Input
                          label="Dosis / Presentación"
                          value={med.concentracion ?? med.dosis ?? ''}
                          onChangeText={(val) => actualizarMedicamento(index, 'concentracion', val)}
                          placeholder="Ej: Cada 8 horas / 500mg"
                        />
                      </View>
                      <View style={{ width: 100 }}>
                        <Input
                          label="Cantidad"
                          value={String(med.cantidad)}
                          keyboardType="numeric"
                          onChangeText={(val) => {
                            const cant = Math.max(1, parseInt(val.replace(/\D/g, '') || '1', 10));
                            actualizarMedicamento(index, 'cantidad', cant);
                          }}
                        />
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              <Button
                texto="+ Agregar Otro Medicamento"
                onPress={agregarMedicamentoManual}
                variant="secundario"
              />

              <View style={styles.filaBotones}>
                <View style={styles.botonFlex}>
                  <Button texto="Atrás" onPress={() => setPaso(1)} variant="secundario" />
                </View>
                <View style={styles.botonFlex}>
                  <Button texto="Continuar" onPress={avanzarDesdePaso2} />
                </View>
              </View>
            </Card>
          </TouchableWithoutFeedback>
        ) : null}

        {/* PASO 3: ENTREGA */}
        {paso === 3 ? (
          <Card>
            <Text style={[styles.subtituloSeccion, { color: theme.colors.text }]}>
              Modo de Entrega
            </Text>

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
                <Ionicons
                  name="bicycle"
                  size={20}
                  color={modoEntrega === 'domicilio' ? theme.colors.primary : theme.colors.textSecondary}
                />
                <Text style={[styles.toggleTitle, { color: theme.colors.text }]}>A Domicilio</Text>
                <Text style={[styles.toggleSub, { color: theme.colors.textSecondary }]}>
                  Envío a tu dirección registrada
                </Text>
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
                <Ionicons
                  name="storefront"
                  size={20}
                  color={modoEntrega === 'recogida' ? theme.colors.primary : theme.colors.textSecondary}
                />
                <Text style={[styles.toggleTitle, { color: theme.colors.text }]}>Recoger en Sede</Text>
                <Text style={[styles.toggleSub, { color: theme.colors.textSecondary }]}>
                  Retira directamente en la farmacia
                </Text>
              </TouchableOpacity>
            </View>

            {modoEntrega === 'domicilio' ? (
              <View style={styles.direccionBox}>
                <Text style={[styles.texto, { color: theme.colors.textSecondary }]}>
                  Dirección de Entrega
                </Text>
                {!perfil?.direcciones?.length ? (
                  <Text style={[styles.texto, { color: theme.colors.errorText }]}>
                    No tienes direcciones registradas. Por favor agrega una en tu Perfil.
                  </Text>
                ) : (
                  perfil.direcciones.map((dir, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.toggleCard,
                        {
                          backgroundColor:
                            indiceDireccion === idx
                              ? theme.colors.primaryLight
                              : theme.colors.surfaceSecondary,
                          borderColor:
                            indiceDireccion === idx ? theme.colors.primary : theme.colors.borderLight,
                        },
                      ]}
                      onPress={() => setIndiceDireccion(idx)}
                    >
                      <Text style={[styles.toggleTitle, { color: theme.colors.text }]}>
                        {dir.etiqueta || `Dirección #${idx + 1}`}
                      </Text>
                      <Text style={[styles.toggleSub, { color: theme.colors.textSecondary }]}>
                        {dir.direccion} ({dir.ciudad || perfil.ciudad})
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            ) : (
              <View style={styles.direccionBox}>
                <Text style={[styles.texto, { color: theme.colors.textSecondary }]}>
                  Sede de recogida asignada: {perfil?.ciudad ?? 'Sede Principal Farma Ya'}
                </Text>
              </View>
            )}

            <View style={styles.filaBotones}>
              <View style={styles.botonFlex}>
                <Button texto="Atrás" onPress={() => setPaso(2)} variant="secundario" />
              </View>
              <View style={styles.botonFlex}>
                <Button texto="Revisar Pedido" onPress={avanzarDesdePaso3} />
              </View>
            </View>
          </Card>
        ) : null}

        {/* PASO 4: CONFIRMACIÓN Y ENVÍO */}
        {paso === 4 ? (
          <Card>
            <Text style={[styles.subtituloSeccion, { color: theme.colors.text }]}>
              Resumen y Confirmación
            </Text>

            <View style={styles.resumenWrap}>
              <View style={styles.resumenItem}>
                <Text style={[styles.resumenLabel, { color: theme.colors.textSecondary }]}>
                  Modo de Entrega:
                </Text>
                <Text style={[styles.resumenValor, { color: theme.colors.text }]}>
                  {modoEntrega === 'domicilio' ? 'Entrega a Domicilio' : 'Recogida en Sede'}
                </Text>
              </View>

              {modoEntrega === 'domicilio' && perfil?.direcciones?.[indiceDireccion] ? (
                <View style={styles.resumenItem}>
                  <Text style={[styles.resumenLabel, { color: theme.colors.textSecondary }]}>
                    Dirección:
                  </Text>
                  <Text style={[styles.resumenValor, { color: theme.colors.text }]}>
                    {perfil.direcciones[indiceDireccion].direccion}
                  </Text>
                </View>
              ) : null}

              <View style={styles.resumenItem}>
                <Text style={[styles.resumenLabel, { color: theme.colors.textSecondary }]}>
                  Receta Médica:
                </Text>
                <Text
                  style={[
                    styles.resumenValor,
                    { color: imagenUri ? theme.colors.successText : theme.colors.textMuted },
                  ]}
                >
                  {imagenUri ? 'Adjunta (Almacenamiento seguro)' : 'No requerida'}
                </Text>
              </View>

              <Text style={[styles.resumenLabel, { color: theme.colors.textSecondary, marginTop: 6 }]}>
                Medicamentos Solicitados:
              </Text>
              <View style={styles.medsConfirmList}>
                {medicamentos.map((m, i) => (
                  <View key={i} style={styles.medConfirmRow}>
                    <Text style={[styles.medNombre, { color: theme.colors.text }]}>
                      • {m.nombre}
                    </Text>
                    <Text style={[styles.medSub, { color: theme.colors.textSecondary }]}>
                      Cantidad: {m.cantidad}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.accionPrincipal}>
              <Button texto="Confirmar y Enviar Solicitud" onPress={enviarSolicitud} loading={loading} />
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
  pasoContainer: {
    gap: 14,
  },
  subtituloSeccion: {
    fontSize: 16,
    fontWeight: '700',
  },
  texto: {
    fontSize: 13,
    lineHeight: 18,
  },
  searchInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    marginTop: 8,
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 14,
    fontSize: 13,
  },
  medsList: {
    gap: 8,
    marginTop: 10,
  },
  catalogoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  medNombre: {
    fontSize: 14,
    fontWeight: '700',
  },
  medSub: {
    fontSize: 12,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  rxBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  rxText: {
    fontSize: 10,
    fontWeight: '700',
  },
  btnAgregar: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  btnAgregarTexto: {
    fontSize: 12,
    fontWeight: '700',
  },
  seccionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filaBotones: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 10,
  },
  botonFlex: {
    flex: 1,
  },
  accionPrincipal: {
    marginTop: 12,
  },
  botonAtrasSolo: {
    marginTop: 8,
  },
  previewWrap: {
    marginTop: 10,
    gap: 8,
  },
  preview: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    borderWidth: 1,
  },
  previewAcciones: {
    flexDirection: 'row',
    gap: 8,
  },
  ocrLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  rowResumenMed: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  toggleCardsWrap: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  toggleTitle: {
    fontWeight: '700',
    fontSize: 14,
  },
  toggleSub: {
    fontSize: 12,
  },
  formList: {
    gap: 10,
    marginVertical: 10,
  },
  medEditCard: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  medCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  medEditTitle: {
    fontWeight: '700',
    fontSize: 13,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 8,
  },
  direccionBox: {
    gap: 8,
    marginTop: 12,
  },
  resumenWrap: {
    gap: 8,
    marginTop: 10,
  },
  resumenItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  resumenLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  resumenValor: {
    fontSize: 13,
    fontWeight: '700',
  },
  medsConfirmList: {
    gap: 4,
    paddingLeft: 4,
  },
  medConfirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
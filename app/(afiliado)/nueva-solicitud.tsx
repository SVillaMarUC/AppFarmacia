import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { medicationService } from '@/services/medication.service';
import { prescriptionService } from '@/services/prescription.service';
import { orderService } from '@/services/order.service';
import { CatalogoPicker } from '@/components/solicitud/CatalogoPicker';
import { RecetaUploader } from '@/components/solicitud/RecetaUploader';
import { MedicamentoListEditor } from '@/components/solicitud/MedicamentoListEditor';
import { DireccionSelector } from '@/components/solicitud/DireccionSelector';
import { ResumenSolicitud } from '@/components/solicitud/ResumenSolicitud';
import type { ItemInventario, Medicamento, RecetaOCRItem } from '@/types';

export default function NuevaSolicitudScreen() {
  const router = useRouter();
  const { perfil } = useAuth();
  const { theme } = useTheme();

  // Pasos: 1. Selección / Receta, 2. Detalle y Cantidades, 3. Entrega, 4. Confirmar
  const [paso, setPaso] = useState(1);
  const [modoSeleccion, setModoSeleccion] = useState<'catalogo' | 'receta' | 'manual'>('catalogo');

  // Catálogo
  const [catalogo, setCatalogo] = useState<ItemInventario[]>([]);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true);

  // Receta Médica
  const [imagenUri, setImagenUri] = useState<string | null>(null);
  const [ocrMedicamentos, setOcrMedicamentos] = useState<RecetaOCRItem[]>([]);
  const [procesandoOcr, setProcesandoOcr] = useState(false);

  // Lista de Medicamentos
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
        console.error('[NuevaSolicitud] Error al cargar catálogo:', err);
      } finally {
        if (montado) setCargandoCatalogo(false);
      }
    };
    cargar();
    return () => {
      montado = false;
    };
  }, []);

  const requiereRecetaObligatoria = useMemo(() => {
    return medicamentos.some((m) => m.requiereReceta) || modoSeleccion === 'receta';
  }, [medicamentos, modoSeleccion]);

  // Manejadores de Medicamentos
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

  const actualizarCantidad = (index: number, delta: number) => {
    setMedicamentos((prev) =>
      prev
        .map((m, i) => {
          if (i === index) {
            const nuevaCant = m.cantidad + delta;
            return nuevaCant > 0 ? { ...m, cantidad: nuevaCant } : null;
          }
          return m;
        })
        .filter(Boolean) as Medicamento[]
    );
  };

  const eliminarMedicamento = (index: number) => {
    setMedicamentos((prev) => prev.filter((_, i) => i !== index));
  };

  const agregarManual = (nuevoMed: Medicamento) => {
    setMedicamentos((prev) => [...prev, nuevoMed]);
  };

  // Enviar Pedido Final
  const enviarSolicitud = async () => {
    if (!perfil?.uid) {
      Alert.alert('Sesión requerida', 'Debes iniciar sesión para radicar un pedido.');
      return;
    }

    if (medicamentos.length === 0) {
      Alert.alert('Pedido vacío', 'Debes incluir al menos un medicamento en tu solicitud.');
      return;
    }

    if (requiereRecetaObligatoria && !imagenUri) {
      Alert.alert(
        'Fórmula médica obligatoria',
        'Uno o más medicamentos de tu solicitud requieren fórmula médica. Por favor adjunta la foto de tu receta en el paso 1.'
      );
      return;
    }

    try {
      setLoading(true);
      let recetaId: string | null = null;

      // 1. Si hay imagen de receta, crear registro de receta y subir a storage
      if (imagenUri) {
        const nuevaReceta = await prescriptionService.crearReceta(perfil.uid, imagenUri, {
          medicamentosDetectados: ocrMedicamentos,
        });
        recetaId = nuevaReceta.id;
      }

      // 2. Resolver dirección de entrega
      const direccionSeleccionada =
        modoEntrega === 'domicilio' && perfil.direcciones && perfil.direcciones.length > 0
          ? perfil.direcciones[indiceDireccion] || perfil.direcciones[0]
          : undefined;

      // 3. Crear pedido inmutable en Firestore
      const nuevoPedidoId = await orderService.crearPedido({
        usuarioId: perfil.uid,
        medicamentos,
        modoEntrega,
        ciudad: perfil.ciudad || 'Bogotá',
        direccionEntrega: direccionSeleccionada,
        recetaId: recetaId || undefined,
        origenSolicitud: modoSeleccion === 'receta' ? 'ocr' : 'manual',
      });

      Alert.alert(
        '¡Solicitud Exitosa!',
        `Tu pedido #${nuevoPedidoId.slice(0, 6)} ha sido radicado correctamente. Puedes hacerle seguimiento en tiempo real.`,
        [
          {
            text: 'Ver Rastreo',
            onPress: () => router.push('/(afiliado)/rastreo'),
          },
        ]
      );
    } catch (error) {
      console.error('[NuevaSolicitud] Error al enviar:', error);
      const msg = error instanceof Error ? error.message : 'No fue posible radicar tu solicitud.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <ScreenHeader
            kicker="EPS • Solicitud Digital"
            title="Nueva Solicitud"
            subtitle="Paso a paso para radicar y recibir tus medicamentos autorizados."
          />

          {/* Stepper Superior */}
          <View style={styles.stepperRow}>
            {[
              { num: 1, label: 'Selección' },
              { num: 2, label: 'Cantidades' },
              { num: 3, label: 'Entrega' },
              { num: 4, label: 'Confirmar' },
            ].map((s) => {
              const activo = paso === s.num;
              const completado = paso > s.num;
              return (
                <View key={s.num} style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepCircle,
                      {
                        backgroundColor: activo
                          ? theme.colors.primary
                          : completado
                          ? theme.colors.successText
                          : theme.colors.surfaceSecondary,
                        borderColor: activo || completado ? 'transparent' : theme.colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.stepNum,
                        { color: activo || completado ? '#ffffff' : theme.colors.textSecondary },
                      ]}
                    >
                      {completado ? '✓' : s.num}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      {
                        color: activo ? theme.colors.primary : theme.colors.textSecondary,
                        fontWeight: activo ? '700' : '500',
                      },
                    ]}
                  >
                    {s.label}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* PASO 1: Selección / Receta */}
          {paso === 1 && (
            <View style={styles.pasoContainer}>
              {/* Selector de Modo */}
              <Card>
                <View style={styles.modoRow}>
                  <TouchableOpacity
                    style={[
                      styles.modoPill,
                      {
                        backgroundColor:
                          modoSeleccion === 'catalogo' ? theme.colors.primary : theme.colors.surfaceSecondary,
                      },
                    ]}
                    onPress={() => setModoSeleccion('catalogo')}
                  >
                    <Ionicons
                      name="medkit"
                      size={16}
                      color={modoSeleccion === 'catalogo' ? '#ffffff' : theme.colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.modoPillText,
                        { color: modoSeleccion === 'catalogo' ? '#ffffff' : theme.colors.textSecondary },
                      ]}
                    >
                      Catálogo EPS
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modoPill,
                      {
                        backgroundColor:
                          modoSeleccion === 'receta' ? theme.colors.primary : theme.colors.surfaceSecondary,
                      },
                    ]}
                    onPress={() => setModoSeleccion('receta')}
                  >
                    <Ionicons
                      name="document-text"
                      size={16}
                      color={modoSeleccion === 'receta' ? '#ffffff' : theme.colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.modoPillText,
                        { color: modoSeleccion === 'receta' ? '#ffffff' : theme.colors.textSecondary },
                      ]}
                    >
                      Subir Receta (OCR)
                    </Text>
                  </TouchableOpacity>
                </View>
              </Card>

              {modoSeleccion === 'catalogo' && (
                <CatalogoPicker
                  catalogo={catalogo}
                  cargando={cargandoCatalogo}
                  medicamentosSeleccionados={medicamentos}
                  onAgregar={agregarDesdeCatalogo}
                />
              )}

              {modoSeleccion === 'receta' && (
                <RecetaUploader
                  imagenUri={imagenUri}
                  onImagenCapturada={(uri) => setImagenUri(uri)}
                  onEliminarImagen={() => {
                    setImagenUri(null);
                    setOcrMedicamentos([]);
                  }}
                  onMedicamentosExtraidos={(meds) => setMedicamentos(meds)}
                  procesandoOcr={procesandoOcr}
                  setProcesandoOcr={setProcesandoOcr}
                  ocrMedicamentos={ocrMedicamentos}
                  setOcrMedicamentos={setOcrMedicamentos}
                />
              )}
            </View>
          )}

          {/* PASO 2: Cantidades y Ajuste */}
          {paso === 2 && (
            <View style={styles.pasoContainer}>
              <MedicamentoListEditor
                medicamentos={medicamentos}
                onActualizarCantidad={actualizarCantidad}
                onEliminar={eliminarMedicamento}
                onAgregarManual={agregarManual}
              />
            </View>
          )}

          {/* PASO 3: Entrega */}
          {paso === 3 && (
            <View style={styles.pasoContainer}>
              <DireccionSelector
                modoEntrega={modoEntrega}
                setModoEntrega={setModoEntrega}
                direcciones={perfil?.direcciones || []}
                indiceDireccion={indiceDireccion}
                setIndiceDireccion={setIndiceDireccion}
              />
            </View>
          )}

          {/* PASO 4: Confirmación y Envío */}
          {paso === 4 && (
            <View style={styles.pasoContainer}>
              <ResumenSolicitud
                perfil={perfil}
                medicamentos={medicamentos}
                modoEntrega={modoEntrega}
                direccionSeleccionada={
                  perfil?.direcciones && perfil.direcciones.length > 0
                    ? perfil.direcciones[indiceDireccion]
                    : undefined
                }
                imagenUri={imagenUri}
                requiereReceta={requiereRecetaObligatoria}
              />
            </View>
          )}

          {/* Botones de Navegación de Pasos */}
          <View style={styles.navButtonsRow}>
            {paso > 1 && (
              <Button
                texto="Atrás"
                onPress={() => setPaso((prev) => prev - 1)}
                variant="secundario"
              />
            )}
            {paso < 4 ? (
              <Button
                texto={`Continuar (${medicamentos.length} meds)`}
                onPress={() => {
                  if (medicamentos.length === 0 && paso === 1) {
                    Alert.alert(
                      'Sin medicamentos',
                      'Selecciona al menos un medicamento del catálogo o sube tu fórmula médica.'
                    );
                    return;
                  }
                  setPaso((prev) => prev + 1);
                }}
              />
            ) : (
              <Button
                texto="Radicar Solicitud"
                onPress={enviarSolicitud}
                loading={loading}
              />
            )}
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginVertical: 4,
  },
  stepItem: { alignItems: 'center', gap: 4 },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  stepNum: { fontSize: 12, fontWeight: '700' },
  stepLabel: { fontSize: 11 },
  pasoContainer: { gap: 12 },
  modoRow: { flexDirection: 'row', gap: 8 },
  modoPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modoPillText: { fontSize: 13, fontWeight: '700' },
  navButtonsRow: { gap: 10, marginTop: 10 },
});
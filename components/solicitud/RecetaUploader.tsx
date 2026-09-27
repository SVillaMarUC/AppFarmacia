import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/context/ThemeContext';
import { ocrService } from '@/services/ocr.service';
import type { Medicamento, RecetaOCRItem } from '@/types';

interface RecetaUploaderProps {
  imagenUri: string | null;
  onImagenCapturada: (uri: string, base64: string) => void;
  onEliminarImagen: () => void;
  onMedicamentosExtraidos: (meds: Medicamento[]) => void;
  procesandoOcr: boolean;
  setProcesandoOcr: (val: boolean) => void;
  ocrMedicamentos: RecetaOCRItem[];
  setOcrMedicamentos: (items: RecetaOCRItem[]) => void;
}

export function RecetaUploader({
  imagenUri,
  onImagenCapturada,
  onEliminarImagen,
  onMedicamentosExtraidos,
  procesandoOcr,
  setProcesandoOcr,
  ocrMedicamentos,
  setOcrMedicamentos,
}: RecetaUploaderProps) {
  const { theme } = useTheme();

  const seleccionarImagen = async (desdeCamara: boolean) => {
    try {
      if (Platform.OS !== 'web') {
        const permiso = desdeCamara
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (permiso.status !== ImagePicker.PermissionStatus.GRANTED) {
          Alert.alert(
            'Permiso requerido',
            'Se requiere acceso a la cámara/galería para procesar tu receta médica.'
          );
          return;
        }
      }

      const result =
        desdeCamara && Platform.OS !== 'web'
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
      onImagenCapturada(asset.uri, asset.base64 ?? '');

      if (asset.base64) {
        setProcesandoOcr(true);
        try {
          const resOcr = await ocrService.procesarReceta(asset.base64);
          setOcrMedicamentos(resOcr.medicamentosDetectados);

          if (resOcr.medicamentosDetectados.length > 0) {
            const nuevosMeds: Medicamento[] = resOcr.medicamentosDetectados.map((item) => ({
              nombre: item.nombre,
              concentracion: item.concentracion,
              dosis: item.dosis,
              cantidad: item.cantidad || 1,
              requiereReceta: true,
            }));
            onMedicamentosExtraidos(nuevosMeds);
          }
        } catch (ocrErr) {
          console.warn('[RecetaUploader] OCR Error:', ocrErr);
        } finally {
          setProcesandoOcr(false);
        }
      }
    } catch (error) {
      console.error('[RecetaUploader] Captura Error:', error);
      Alert.alert('Error', 'No se pudo cargar la imagen seleccionada.');
    }
  };

  return (
    <Card>
      <View style={styles.block}>
        <Text style={[styles.titulo, { color: theme.colors.text }]}>
          Foto de la Fórmula / Receta Médica
        </Text>
        <Text style={[styles.subtitulo, { color: theme.colors.textSecondary }]}>
          Sube una foto clara de tu fórmula médica. Nuestro motor gratuito extraerá automáticamente
          los medicamentos y dosis.
        </Text>

        {imagenUri ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: imagenUri }} style={styles.previewImage} />
            <TouchableOpacity
              style={[styles.removeBtn, { backgroundColor: theme.colors.error }]}
              onPress={onEliminarImagen}
            >
              <Ionicons name="trash-outline" size={16} color="#ffffff" />
              <Text style={styles.removeBtnText}>Eliminar Imagen</Text>
            </TouchableOpacity>

            {procesandoOcr ? (
              <View style={styles.ocrLoading}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
                  Analizando receta con OCR heurístico gratuito...
                </Text>
              </View>
            ) : ocrMedicamentos.length > 0 ? (
              <View
                style={[
                  styles.ocrSuccessBox,
                  {
                    backgroundColor: theme.colors.successBg,
                    borderColor: theme.colors.success,
                  },
                ]}
              >
                <Ionicons name="checkmark-circle" size={18} color={theme.colors.successText} />
                <Text style={[styles.ocrSuccessText, { color: theme.colors.successText }]}>
                  {ocrMedicamentos.length} medicamentos detectados automáticamente
                </Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.buttonsRow}>
            <Pressable
              style={[
                styles.actionBtn,
                {
                  backgroundColor: theme.colors.primaryLight,
                  borderColor: theme.colors.primary,
                },
              ]}
              onPress={() => seleccionarImagen(true)}
            >
              <Ionicons name="camera-outline" size={24} color={theme.colors.primary} />
              <Text style={[styles.actionBtnText, { color: theme.colors.primary }]}>
                Tomar Foto
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.actionBtn,
                {
                  backgroundColor: theme.colors.surfaceSecondary,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => seleccionarImagen(false)}
            >
              <Ionicons name="image-outline" size={24} color={theme.colors.textSecondary} />
              <Text style={[styles.actionBtnText, { color: theme.colors.text }]}>
                Abrir Galería
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  block: { gap: 10 },
  titulo: { fontSize: 16, fontWeight: '700' },
  subtitulo: { fontSize: 13, lineHeight: 18 },
  buttonsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionBtnText: { fontSize: 13, fontWeight: '700' },
  previewContainer: { gap: 10, alignItems: 'center', marginTop: 4 },
  previewImage: { width: '100%', height: 200, borderRadius: 12, resizeMode: 'contain' },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  removeBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
  ocrLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8 },
  ocrSuccessBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    width: '100%',
  },
  ocrSuccessText: { fontSize: 12, fontWeight: '700' },
});

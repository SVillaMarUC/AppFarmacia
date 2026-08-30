import Constants from 'expo-constants';
import type { RecetaOCRItem } from '@/types';

type ResultadoOCR = {
  textoCrudo: string;
  medicamentosDetectados: RecetaOCRItem[];
};

const extra = Constants.expoConfig?.extra as
  | { googleMapsApiKey?: string; googleVisionApiKey?: string; disableGoogleVision?: string }
  | undefined;
const visionDeshabilitado = String(extra?.disableGoogleVision ?? '').toLowerCase() === 'true';

export const ocrService = {
  async procesarReceta(imageBase64: string): Promise<ResultadoOCR> {
    try {
      if (!imageBase64) {
        return {
          textoCrudo: '',
          medicamentosDetectados: [],
        };
      }

      if (visionDeshabilitado) {
        return {
          textoCrudo: 'OCR deshabilitado en configuración de entorno.',
          medicamentosDetectados: [],
        };
      }

      const apiKey = extra?.googleVisionApiKey?.trim() || process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY?.trim();
      if (!apiKey || !apiKey.startsWith('AIza')) {
        return {
          textoCrudo: 'OCR no disponible (API Key de Google Vision no configurada). Puedes ingresar los medicamentos manualmente.',
          medicamentosDetectados: [],
        };
      }

      const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: { content: imageBase64 },
              features: [{ type: 'TEXT_DETECTION' }],
            },
          ],
        }),
      });

      if (!response.ok) {
        console.warn('[OCR Service] Error respuesta Vision API:', response.status);
        return {
          textoCrudo: 'No fue posible conectar con el servicio OCR.',
          medicamentosDetectados: [],
        };
      }

      const data = (await response.json()) as {
        responses?: Array<{ fullTextAnnotation?: { text?: string } }>;
      };

      const texto = data.responses?.[0]?.fullTextAnnotation?.text ?? '';
      const lineas = texto
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 2)
        .slice(0, 10);

      // Intento de extracción de cantidad o dosis básica
      const medicamentosDetectados: RecetaOCRItem[] = lineas.map((linea) => {
        // Intentar detectar si hay un número de cantidad como "x 30" o "# 20"
        const matchCantidad = linea.match(/[x#]\s*(\d+)/i) || linea.match(/cantidad:?\s*(\d+)/i);
        const cantidad = matchCantidad ? Math.max(1, parseInt(matchCantidad[1], 10)) : 1;

        // Intentar detectar concentración como "500mg" o "100 mg"
        const matchConcentracion = linea.match(/(\d+\s*(?:mg|g|ml|mcg|ui|%))/i);
        const concentracion = matchConcentracion ? matchConcentracion[0] : undefined;

        // Limpiar nombre
        let nombreLimpio = linea
          .replace(/[x#]\s*\d+/gi, '')
          .replace(/cantidad:?\s*\d+/gi, '')
          .trim();

        if (concentracion) {
          nombreLimpio = nombreLimpio.replace(concentracion, '').trim();
        }

        return {
          nombre: nombreLimpio || linea,
          cantidad,
          concentracion,
        };
      });

      return {
        textoCrudo: texto,
        medicamentosDetectados,
      };
    } catch (error) {
      console.warn('[OCR Service] Error al procesar receta:', error);
      return {
        textoCrudo: 'Ocurrió un error al procesar el texto de la imagen.',
        medicamentosDetectados: [],
      };
    }
  },
};
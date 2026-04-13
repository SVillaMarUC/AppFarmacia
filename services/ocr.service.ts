import Constants from 'expo-constants';

type ResultadoOCR = {
  textoCrudo: string;
  medicamentosDetectados: Array<{ nombre: string; cantidad: number }>;
};

const extra = Constants.expoConfig?.extra as { googleMapsApiKey?: string; googleVisionApiKey?: string; disableGoogleVision?: string } | undefined;
const visionDeshabilitado = String(extra?.disableGoogleVision ?? '').toLowerCase() === 'true';

export const ocrService = {
  async procesarReceta(imageBase64: string): Promise<ResultadoOCR> {
    try {
      if (visionDeshabilitado) {
        return {
          textoCrudo: 'OCR deshabilitado sin Google Cloud de pago',
          medicamentosDetectados: [],
        };
      }

      const apiKey = extra?.googleVisionApiKey?.trim();
      if (!apiKey) {
        return {
          textoCrudo: 'OCR local básico',
          medicamentosDetectados: [],
        };
      }

      if (!apiKey.startsWith('AIza')) {
        return {
          textoCrudo: 'OCR local básico (API key de Vision inválida)',
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

      const data = (await response.json()) as {
        responses?: Array<{ fullTextAnnotation?: { text?: string } }>;
      };

      const texto = data.responses?.[0]?.fullTextAnnotation?.text ?? '';
      const lineas = texto
        .split('\n')
        .map((linea) => linea.trim())
        .filter(Boolean)
        .slice(0, 8);

      const medicamentosDetectados = lineas.map((linea) => ({ nombre: linea, cantidad: 1 }));
      return {
        textoCrudo: texto,
        medicamentosDetectados,
      };
    } catch (error) {
      throw new Error('No fue posible procesar OCR de la receta.');
    }
  },
};
import type { RecetaOCRItem } from '@/types';

export type ResultadoOCR = {
  textoCrudo: string;
  medicamentosDetectados: RecetaOCRItem[];
};

// Diccionario de medicamentos conocidos para reconocimiento heurístico local
const DICCIONARIO_MEDICAMENTOS = [
  { nombre: 'Acetaminofén', principio: 'Paracetamol', concentraciones: ['500mg', '1g', '150mg/5ml'] },
  { nombre: 'Ibuprofeno', principio: 'Ibuprofeno', concentraciones: ['400mg', '600mg', '800mg', '100mg/5ml'] },
  { nombre: 'Amoxicilina', principio: 'Amoxicilina', concentraciones: ['500mg', '875mg', '250mg/5ml', '500mg/5ml'] },
  { nombre: 'Amoxicilina + Ácido Clavulánico', principio: 'Amoxicilina Clavulanato', concentraciones: ['500/125mg', '875/125mg'] },
  { nombre: 'Losartán Potásico', principio: 'Losartán', concentraciones: ['50mg', '100mg'] },
  { nombre: 'Metformina', principio: 'Metformina Clorhidrato', concentraciones: ['500mg', '850mg', '1000mg'] },
  { nombre: 'Omeprazol', principio: 'Omeprazol', concentraciones: ['20mg', '40mg'] },
  { nombre: 'Esomeprazol', principio: 'Esomeprazol', concentraciones: ['20mg', '40mg'] },
  { nombre: 'Loratadina', principio: 'Loratadina', concentraciones: ['10mg', '5mg/5ml'] },
  { nombre: 'Cetirizina', principio: 'Cetirizina', concentraciones: ['10mg', '1mg/ml'] },
  { nombre: 'Azitromicina', principio: 'Azitromicina', concentraciones: ['500mg', '200mg/5ml'] },
  { nombre: 'Ciprofloxacino', principio: 'Ciprofloxacino', concentraciones: ['500mg'] },
  { nombre: 'Salbutamol', principio: 'Salbutamol', concentraciones: ['100mcg', '2mg/5ml'] },
  { nombre: 'Bromuro de Ipratropio', principio: 'Ipratropio', concentraciones: ['20mcg'] },
  { nombre: 'Diclofenaco Sódico', principio: 'Diclofenaco', concentraciones: ['50mg', '75mg/3ml'] },
  { nombre: 'Naproxeno', principio: 'Naproxeno', concentraciones: ['250mg', '500mg'] },
  { nombre: 'Atorvastatina', principio: 'Atorvastatina', concentraciones: ['10mg', '20mg', '40mg', '80mg'] },
  { nombre: 'Enalapril', principio: 'Enalapril', concentraciones: ['5mg', '10mg', '20mg'] },
  { nombre: 'Amlodipino', principio: 'Amlodipino', concentraciones: ['5mg', '10mg'] },
  { nombre: 'Hidroclorotiazida', principio: 'Hidroclorotiazida', concentraciones: ['25mg', '50mg'] },
  { nombre: 'Levotiroxina', principio: 'Levotiroxina Sódica', concentraciones: ['25mcg', '50mcg', '75mcg', '100mcg'] },
  { nombre: 'Tramadol', principio: 'Tramadol Clorhidrato', concentraciones: ['50mg', '100mg/2ml'] },
  { nombre: 'Prednisona', principio: 'Prednisona', concentraciones: ['5mg', '20mg', '50mg'] },
  { nombre: 'Dexametasona', principio: 'Dexametasona', concentraciones: ['4mg', '8mg/2ml'] },
  { nombre: 'Suero Oral Rehidratante', principio: 'Electrólitos orales', concentraciones: ['Fórmula OMS'] },
];

/**
 * Servicio de OCR Gratuito y Procesamiento Local de Recetas Médicas.
 * No depende de Google Vision ni de servicios de pago.
 */
export const ocrService = {
  /**
   * Procesa la imagen de una receta médica usando OCR gratuito / motor de extracción local.
   */
  async procesarReceta(imageBase64: string): Promise<ResultadoOCR> {
    try {
      if (!imageBase64) {
        return {
          textoCrudo: '',
          medicamentosDetectados: [],
        };
      }

      // 1. Intentar extracción con motor OCR gratuito abierto (OCR.space gratuito sin clave obligatoria)
      let rawText = '';
      try {
        const formData = new FormData();
        const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
        formData.append('base64Image', `data:image/jpeg;base64,${cleanBase64}`);
        formData.append('language', 'spa');
        formData.append('isOverlayRequired', 'false');
        formData.append('apikey', 'helloworld'); // API Key pública/demo gratuita de OCR.Space

        const response = await fetch('https://api.ocr.space/parse/image', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const json = await response.json();
          if (json?.ParsedResults?.[0]?.ParsedText) {
            rawText = json.ParsedResults[0].ParsedText;
          }
        }
      } catch (err) {
        console.log('[OCR Service] Nota: Fallback a análisis local heurístico:', err);
      }

      // Si no se obtuvo texto del motor remoto, generar un texto base estructurado de receta
      if (!rawText || rawText.trim().length === 0) {
        rawText = 'FÓRMULA MÉDICA DIGITAL\n';
      }

      // 2. Analizar y estructurar el texto extraído con el motor de reglas farmacéuticas
      const medicamentosDetectados = this.extraerMedicamentosDelTexto(rawText);

      return {
        textoCrudo: rawText.trim(),
        medicamentosDetectados,
      };
    } catch (error) {
      console.warn('[OCR Service] Error en procesarReceta:', error);
      return {
        textoCrudo: 'No se pudo extraer texto automático. Puedes ingresar los datos manualmente.',
        medicamentosDetectados: [],
      };
    }
  },

  /**
   * Parser inteligente de texto médico: analiza líneas de texto y extrae medicamentos,
   * concentraciones, cantidades y dosis.
   */
  extraerMedicamentosDelTexto(texto: string): RecetaOCRItem[] {
    if (!texto || texto.trim().length === 0) {
      return [];
    }

    const items: RecetaOCRItem[] = [];
    const lineas = texto
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 2);

    for (const linea of lineas) {
      // Omitir encabezados comunes que no son medicamentos
      const lower = linea.toLowerCase();
      if (
        lower.startsWith('dr') ||
        lower.startsWith('doctor') ||
        lower.startsWith('paciente') ||
        lower.startsWith('fecha') ||
        lower.startsWith('cédula') ||
        lower.startsWith('cedula') ||
        lower.startsWith('fórmula') ||
        lower.startsWith('receta') ||
        lower.startsWith('eps') ||
        lower.startsWith('diagnostico') ||
        lower.startsWith('diagnóstico') ||
        lower.startsWith('firma')
      ) {
        continue;
      }

      // 1. Buscar coincidencia con diccionario
      let coincidenciaEncontrada = false;
      for (const med of DICCIONARIO_MEDICAMENTOS) {
        const regexMed = new RegExp(`\\b${med.nombre}\\b|\\b${med.principio}\\b`, 'i');
        if (regexMed.test(linea)) {
          // Extraer cantidad
          const matchCant = linea.match(/[x#]\s*(\d+)/i) || linea.match(/(?:cantidad|cant\.?|tomar)\s*:?\s*(\d+)/i) || linea.match(/\b(\d+)\s*(?:cajas?|tabletas?|capsulas?|frascos?|unidades?)\b/i);
          const cantidad = matchCant ? Math.max(1, parseInt(matchCant[1], 10)) : 1;

          // Extraer concentración
          const matchConc = linea.match(/(\d+\s*(?:mg|g|ml|mcg|ui|%|mg\/ml|mg\/5ml))/i);
          const concentracion = matchConc ? matchConc[0] : (med.concentraciones?.[0] || undefined);

          // Extraer instrucciones / dosis
          const matchInstrucciones = linea.match(/(?:cada\s*\d+\s*horas?|1\s*al\s*d[ií]a|en\s*la\s*mañana|en\s*la\s*noche|con\s*las\s*comidas)/i);
          const instrucciones = matchInstrucciones ? matchInstrucciones[0] : undefined;

          items.push({
            nombre: med.nombre,
            cantidad,
            concentracion,
            dosis: instrucciones,
            instrucciones,
          });

          coincidenciaEncontrada = true;
          break;
        }
      }

      // 2. Si no coincide con el diccionario pero parece un medicamento (tiene concentración o cantidad)
      if (!coincidenciaEncontrada) {
        const matchConc = linea.match(/(\d+\s*(?:mg|g|ml|mcg|ui|%))/i);
        const matchCant = linea.match(/[x#]\s*(\d+)/i) || linea.match(/(?:cantidad|cant\.?)\s*:?\s*(\d+)/i);

        if (matchConc || matchCant) {
          const cantidad = matchCant ? Math.max(1, parseInt(matchCant[1], 10)) : 1;
          const concentracion = matchConc ? matchConc[0] : undefined;

          let nombreLimpio = linea
            .replace(/[x#]\s*\d+/gi, '')
            .replace(/(?:cantidad|cant\.?)\s*:?\s*\d+/gi, '')
            .replace(/(\d+\s*(?:mg|g|ml|mcg|ui|%))/gi, '')
            .replace(/[-–—]/g, ' ')
            .trim();

          if (nombreLimpio.length > 2) {
            items.push({
              nombre: nombreLimpio,
              cantidad,
              concentracion,
            });
          }
        }
      }
    }

    return items;
  },
};
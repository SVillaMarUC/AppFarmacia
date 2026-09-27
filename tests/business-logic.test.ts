import { z } from 'zod';

// =========================================================
// TEST RUNNER ENGINE
// =========================================================
let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

function assertEqual<T>(actual: T, expected: T, testName: string) {
  const isMatch = JSON.stringify(actual) === JSON.stringify(expected);
  if (isMatch) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    console.error(`     Expected: ${JSON.stringify(expected)}`);
    console.error(`     Actual:   ${JSON.stringify(actual)}`);
    failed++;
  }
}

console.log('\n======================================================');
console.log('🧪 EJECUTANDO SUITE DE PRUEBAS AUTOMÁTICAS: FARMA YA');
console.log('======================================================\n');

// =========================================================
// 1. REGLAS DE NEGOCIO DE INVENTARIO Y STOCK
// =========================================================
console.log('--- 1. Evaluación de Estados de Stock e Inventario ---');

function evaluarEstadoStock(stock: number, stockMinimo: number): 'agotado' | 'critico' | 'bajo' | 'ok' {
  if (stock <= 0) return 'agotado';
  if (stock <= Math.max(1, Math.floor(stockMinimo * 0.5))) return 'critico';
  if (stock <= stockMinimo) return 'bajo';
  return 'ok';
}

assertEqual(evaluarEstadoStock(0, 10), 'agotado', 'Stock 0 debe evaluarse como "agotado"');
assertEqual(evaluarEstadoStock(-2, 10), 'agotado', 'Stock negativo debe evaluarse como "agotado"');
assertEqual(evaluarEstadoStock(4, 10), 'critico', 'Stock <= 50% de stockMinimo debe evaluarse como "critico"');
assertEqual(evaluarEstadoStock(8, 10), 'bajo', 'Stock <= stockMinimo debe evaluarse como "bajo"');
assertEqual(evaluarEstadoStock(25, 10), 'ok', 'Stock > stockMinimo debe evaluarse como "ok"');

// =========================================================
// 2. REGLAS DE VENCIMIENTO DE MEDICAMENTOS (30 DÍAS)
// =========================================================
console.log('\n--- 2. Reglas de Vencimiento de Medicamentos ---');

const DIAS_ALERTA_PROXIMO_VENCIMIENTO = 30;

function evaluarVencimiento(fecha?: Date | string | null): {
  estado: 'vigente' | 'proximo_a_vencer' | 'vencido' | 'sin_fecha';
  diasRestantes?: number;
} {
  if (!fecha) return { estado: 'sin_fecha' };
  const dateObj = fecha instanceof Date ? fecha : new Date(String(fecha));
  if (isNaN(dateObj.getTime())) return { estado: 'sin_fecha' };

  const ahora = new Date();
  const diffMs = dateObj.getTime() - ahora.getTime();
  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDias < 0) return { estado: 'vencido', diasRestantes: diffDias };
  if (diffDias <= DIAS_ALERTA_PROXIMO_VENCIMIENTO) return { estado: 'proximo_a_vencer', diasRestantes: diffDias };
  return { estado: 'vigente', diasRestantes: diffDias };
}

const hoy = new Date();
const fechaVencida = new Date(hoy.getTime() - 5 * 24 * 60 * 60 * 1000);
const fechaProxima = new Date(hoy.getTime() + 12 * 24 * 60 * 60 * 1000);
const fechaVigente = new Date(hoy.getTime() + 180 * 24 * 60 * 60 * 1000);

assertEqual(evaluarVencimiento(fechaVencida).estado, 'vencido', 'Fecha anterior debe evaluarse como "vencido"');
assertEqual(evaluarVencimiento(fechaProxima).estado, 'proximo_a_vencer', 'Fecha en 12 días debe evaluarse como "proximo_a_vencer"');
assertEqual(evaluarVencimiento(fechaVigente).estado, 'vigente', 'Fecha en 6 meses debe evaluarse como "vigente"');
assertEqual(evaluarVencimiento(null).estado, 'sin_fecha', 'Valor null debe evaluarse como "sin_fecha"');

// =========================================================
// 3. TRANSACCIONES ATÓMICAS DE STOCK (SIMULACIÓN DE TRANSACTION)
// =========================================================
console.log('\n--- 3. Descuento Atómico de Stock (Prevención de Stock Negativo) ---');

type InventarioMock = Record<string, { nombre: string; stock: number }>;

function simularDescuentoAtomico(
  dbMock: InventarioMock,
  solicitudes: Array<{ medicamentoId: string; cantidad: number }>
): { exito: boolean; error?: string } {
  // 1. Validar todos los stocks antes de mutar
  for (const sol of solicitudes) {
    const item = dbMock[sol.medicamentoId];
    if (!item) {
      return { exito: false, error: `Medicamento ${sol.medicamentoId} no existe.` };
    }
    if (item.stock < sol.cantidad) {
      return {
        exito: false,
        error: `Stock insuficiente para ${item.nombre}. Solicitado: ${sol.cantidad}, Disponible: ${item.stock}.`,
      };
    }
  }

  // 2. Aplicar descuento de forma atómica
  for (const sol of solicitudes) {
    dbMock[sol.medicamentoId].stock -= sol.cantidad;
  }

  return { exito: true };
}

const dbInicial: InventarioMock = {
  'med-1': { nombre: 'Acetaminofén 500mg', stock: 10 },
  'med-2': { nombre: 'Amoxicilina 500mg', stock: 3 },
};

// Intento 1: Despacho con stock suficiente
const resultadoOk = simularDescuentoAtomico(dbInicial, [
  { medicamentoId: 'med-1', cantidad: 4 },
  { medicamentoId: 'med-2', cantidad: 2 },
]);
assert(resultadoOk.exito, 'Despacho con existencias suficientes se procesa con éxito');
assertEqual(dbInicial['med-1'].stock, 6, 'Stock de Acetaminofén pasa de 10 a 6');
assertEqual(dbInicial['med-2'].stock, 1, 'Stock de Amoxicilina pasa de 3 a 1');

// Intento 2: Despacho con stock insuficiente (debe abortar TODA la transacción sin mutaciones parciales)
const resultadoFallo = simularDescuentoAtomico(dbInicial, [
  { medicamentoId: 'med-1', cantidad: 2 },
  { medicamentoId: 'med-2', cantidad: 5 }, // Requiere 5 pero solo queda 1
]);
assert(!resultadoFallo.exito, 'Transacción aborta automáticamente si algún ítem supera el stock');
assertEqual(dbInicial['med-1'].stock, 6, 'Stock de Acetaminofén no se descontó (atomicidad garantizada)');
assertEqual(dbInicial['med-2'].stock, 1, 'Stock de Amoxicilina permanece intacto');

// =========================================================
// 4. MOTOR OCR GRATUITO & PARSER DE RECETAS MÉDICAS
// =========================================================
console.log('\n--- 4. Motor Heurístico de OCR Gratuito y Extracción de Recetas ---');

const DICCIONARIO = [
  { nombre: 'Acetaminofén', principio: 'Paracetamol' },
  { nombre: 'Amoxicilina', principio: 'Amoxicilina' },
  { nombre: 'Losartán Potásico', principio: 'Losartán' },
  { nombre: 'Metformina', principio: 'Metformina' },
  { nombre: 'Omeprazol', principio: 'Omeprazol' },
];

function parsearRecetaTexto(texto: string) {
  const lineas = texto.split('\n').map((l) => l.trim()).filter((l) => l.length > 2);
  const detectados: Array<{ nombre: string; cantidad: number; concentracion?: string }> = [];

  for (const linea of lineas) {
    for (const med of DICCIONARIO) {
      if (new RegExp(`\\b${med.nombre}\\b|\\b${med.principio}\\b`, 'i').test(linea)) {
        const matchCant = linea.match(/[x#]\s*(\d+)/i) || linea.match(/\b(\d+)\s*(?:cajas?|tabletas?|capsulas?)\b/i);
        const cantidad = matchCant ? Math.max(1, parseInt(matchCant[1], 10)) : 1;
        const matchConc = linea.match(/(\d+\s*(?:mg|g|ml|mcg|ui|%))/i);
        const concentracion = matchConc ? matchConc[0] : undefined;

        detectados.push({
          nombre: med.nombre,
          cantidad,
          concentracion,
        });
        break;
      }
    }
  }
  return detectados;
}

const textoReceta = `
CLINICA GENERAL DEL NORTE
MEDICO TRATANTE: DR. ALFONSO RUIZ - TP 91238
PACIENTE: MARIA GOMEZ - CC 52891234
DIAGNOSTICO: INFECCION RESPIRATORIA AGUDA

INDICACIONES:
1. Amoxicilina 500mg # 21 cápsulas (tomar 1 cada 8 horas)
2. Acetaminofén 500mg x 15 tabletas
3. Omeprazol 20mg x 14
`;

const medsExtraidos = parsearRecetaTexto(textoReceta);
assert(medsExtraidos.length === 3, 'El motor OCR extrae los 3 medicamentos reconocidos');
assert(medsExtraidos.some((m) => m.nombre === 'Amoxicilina' && m.cantidad === 21 && m.concentracion?.includes('500')), 'Amoxicilina 500mg con cantidad 21 extraída');
assert(medsExtraidos.some((m) => m.nombre === 'Acetaminofén' && m.cantidad === 15), 'Acetaminofén con cantidad 15 extraída');
assert(medsExtraidos.some((m) => m.nombre === 'Omeprazol' && m.cantidad === 14), 'Omeprazol con cantidad 14 extraída');

// =========================================================
// 5. VALIDACIÓN DE REGLAS DE NEGOCIO PARA FÓRMULAS MÉDICAS
// =========================================================
console.log('\n--- 5. Reglas de Validación de Pedidos y Recetas ---');

function validarCreacionPedido(pedido: {
  medicamentos: Array<{ nombre: string; cantidad: number; requiereReceta?: boolean }>;
  recetaId?: string | null;
}) {
  if (!pedido.medicamentos || pedido.medicamentos.length === 0) {
    throw new Error('El pedido debe incluir al menos un medicamento.');
  }
  const requiereReceta = pedido.medicamentos.some((m) => m.requiereReceta);
  if (requiereReceta && !pedido.recetaId) {
    throw new Error('Uno o más medicamentos seleccionados requieren receta médica obligatoria.');
  }
  return true;
}

assert(
  validarCreacionPedido({
    medicamentos: [{ nombre: 'Acetaminofén', cantidad: 1, requiereReceta: false }],
  }),
  'Pedido OTC sin receta es admitido'
);

assert(
  validarCreacionPedido({
    medicamentos: [{ nombre: 'Amoxicilina', cantidad: 1, requiereReceta: true }],
    recetaId: 'receta-999',
  }),
  'Pedido con medicamento Rx y receta adjunta es admitido'
);

let lanzoError = false;
try {
  validarCreacionPedido({
    medicamentos: [{ nombre: 'Amoxicilina', cantidad: 1, requiereReceta: true }],
    recetaId: null,
  });
} catch {
  lanzoError = true;
}
assert(lanzoError, 'Pedido con medicamento Rx SIN receta es rechazado inmediatamente');

// =========================================================
// 6. VALIDACIONES CON ESQUEMA ZOD (USUARIOS Y FORMULARIOS)
// =========================================================
console.log('\n--- 6. Validación de Esquemas Zod ---');

const usuarioRegistroSchema = z.object({
  cedula: z.string().min(6, 'Cédula debe tener al menos 6 dígitos'),
  email: z.string().email('Correo inválido'),
  password: z.string().min(6, 'Contraseña mínima de 6 caracteres'),
  nombre: z.string().min(3, 'Nombre requerido'),
  telefono: z.string().min(7, 'Teléfono requerido'),
  rol: z.enum(['afiliado', 'administrador', 'domiciliario', 'despachador']),
});

const usuarioValido = usuarioRegistroSchema.safeParse({
  cedula: '1098765432',
  email: 'usuario@farmaya.com',
  password: 'Password2026',
  nombre: 'Carlos Ramírez',
  telefono: '3109876543',
  rol: 'afiliado',
});
assert(usuarioValido.success, 'Datos de afiliado válidos son aprobados por Zod');

const usuarioInvalido = usuarioRegistroSchema.safeParse({
  cedula: '123',
  email: 'correo-no-valido',
  password: '12',
  nombre: '',
  telefono: '',
  rol: 'rol_invalido',
});
assert(!usuarioInvalido.success, 'Datos inconsistentes son rechazados por Zod');

// =========================================================
// RESUMEN
// =========================================================
console.log('\n======================================================');
console.log(`🏁 RESUMEN DE PRUEBAS: ${passed} PASARON, ${failed} FALLARON`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

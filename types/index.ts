import type { GeoPoint, Timestamp } from 'firebase/firestore';

export interface Direccion {
  etiqueta: string;
  direccion: string;
  ciudad: string;
  latitud: number;
  longitud: number;
  principal?: boolean;
}

export interface ContactoEmergencia {
  nombre: string;
  parentesco: string;
  telefono: string;
}

// Snapshot de medicamento dentro de un pedido
export interface Medicamento {
  medicamentoId?: string;
  nombre: string;
  principioActivo?: string;
  concentracion?: string;
  presentacion?: string;
  dosis?: string;
  cantidad: number;
  requiereReceta?: boolean;
  observacion?: string;
}

export type PedidoItem = Medicamento;

export interface Usuario {
  uid: string;
  cedula: number;
  email?: string;
  nombre: string;
  fechaNacimiento: Date;
  genero: string;
  eps: string;
  ciudad: string;
  direcciones: Direccion[];
  telefono: string;
  contactoEmergencia: ContactoEmergencia;
  esPrioritario: boolean;
  disponible?: boolean;
  tipoPrioridad?: 'adulto_mayor' | 'discapacidad' | 'embarazo';
  rol: 'afiliado' | 'administrador' | 'domiciliario' | 'despachador';
  creadoEn: Timestamp;
}

export type EstadoReceta = 'pendiente' | 'procesando' | 'revision' | 'aprobada' | 'rechazada';

export interface RecetaOCRItem {
  nombre: string;
  cantidad: number;
  concentracion?: string;
  dosis?: string;
}

export interface RecetaMedica {
  id: string;
  pedidoId?: string | null;
  usuarioId: string;
  storagePath: string;
  urlTemporal?: string;
  mimeType?: string;
  fileSize?: number;
  estado: EstadoReceta;
  motivoRechazo?: string;
  observaciones?: string;
  ocr?: {
    textoCrudo?: string;
    medicamentosDetectados?: RecetaOCRItem[];
    procesadoAt?: Timestamp | string;
    valido?: boolean;
  };
  creadoEn: Timestamp;
  actualizadoEn: Timestamp;
}

export type EstadoPedido =
  | 'pendiente'
  | 'asignado'
  | 'en_preparacion'
  | 'listo'
  | 'en_camino'
  | 'entregado'
  | 'cancelado';

export interface Pedido {
  id: string;
  usuarioId: string;
  medicamentos: Medicamento[];
  estado: EstadoPedido;
  modoEntrega: 'domicilio' | 'recogida';
  ciudad?: string;
  direccionEntrega?: Direccion;
  domiciliarioId?: string;
  recetaId?: string | null;
  recetaUrl?: string | null; // Retrocompatibilidad
  recetaEstado?: EstadoReceta;
  recetaOCRData?: Record<string, unknown>;
  origenSolicitud?: 'manual' | 'ocr';
  observacionesDespacho?: string;
  timestampCreacion: Timestamp;
  timestampEntrega?: Timestamp;
  asignadoEn?: Timestamp;
  preparadoEn?: Timestamp;
  ubicacionEntrega?: GeoPoint;
}

export interface ItemInventario {
  id: string;
  nombre: string;
  principioActivo?: string;
  concentracion?: string;
  presentacion?: string;
  unidad?: string;
  categoria?: string;
  descripcion?: string;
  requiereReceta: boolean;
  stock: number;
  stockMinimo: number;
  lote?: string;
  fechaVencimiento?: Timestamp | Date | string | null;
  proveedor?: string;
  activo: boolean;
  motivoAjuste?: string;
  fotoAjusteUrl?: string;
  creadoEn?: Timestamp;
  actualizadoEn?: Timestamp;
}

export interface DeliveryEvidence {
  id: string;
  pedidoId: string;
  domiciliarioId: string;
  tipo: 'foto';
  storagePath: string;
  urlTemporal?: string;
  observaciones?: string;
  creadoEn: Timestamp;
}

export interface UbicacionDomiciliario {
  uid: string;
  latitud: number;
  longitud: number;
  pedidoActivoId?: string | null;
  actualizadoEn: Timestamp;
}
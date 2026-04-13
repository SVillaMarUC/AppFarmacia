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

export interface Medicamento {
  nombre: string;
  dosis?: string;
  cantidad: number;
  observacion?: string;
}

export interface Usuario {
  uid: string;
  cedula: string;
  nombre: string;
  fechaNacimiento: Date;
  genero: string;
  eps: string;
  direcciones: Direccion[];
  telefono: string;
  contactoEmergencia: ContactoEmergencia;
  esPrioritario: boolean;
  tipoPrioridad?: 'adulto_mayor' | 'discapacidad' | 'embarazo';
  rol: 'afiliado' | 'administrador' | 'domiciliario' | 'despachador';
  creadoEn: Timestamp;
  pinNumerico?: string;
}

export interface Pedido {
  id: string;
  usuarioId: string;
  medicamentos: Medicamento[];
  estado: 'pendiente' | 'en_preparacion' | 'listo' | 'en_camino' | 'entregado';
  modoEntrega: 'domicilio' | 'recogida';
  direccionEntrega?: Direccion;
  domiciliarioId?: string;
  recetaUrl: string | null;
  recetaOCRData: Record<string, unknown>;
  origenSolicitud?: 'manual' | 'ocr';
  timestampCreacion: Timestamp;
  timestampEntrega?: Timestamp;
  ubicacionEntrega?: GeoPoint;
}

export interface ItemInventario {
  id: string;
  nombre: string;
  categoria: string;
  stock: number;
  stockMinimo: number;
  lote: string;
  fechaVencimiento: Date;
  proveedor: string;
  motivoAjuste?: string;
  fotoAjusteUrl?: string;
}

export interface UbicacionDomiciliario {
  uid: string;
  latitud: number;
  longitud: number;
  pedidoActivoId?: string | null;
  actualizadoEn: Timestamp;
}
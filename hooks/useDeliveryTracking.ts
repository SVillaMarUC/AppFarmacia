import { useEffect, useState } from 'react';
import { locationService } from '@/services/location.service';
import type { Pedido, UbicacionDomiciliario } from '@/types';

/** REPARTIDOR: publica su GPS mientras el pedido está 'en_camino' y devuelve su posición local. */
export function useCourierPublisher(uid: string | undefined, pedido: Pedido | null) {
  const [pos, setPos] = useState<{ latitud: number; longitud: number } | null>(null);
  const activo = !!uid && !!pedido && pedido.estado === 'en_camino';

  useEffect(() => {
    if (!activo || !uid || !pedido) return;
    let stop: (() => void) | undefined;
    let cancelado = false;

    locationService
      .iniciarSeguimiento(uid, pedido.id, (latitud, longitud) => setPos({ latitud, longitud }))
      .then((fn) => (cancelado ? fn() : (stop = fn)))
      .catch((e) => console.warn('Seguimiento no iniciado:', e));

    return () => {
      cancelado = true;
      stop?.();
    };
  }, [activo, uid, pedido?.id]);

  return pos;
}

/** CLIENTE: recibe la ubicación del repartidor en tiempo real. */
export function useCourierLocation(pedido: Pedido | null) {
  const [ubicacion, setUbicacion] = useState<UbicacionDomiciliario | null>(null);
  const activo = !!pedido?.domiciliarioId && pedido.estado === 'en_camino';

  useEffect(() => {
    if (!activo || !pedido?.domiciliarioId) {
      setUbicacion(null);
      return;
    }
    return locationService.suscribirUbicacion(pedido.domiciliarioId, setUbicacion);
  }, [activo, pedido?.domiciliarioId]);

  return ubicacion;
}
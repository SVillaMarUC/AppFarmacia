import * as Location from 'expo-location';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import type { UbicacionDomiciliario } from '@/types';

const COLECCION = 'ubicaciones_domiciliarios';

export const locationService = {
  /** REPARTIDOR: publica su ubicación mientras el pedido está en camino. Devuelve una función para detener. */
  async iniciarSeguimiento(
    uid: string,
    pedidoActivoId: string,
    onPosicion?: (lat: number, lng: number) => void
  ): Promise<() => void> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') throw new Error('Permiso de ubicación denegado.');

    const sub = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
      (pos) => {
        const { latitude, longitude } = pos.coords;
        onPosicion?.(latitude, longitude);
        void setDoc(
          doc(db, COLECCION, uid),
          { uid, latitud: latitude, longitud: longitude, pedidoActivoId, actualizadoEn: serverTimestamp() },
          { merge: true }
        );
      }
    );

    return () => sub.remove();
  },

  /** REPARTIDOR: limpia el pedido activo al terminar. */
  async detenerSeguimiento(uid: string): Promise<void> {
    await setDoc(doc(db, COLECCION, uid), { pedidoActivoId: null, actualizadoEn: serverTimestamp() }, { merge: true });
  },

  /** CLIENTE: escucha la ubicación del repartidor asignado. */
  suscribirUbicacion(domiciliarioId: string, cb: (u: UbicacionDomiciliario | null) => void): () => void {
    return onSnapshot(doc(db, COLECCION, domiciliarioId), (snap) => {
      cb(snap.exists() ? (snap.data() as UbicacionDomiciliario) : null);
    });
  },
};
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '@/services/firebase/config';

// 1. Lista local de respaldo o de carga inicial
export const medicamentosIniciales = [
  // ... tus 10 medicamentos aquí
];

// 2. Funciones del servicio para interactuar con Firebase
export const medicationService = {
  async obtenerMedicamentos() {
    try {
      const ref = collection(db, 'medicamentos');
      const snapshot = await getDocs(ref);

      // Si Firebase está vacío, devuelve la lista local
      if (snapshot.empty) {
        return medicamentosIniciales;
      }

      // Si Firebase tiene datos, devuelve los datos reales de la BD
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.warn('Error en Firebase, usando medicamentos locales:', error);
      return medicamentosIniciales;
    }
  },
};
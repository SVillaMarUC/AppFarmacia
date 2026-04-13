import { useCallback, useState } from 'react';
import * as Location from 'expo-location';

export const useLocation = () => {
  const [loading, setLoading] = useState(false);

  const getCurrentLocation = useCallback(async () => {
    try {
      setLoading(true);
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Permiso de ubicación denegado.');
      }
      return await Location.getCurrentPositionAsync({});
    } catch (error) {
      throw new Error('No fue posible obtener la ubicación actual.');
    } finally {
      setLoading(false);
    }
  }, []);

  return { getCurrentLocation, loading };
};
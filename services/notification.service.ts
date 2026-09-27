import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

// En Expo Go para Android (desde SDK 53), expo-notifications no está disponible en el cliente de Play Store.
// Requiere Development Build (EAS) o se desactiva elegantemente en Expo Go / Web sin crashear.
const isExpoGoAndroid =
  Platform.OS === 'android' &&
  (Constants.executionEnvironment === ExecutionEnvironment.StoreClient || Constants.appOwnership === 'expo');

type NotificationsModule = typeof import('expo-notifications');
let cachedModule: NotificationsModule | null = null;
let initAttempted = false;

async function getModule(): Promise<NotificationsModule | null> {
  if (Platform.OS === 'web' || isExpoGoAndroid) {
    return null;
  }
  if (initAttempted) {
    return cachedModule;
  }

  initAttempted = true;
  try {
    const mod = await import('expo-notifications');
    try {
      mod.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    } catch {
      // Handler no disponible en este runtime
    }
    cachedModule = mod;
    return cachedModule;
  } catch (err) {
    console.warn('[NotificationService] Notificaciones nativas no disponibles en este entorno (Expo Go Android / Web):', err);
    cachedModule = null;
    return null;
  }
}

export const notificationService = {
  /**
   * Solicita permisos de notificaciones al usuario
   */
  async solicitarPermisos(): Promise<boolean> {
    const notif = await getModule();
    if (!notif) return false;

    try {
      const { status: existingStatus } = await notif.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await notif.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return false;
      }

      if (Platform.OS === 'android') {
        await notif.setNotificationChannelAsync('default', {
          name: 'FarmaYa Notificaciones',
          importance: notif.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#0f766e',
        });
      }

      return true;
    } catch (error) {
      console.warn('[NotificationService] Error al solicitar permisos:', error);
      return false;
    }
  },

  /**
   * Envía una notificación local inmediata al dispositivo
   */
  async enviarNotificacionLocal(
    titulo: string,
    cuerpo: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    const notif = await getModule();
    if (!notif) {
      // En Expo Go / Web simplemente registramos el log de la notificación
      console.log(`[Notificación FarmaYa] ${titulo} - ${cuerpo}`);
      return;
    }

    try {
      await notif.scheduleNotificationAsync({
        content: {
          title: titulo,
          body: cuerpo,
          data: data ?? {},
          sound: true,
        },
        trigger: null, // Disparo inmediato
      });
    } catch (error) {
      console.warn('[NotificationService] Error al emitir notificación:', error);
    }
  },

  /**
   * Escucha notificaciones recibidas en primer plano
   */
  escucharNotificacionesRecibidas(
    callback: (notification: any) => void
  ): () => void {
    let unsubscribe = () => {};
    void getModule().then((notif) => {
      if (notif) {
        const sub = notif.addNotificationReceivedListener(callback);
        unsubscribe = () => sub.remove();
      }
    });
    return () => unsubscribe();
  },
};

export default notificationService;

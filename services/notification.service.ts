import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const notificationService = {
  /**
   * Solicita permisos de notificaciones al usuario
   */
  async solicitarPermisos(): Promise<boolean> {
    if (Platform.OS === 'web') return false;

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return false;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'FarmaYa Notificaciones',
          importance: Notifications.AndroidImportance.HIGH,
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
    if (Platform.OS === 'web') return;

    try {
      await Notifications.scheduleNotificationAsync({
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
    callback: (notification: Notifications.Notification) => void
  ): () => void {
    const subscription = Notifications.addNotificationReceivedListener(callback);
    return () => subscription.remove();
  },
};

import * as SecureStore from 'expo-secure-store';
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { collection, doc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { auth, db } from '@/services/firebase/config';
import type { Usuario } from '@/types';

const TOKEN_KEY = 'farmaya_auth_token';

const buildEmailFromCedula = (cedula: string): string => `${cedula.trim()}@farmaya.app`;

export const authService = {
  async iniciarSesionConCedula(cedula: string, contrasena: string): Promise<User> {
    try {
      const email = buildEmailFromCedula(cedula);
      const credential = await signInWithEmailAndPassword(auth, email, contrasena);
      const token = await credential.user.getIdToken();
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      return credential.user;
    } catch (error) {
      throw new Error('No fue posible iniciar sesión. Verifica tus credenciales.');
    }
  },

  async iniciarSesionConPin(cedula: string, pin: string): Promise<User> {
    try {
      const usuariosQ = query(collection(db, 'usuarios'), where('cedula', '==', cedula.trim()));
      const usuariosSnap = await getDocs(usuariosQ);

      if (usuariosSnap.empty) {
        throw new Error('Usuario no encontrado.');
      }

      const data = usuariosSnap.docs[0].data() as Partial<Usuario>;
      if (data.pinNumerico !== pin) {
        throw new Error('PIN inválido.');
      }

      const email = buildEmailFromCedula(cedula);
      const credential = await signInWithEmailAndPassword(auth, email, pin);
      const token = await credential.user.getIdToken();
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      return credential.user;
    } catch (error) {
      if (error instanceof Error && ['Usuario no encontrado.', 'PIN inválido.'].includes(error.message)) {
        throw error;
      }

      const code = (error as { code?: string })?.code;
      if (code === 'auth/network-request-failed') {
        throw new Error('Sin conexión. Verifica tu red e intenta de nuevo.');
      }

      throw new Error('No fue posible iniciar sesión con PIN.');
    }
  },

  async registrarUsuario(cedula: string, contrasena: string, data: Omit<Usuario, 'uid' | 'creadoEn'>): Promise<void> {
    try {
      const email = buildEmailFromCedula(cedula);
      const credential = await createUserWithEmailAndPassword(auth, email, contrasena);

      await setDoc(doc(db, 'usuarios', credential.user.uid), {
        ...data,
        uid: credential.user.uid,
        creadoEn: serverTimestamp(),
      });
    } catch (error) {
      throw new Error('No fue posible registrar el usuario.');
    }
  },

  async enviarRecuperacion(cedula: string): Promise<void> {
    try {
      const email = buildEmailFromCedula(cedula);
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      throw new Error('No se pudo enviar el correo de recuperación.');
    }
  },

  async cerrarSesion(): Promise<void> {
    try {
      await signOut(auth);
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (error) {
      throw new Error('No fue posible cerrar sesión.');
    }
  },

  escucharSesion(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  },

  async refrescarTokenSiEsNecesario(): Promise<string | null> {
    try {
      if (!auth.currentUser) {
        return null;
      }

      const token = await auth.currentUser.getIdToken(true);
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      return token;
    } catch (error) {
      throw new Error('No fue posible refrescar el token.');
    }
  },
};
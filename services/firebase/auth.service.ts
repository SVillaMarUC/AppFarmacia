import * as SecureStore from 'expo-secure-store';
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '@/services/firebase/config';
import type { Usuario } from '@/types';

const TOKEN_KEY = 'farmaya_auth_token';

const normalizeCedula = (value: string | number): string => String(value).replace(/[^\d]/g, '').trim();
const cedulaToNumber = (value: string | number): number | null => {
  const normalized = normalizeCedula(value);
  if (!normalized.length) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};
const normalizeIdentifier = (value: string | number): string => String(value).trim().toLowerCase();

const resolveEmailByCedula = async (cedula: string | number): Promise<string | null> => {
  const cedulaNormalizada = normalizeCedula(cedula);
  if (!cedulaNormalizada.length) {
    return null;
  }

  const accesoRef = doc(db, 'accesosCedula', cedulaNormalizada);
  const accesoSnap = await getDoc(accesoRef);
  if (!accesoSnap.exists()) {
    return null;
  }

  const data = accesoSnap.data() as { email?: string };
  if (!data.email) {
    return null;
  }

  return normalizeIdentifier(data.email);
};

const mapRegistroError = (error: unknown): string => {
  const code = (error as { code?: string } | null)?.code;
  const message = (error as { message?: string } | null)?.message;

  if (code === 'auth/email-already-in-use') {
    return 'El correo ya está registrado.';
  }
  if (code === 'auth/invalid-email') {
    return 'El correo no tiene un formato válido.';
  }
  if (code === 'auth/weak-password') {
    return 'La contraseña es demasiado débil. Usa al menos 6 caracteres.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'El registro con correo/contraseña no está habilitado en Firebase Auth.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Sin conexión. Verifica tu red e intenta de nuevo.';
  }
  if (code === 'auth/invalid-api-key') {
    return 'La configuración de Firebase es inválida (API key).';
  }
  if (code === 'permission-denied' || code?.includes('permission-denied')) {
    return 'No hay permisos para crear el perfil en Firestore.';
  }
  if (code === 'invalid-argument' || code?.includes('invalid-argument')) {
    return 'Hay datos inválidos en el formulario. Revisa los campos e intenta de nuevo.';
  }

  if (message && message.trim().length > 0) {
    return message;
  }

  return 'No fue posible registrar el usuario.';
};

const mapLoginError = (error: unknown): string => {
  const code = (error as { code?: string } | null)?.code;
  const message = (error as { message?: string } | null)?.message;

  if (code === 'auth/network-request-failed') {
    return 'Sin conexión. Verifica tu red e intenta de nuevo. (auth/network-request-failed)';
  }
  if (code === 'auth/too-many-requests') {
    return 'Demasiados intentos. Intenta de nuevo más tarde. (auth/too-many-requests)';
  }
  if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return 'La cédula o la contraseña no coinciden. (auth/invalid-credential)';
  }
  if (code === 'auth/invalid-email') {
    return 'No se pudo resolver el acceso con ese identificador. (auth/invalid-email)';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'El inicio de sesión con correo/contraseña no está habilitado en Firebase Auth. (auth/operation-not-allowed)';
  }
  if (code === 'permission-denied' || code?.includes('permission-denied')) {
    return 'Firestore no permitió leer el perfil asociado a la cédula. (permission-denied)';
  }

  if (message && message.trim().length > 0) {
    return message;
  }

  return 'No fue posible iniciar sesión.';
};

export const authService = {
  async iniciarSesionConCedula(cedulaOrEmail: string, contrasena: string): Promise<User> {
    try {
      const email = await resolveEmailByCedula(cedulaOrEmail);
      if (!email) {
        throw new Error('No existe una cuenta asociada a esa cédula.');
      }

      const credential = await signInWithEmailAndPassword(auth, email, contrasena);
      const token = await credential.user.getIdToken();
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      return credential.user;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(mapLoginError(error));
      }
      throw new Error('No fue posible iniciar sesión.');
    }
  },

  async registrarUsuario(
    cedula: string | number,
    email: string,
    contrasena: string,
    data: Omit<Usuario, 'uid' | 'creadoEn'>
  ): Promise<void> {
    try {
      const cedulaNormalizada = normalizeCedula(cedula);
      const normalizedEmail = normalizeIdentifier(email);
      const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, contrasena);
      const cedulaNumerica = cedulaToNumber(cedula);

      await setDoc(doc(db, 'usuarios', credential.user.uid), {
        ...data,
        cedula: cedulaNumerica ?? normalizeCedula(cedula),
        email: normalizedEmail,
        uid: credential.user.uid,
        creadoEn: serverTimestamp(),
      });

      await setDoc(doc(db, 'accesosCedula', cedulaNormalizada), {
        uid: credential.user.uid,
        email: normalizedEmail,
        cedula: cedulaNumerica ?? cedulaNormalizada,
        creadoEn: serverTimestamp(),
      });
    } catch (error) {
      throw new Error(mapRegistroError(error));
    }
  },

  async enviarRecuperacion(cedulaOrEmail: string): Promise<void> {
    try {
      const candidates = await resolveCandidateEmails(cedulaOrEmail);
      if (!candidates.length) {
        throw new Error('No se encontró una cuenta para recuperación.');
      }

      let lastError: unknown = null;
      for (const email of candidates) {
        try {
          await sendPasswordResetEmail(auth, email);
          return;
        } catch (error) {
          lastError = error;
        }
      }

      const code = (lastError as { code?: string } | null)?.code;
      if (code === 'auth/network-request-failed') {
        throw new Error('Sin conexión. Verifica tu red e intenta de nuevo.');
      }

      throw new Error('No se pudo enviar el correo de recuperación.');
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
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
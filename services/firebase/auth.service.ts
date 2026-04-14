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

const normalizeCedula = (value: string): string => value.replace(/[^\d]/g, '').trim();
const buildEmailFromCedula = (cedula: string): string => `${normalizeCedula(cedula)}@farmaya.app`;
const normalizeIdentifier = (value: string): string => value.trim().toLowerCase();

const resolveCandidateEmails = async (cedulaOrEmail: string): Promise<string[]> => {
  const identifier = normalizeIdentifier(cedulaOrEmail);
  const candidates = new Set<string>();

  if (identifier.includes('@')) {
    candidates.add(identifier);
  } else if (identifier.length > 0) {
    const rawCedula = cedulaOrEmail.trim();
    const cleanCedula = normalizeCedula(rawCedula);
    if (cleanCedula.length > 0) {
      candidates.add(buildEmailFromCedula(cleanCedula));
    }

    if (rawCedula.length > 0 && rawCedula !== cleanCedula) {
      candidates.add(buildEmailFromCedula(rawCedula));
    }

    // Compatibilidad para cuentas previas donde cedula pudo guardarse con formato distinto.
    const queries = [query(collection(db, 'usuarios'), where('cedula', '==', rawCedula))];
    if (cleanCedula.length > 0 && cleanCedula !== rawCedula) {
      queries.push(query(collection(db, 'usuarios'), where('cedula', '==', cleanCedula)));
    }

    // Compatibilidad para cuentas legacy con cedula almacenada como número.
    const numericCedula = Number(cleanCedula);
    if (!Number.isNaN(numericCedula) && cleanCedula.length > 0) {
      queries.push(query(collection(db, 'usuarios'), where('cedula', '==', numericCedula)));
    }

    for (const q of queries) {
      const usuariosSnap = await getDocs(q);
      for (const docSnap of usuariosSnap.docs) {
        const perfil = docSnap.data() as { email?: string };
        if (perfil?.email?.includes('@')) {
          candidates.add(normalizeIdentifier(perfil.email));
        }
      }
    }
  }

  return Array.from(candidates);
};

export const authService = {
  async iniciarSesionConCedula(cedulaOrEmail: string, contrasena: string): Promise<User> {
    try {
      const candidates = await resolveCandidateEmails(cedulaOrEmail);
      if (!candidates.length) {
        throw new Error('Usuario o contraseña incorrecto.');
      }

      let lastError: unknown = null;
      for (const email of candidates) {
        try {
          const credential = await signInWithEmailAndPassword(auth, email, contrasena);
          const token = await credential.user.getIdToken();
          await SecureStore.setItemAsync(TOKEN_KEY, token);
          return credential.user;
        } catch (error) {
          lastError = error;
        }
      }

      const code = (lastError as { code?: string } | null)?.code;
      if (code === 'auth/network-request-failed') {
        throw new Error('Sin conexión. Verifica tu red e intenta de nuevo.');
      }

      throw new Error('Usuario o contraseña incorrecto.');
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Usuario o contraseña incorrecto.');
    }
  },

  async registrarUsuario(
    cedula: string,
    email: string,
    contrasena: string,
    data: Omit<Usuario, 'uid' | 'creadoEn'>
  ): Promise<void> {
    try {
      const normalizedEmail = normalizeIdentifier(email);
      const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, contrasena);
      const normalizedCedula = normalizeCedula(cedula);

      await setDoc(doc(db, 'usuarios', credential.user.uid), {
        ...data,
        cedula: normalizedCedula,
        email: normalizedEmail,
        uid: credential.user.uid,
        creadoEn: serverTimestamp(),
      });
    } catch (error) {
      throw new Error('No fue posible registrar el usuario.');
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
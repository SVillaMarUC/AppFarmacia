import { ReactNode, createContext, useEffect, useMemo, useReducer } from 'react';
import type { User } from 'firebase/auth';
import { authService } from '@/services/firebase/auth.service';
import { firestoreService } from '@/services/firebase/firestore.service';
import type { Usuario } from '@/types';

type AuthState = {
  loading: boolean;
  firebaseUser: User | null;
  perfil: Usuario | null;
  error: string | null;
};

type AuthAction =
  | { type: 'START_LOADING' }
  | { type: 'SET_SESSION'; payload: { firebaseUser: User | null; perfil: Usuario | null } }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'SIGN_OUT' };

const initialState: AuthState = {
  loading: true,
  firebaseUser: null,
  perfil: null,
  error: null,
};

const reducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'START_LOADING':
      return { ...state, loading: true, error: null };
    case 'SET_SESSION':
      return {
        loading: false,
        firebaseUser: action.payload.firebaseUser,
        perfil: action.payload.perfil,
        error: null,
      };
    case 'SET_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'SIGN_OUT':
      return { ...initialState, loading: false };
    default:
      return state;
  }
};

type AuthContextValue = AuthState & {
  login: (cedula: string, contrasena: string) => Promise<void>;
  logout: () => Promise<void>;
  recargarPerfil: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const unsubscribe = authService.escucharSesion(async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          dispatch({ type: 'SIGN_OUT' });
          return;
        }

        await authService.refrescarTokenSiEsNecesario();
        const perfil = await firestoreService.obtenerUsuario(firebaseUser.uid);
        if (!perfil) {
          dispatch({ type: 'SET_ERROR', payload: 'Usuario sin perfil en Firestore. Inicia sesión de nuevo o regístralo.' });
          await authService.cerrarSesion();
          dispatch({ type: 'SIGN_OUT' });
          return;
        }
        dispatch({ type: 'SET_SESSION', payload: { firebaseUser, perfil } });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: 'No se pudo validar la sesión.' });
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const refreshInterval = setInterval(() => {
      void authService.refrescarTokenSiEsNecesario();
    }, 45 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login: async (cedula: string, contrasena: string) => {
        try {
          dispatch({ type: 'START_LOADING' });
          const user = await authService.iniciarSesionConCedula(cedula, contrasena);
          const perfil = await firestoreService.obtenerUsuario(user.uid);
          dispatch({ type: 'SET_SESSION', payload: { firebaseUser: user, perfil } });
        } catch (error) {
          dispatch({ type: 'SET_ERROR', payload: 'Credenciales inválidas.' });
          throw error;
        }
      },
      logout: async () => {
        try {
          await authService.cerrarSesion();
          dispatch({ type: 'SIGN_OUT' });
        } catch (error) {
          dispatch({ type: 'SET_ERROR', payload: 'No se pudo cerrar sesión.' });
        }
      },
      recargarPerfil: async () => {
        try {
          if (!state.firebaseUser) {
            return;
          }
          const perfil = await firestoreService.obtenerUsuario(state.firebaseUser.uid);
          dispatch({ type: 'SET_SESSION', payload: { firebaseUser: state.firebaseUser, perfil } });
        } catch (error) {
          dispatch({ type: 'SET_ERROR', payload: 'No se pudo recargar el perfil.' });
        }
      },
    }),
    [state]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
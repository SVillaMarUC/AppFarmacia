import { ReactNode } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';

type RoleGateProps = {
  role: 'afiliado' | 'administrador' | 'domiciliario' | 'despachador';
  children: ReactNode;
};

const rutasPorRol: Record<RoleGateProps['role'], `/(afiliado)/inicio` | `/(administrador)/dashboard` | `/(domiciliario)/pedidos-asignados` | `/(despachador)/inventario`> = {
  afiliado: '/(afiliado)/inicio',
  administrador: '/(administrador)/dashboard',
  domiciliario: '/(domiciliario)/pedidos-asignados',
  despachador: '/(despachador)/inventario',
};

export const RoleGate = ({ role, children }: RoleGateProps) => {
  const { loading, firebaseUser, perfil } = useAuth();

  if (loading) {
    return <LoadingOverlay texto="Validando permisos..." />;
  }

  if (!firebaseUser) {
    return <Redirect href="/(auth)/login" />;
  }

  const rolPerfil = perfil?.rol;
  if (!rolPerfil || !(rolPerfil in rutasPorRol)) {
    return <Redirect href="/(auth)/login" />;
  }

  if (perfil?.rol !== role) {
    return <Redirect href={rutasPorRol[rolPerfil as RoleGateProps['role']]} />;
  }

  return children;
};
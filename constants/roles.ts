export const ROLES = {
  AFILIADO: 'afiliado',
  ADMINISTRADOR: 'administrador',
  DOMICILIARIO: 'domiciliario',
  DESPACHADOR: 'despachador',
} as const;

export type Rol = (typeof ROLES)[keyof typeof ROLES];
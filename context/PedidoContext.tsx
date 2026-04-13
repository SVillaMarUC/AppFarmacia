import { ReactNode, createContext, useContext, useMemo, useReducer } from 'react';
import type { Pedido } from '@/types';

type PedidoState = {
  pedidos: Pedido[];
  pedidoActivo: Pedido | null;
};

type PedidoAction =
  | { type: 'SET_PEDIDOS'; payload: Pedido[] }
  | { type: 'SET_PEDIDO_ACTIVO'; payload: Pedido | null };

const initialState: PedidoState = {
  pedidos: [],
  pedidoActivo: null,
};

const reducer = (state: PedidoState, action: PedidoAction): PedidoState => {
  switch (action.type) {
    case 'SET_PEDIDOS':
      return { ...state, pedidos: action.payload };
    case 'SET_PEDIDO_ACTIVO':
      return { ...state, pedidoActivo: action.payload };
    default:
      return state;
  }
};

type PedidoContextValue = PedidoState & {
  setPedidos: (pedidos: Pedido[]) => void;
  setPedidoActivo: (pedido: Pedido | null) => void;
};

const PedidoContext = createContext<PedidoContextValue | null>(null);

export const PedidoProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const value = useMemo(
    () => ({
      ...state,
      setPedidos: (pedidos: Pedido[]) => dispatch({ type: 'SET_PEDIDOS', payload: pedidos }),
      setPedidoActivo: (pedido: Pedido | null) => dispatch({ type: 'SET_PEDIDO_ACTIVO', payload: pedido }),
    }),
    [state]
  );

  return <PedidoContext.Provider value={value}>{children}</PedidoContext.Provider>;
};

export const usePedido = () => {
  const context = useContext(PedidoContext);
  if (!context) {
    throw new Error('usePedido debe usarse dentro de PedidoProvider.');
  }
  return context;
};
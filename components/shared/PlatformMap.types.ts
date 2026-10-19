export interface MapMarker {
  id: string; // necesario para mover el mismo marcador sin recrearlo
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  color?: string;
  kind?: 'domiciliario' | 'destino' | 'punto';
}

export interface PlatformMapProps {
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  height?: number;
  markers?: MapMarker[];
}
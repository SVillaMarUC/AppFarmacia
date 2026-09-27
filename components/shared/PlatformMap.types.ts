export type MapMarker = {
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  color?: string;
};

export type PlatformMapProps = {
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  height?: number;
  markers?: MapMarker[];
};

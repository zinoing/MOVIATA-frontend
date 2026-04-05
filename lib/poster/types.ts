import type { ProfileUser } from '../../types/profile';

export type ExportRegion = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
};

export type ExportSize = {
  width: number;
  height: number;
  pixelRatio: number;
};

export type ExportCamera = {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
};

export type PosterExportSpec =
  | {
      mode: 'region';
      region: ExportRegion;
      size: ExportSize;
    }
  | {
      mode: 'camera';
      camera: ExportCamera;
      size: ExportSize;
    };

export type BasemapRequest = {
  region: ExportRegion;
  width: number;
  height: number;
  style: 'default' | 'contours';
  backgroundColor: 'white' | 'black';
};

export type BasemapResult = {
  imageUrl: string;
};

export type MapViewBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export type FixedMapViewState = {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
  bounds: MapViewBounds;
  width: number;
  height: number;
};

export type DesignConfig = {
  activityId: string;

  routeCoordinates: [number, number][];

  mapStyle: 'default' | 'contours';
  showMap: boolean;
  routeColor: 'red' | 'orange';
  backgroundColor: 'white' | 'black';
  showRoutePoints: boolean;

  title: string;
  date: string;
  location: string;
  distance: string;
  duration: string;
  units: 'km' | 'miles';

  shirtColor: 'white' | 'black';

  instagramEnabled: boolean;
  myInstagramId: string;
  selectedUsers: ProfileUser[];

  fixedMapViewState?: FixedMapViewState | null;
};
import type { DesignEditorState } from '../../components/DesignSettingsPanel';
import type { DesignConfig, FixedMapViewState } from './types';

export function buildDesignConfig(
  activityId: string,
  editor: DesignEditorState,
  routeCoordinates: [number, number][],
  fixedMapViewState: FixedMapViewState | null,
): DesignConfig {
  return {
    activityId,
    routeCoordinates,

    mapStyle: editor.showContours ? 'contours' : 'default',
    showMap: editor.showMap,
    routeColor: editor.routeColor,
    backgroundColor: editor.shirtColor === 'black' ? 'black' : 'white',
    showRoutePoints: editor.showRoutePoints,

    title: editor.title?.trim() || 'Untitled Activity',
    date: editor.date,
    location: editor.location?.trim() || '',
    distance: editor.distance,
    duration: editor.time,
    units: editor.units,

    shirtColor: editor.shirtColor,

    instagramEnabled: editor.instagramEnabled,
    myInstagramId: editor.myInstagramId,
    selectedUsers: editor.selectedUsers,

    fixedMapViewState,
  };
}
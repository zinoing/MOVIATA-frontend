import type { DesignConfig } from './poster/types';
import type { DesignEditorState } from '../components/DesignSettingsPanel';

export function buildDesignConfig(
  activityId: string,
  editor: DesignEditorState,
  coordinates: [number, number][],
): Readonly<DesignConfig> {
  const config: DesignConfig = {
    activityId,
    routeCoordinates: coordinates,
    mapStyle: editor.showContours ? 'contours' : 'default',
    showMap: true,
    routeColor: editor.routeColor,
    backgroundColor: editor.shirtColor,
    showRoutePoints: editor.showRoutePoints,
    title: editor.title,
    date: editor.date,
    location: editor.location,
    distance: editor.distance,
    duration: editor.time,
    units: editor.units,
    shirtColor: editor.shirtColor,
    instagramEnabled: editor.instagramEnabled,
    myInstagramId: editor.myInstagramId,
    selectedUsers: editor.selectedUsers,
  };

  return Object.freeze(config);
}
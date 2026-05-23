export type Mark = {
  id: string;
  name: string;
  isDestination: boolean;
  position: number; // 0–1 fraction along route coordinates
};

export function makeDefaultMarks(): Mark[] {
  return [
    { id: 'mk-start', name: 'start', isDestination: false, position: 0 },
    { id: 'mk-end',   name: 'end',   isDestination: false, position: 1 },
  ];
}

export type MapFeature =
  | { type: 'road'; name: string; className: 'primary' | 'secondary' | 'local'; coordinates: [number, number][] }
  | { type: 'water'; name: string; coordinates: [number, number][] }
  | { type: 'park'; name: string; coordinates: [number, number][] }

export const demoFeatures: MapFeature[] = [
  { type: 'water', name: 'Demo river', coordinates: [[-180, 18], [-110, 42], [-55, 34], [0, 55], [60, 38], [120, 64], [180, 44]] },
  { type: 'park', name: 'Demo green space', coordinates: [[-118, -70], [-55, -92], [18, -86], [44, -38], [-12, -18], [-82, -28]] },
  { type: 'road', name: 'Central Avenue', className: 'primary', coordinates: [[-190, -112], [-118, -58], [-55, -12], [12, 42], [88, 90], [190, 138]] },
  { type: 'road', name: 'Market Street', className: 'primary', coordinates: [[-176, 120], [-112, 72], [-48, 26], [20, -26], [88, -78], [172, -130]] },
  { type: 'road', name: 'North Road', className: 'secondary', coordinates: [[-38, 180], [-25, 112], [-18, 42], [-8, -28], [10, -100], [28, -180]] },
  { type: 'road', name: 'Station Road', className: 'secondary', coordinates: [[-180, 4], [-104, 10], [-28, 18], [52, 26], [128, 36], [190, 48]] },
  { type: 'road', name: 'Lake Road', className: 'local', coordinates: [[-140, -150], [-90, -112], [-28, -82], [32, -48], [92, -18], [150, 12]] },
  { type: 'road', name: 'Garden Lane', className: 'local', coordinates: [[-150, 150], [-92, 112], [-34, 78], [24, 42], [82, 8], [150, -30]] },
]

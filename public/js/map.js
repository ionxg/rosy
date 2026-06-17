/**
 * Map module
 * ----------
 * Creates the MapLibre GL map, enables 3D building extrusions and the
 * camera controls (zoom / rotate / tilt).
 */
import { CONFIG } from './config.js';

export function createMap() {
  const map = new maplibregl.Map({
    container: 'map',
    style: CONFIG.mapStyle,
    center: CONFIG.fallbackCenter,
    zoom: CONFIG.defaultZoom,
    pitch: CONFIG.tiltedPitch,
    bearing: -20,
    antialias: true,        // smoother building edges
    attributionControl: { compact: true },
  });

  // Gestures: rotate + pitch with two fingers / right-drag.
  map.dragRotate.enable();
  map.touchZoomRotate.enableRotation();
  map.keyboard.enable();

  // Built-in nav (zoom +/-, compass, pitch visualizer).
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
  map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

  map.on('load', () => add3DBuildings(map));
  return map;
}

/**
 * Adds a fill-extrusion layer driven by OpenMapTiles "building" data so the
 * city renders in 3D. Skips silently if the style lacks that source layer.
 */
function add3DBuildings(map) {
  // OpenFreeMap's vector source is named "openmaptiles".
  const sourceId = map.getStyle().sources.openmaptiles ? 'openmaptiles' : findVectorSource(map);
  if (!sourceId) return;

  if (map.getLayer('rosy-3d-buildings')) return;

  // Insert beneath the first symbol layer so labels stay on top.
  const labelLayer = map.getStyle().layers.find(
    (l) => l.type === 'symbol' && l.layout && l.layout['text-field']
  );

  map.addLayer(
    {
      id: 'rosy-3d-buildings',
      source: sourceId,
      'source-layer': 'building',
      type: 'fill-extrusion',
      minzoom: 14,
      paint: {
        'fill-extrusion-color': [
          'interpolate', ['linear'], ['get', 'render_height'],
          0, '#2a3038',
          50, '#39414c',
          200, '#4a5562',
        ],
        'fill-extrusion-height': [
          'interpolate', ['linear'], ['zoom'],
          14, 0,
          15.5, ['coalesce', ['get', 'render_height'], ['get', 'height'], 5],
        ],
        'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0],
        'fill-extrusion-opacity': 0.85,
      },
    },
    labelLayer ? labelLayer.id : undefined
  );
}

function findVectorSource(map) {
  const sources = map.getStyle().sources;
  return Object.keys(sources).find((id) => sources[id].type === 'vector');
}

/** Smoothly fly the camera to a position. */
export function flyTo(map, lng, lat, opts = {}) {
  map.flyTo({
    center: [lng, lat],
    zoom: opts.zoom ?? CONFIG.defaultZoom,
    pitch: opts.pitch ?? map.getPitch(),
    bearing: opts.bearing ?? map.getBearing(),
    duration: opts.duration ?? 1200,
    essential: true,
  });
}

/** Toggle between flat (2D) and tilted (3D) views. */
export function toggleTilt(map) {
  const tilted = map.getPitch() > 10;
  map.easeTo({ pitch: tilted ? CONFIG.flatPitch : CONFIG.tiltedPitch, duration: 500 });
}

/** Reset bearing + pitch to north-up tilted view. */
export function resetNorth(map) {
  map.easeTo({ bearing: 0, duration: 500 });
}

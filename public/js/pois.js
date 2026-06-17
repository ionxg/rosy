/**
 * POI module
 * ----------
 * Loads tourism points of interest from a JSON file and renders them as
 * tappable map markers. Tapping opens the shared info card.
 */
import { CONFIG } from './config.js';
import { openCard } from './ui.js';
import { translateToTarget, directionsUrl } from './geo.js';

export class POILayer {
  constructor(map) {
    this.map = map;
    this.markers = [];
    this.items = [];
  }

  async load() {
    const res = await fetch(CONFIG.poiData);
    if (!res.ok) throw new Error(`Failed to load POIs: ${res.status}`);
    this.items = await res.json();
    return this.items;
  }

  /** Render markers. `userLoc` enables the scatter-near-user demo helper. */
  render(userLoc) {
    this.clear();
    let data = this.items;
    if (CONFIG.scatterNearUser && userLoc) {
      data = translateToTarget(this.items, userLoc);
    }

    data.forEach((poi) => {
      const el = document.createElement('div');
      el.className = 'poi-marker';
      el.innerHTML = `<span>${poi.icon || '📍'}</span>`;
      el.title = poi.name;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        openCard({
          kind: 'poi',
          name: poi.name,
          photo: poi.photo,
          description: poi.description,
          address: poi.address,
          directionsUrl: poi.directionsUrl || directionsUrl(poi.lng, poi.lat),
        });
      });

      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([poi.lng, poi.lat])
        .addTo(this.map);
      this.markers.push(marker);
    });
  }

  clear() {
    this.markers.forEach((m) => m.remove());
    this.markers = [];
  }
}

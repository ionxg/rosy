/**
 * Sponsors module
 * ----------------
 * Data-driven "sponsored locations". Each sponsor renders as a distinct
 * faux-3D building marker. Clicking opens the info card with details, menu,
 * and/or current offer. New sponsors are added simply by appending to the
 * sponsors JSON file — no code changes required.
 */
import { CONFIG } from './config.js';
import { openCard } from './ui.js';
import { translateToTarget, directionsUrl } from './geo.js';

export class SponsorLayer {
  constructor(map) {
    this.map = map;
    this.markers = [];
    this.items = [];
  }

  async load() {
    const res = await fetch(CONFIG.sponsorData);
    if (!res.ok) throw new Error(`Failed to load sponsors: ${res.status}`);
    this.items = await res.json();
    return this.items;
  }

  render(userLoc) {
    this.clear();
    let data = this.items;
    if (CONFIG.scatterNearUser && userLoc) {
      data = translateToTarget(this.items, userLoc);
    }

    data.forEach((s) => {
      const el = document.createElement('div');
      el.className = 'sponsor-marker';
      el.style.setProperty('--c', s.color || '#ffb13d');
      el.innerHTML = `
        <div class="tag">${s.tag || 'Ad'}</div>
        <div class="building">${s.icon || '🍽️'}</div>
      `;
      el.title = s.name;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        openCard({
          kind: 'sponsor',
          name: s.name,
          photo: s.photo,
          description: s.description,
          badge: s.category ? `Sponsored · ${s.category}` : 'Sponsored',
          offer: s.offer,
          menu: s.menu,
          address: s.address,
          directionsUrl: s.directionsUrl || directionsUrl(s.lng, s.lat),
        });
      });

      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([s.lng, s.lat])
        .addTo(this.map);
      this.markers.push(marker);
    });
  }

  clear() {
    this.markers.forEach((m) => m.remove());
    this.markers = [];
  }
}

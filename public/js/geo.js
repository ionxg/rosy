/**
 * Small geo helpers — no dependencies.
 */

/** Centroid (simple average) of an array of {lng,lat}. */
export function centroid(items) {
  const n = items.length || 1;
  const sum = items.reduce((a, i) => ({ lng: a.lng + i.lng, lat: a.lat + i.lat }), { lng: 0, lat: 0 });
  return { lng: sum.lng / n, lat: sum.lat / n };
}

/**
 * Translate a list of geo items so their centroid lands on `target`, preserving
 * their relative layout. Used by the "scatter near user" demo helper so sample
 * POIs/sponsors appear around wherever the user actually is.
 */
export function translateToTarget(items, target) {
  if (!items.length) return items;
  const c = centroid(items);
  const dLng = target.lng - c.lng;
  const dLat = target.lat - c.lat;
  return items.map((i) => ({ ...i, lng: i.lng + dLng, lat: i.lat + dLat }));
}

/** Google Maps directions URL to a destination. */
export function directionsUrl(lng, lat) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/** Bearing in degrees from point A to B (for facing the avatar). */
export function bearing(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

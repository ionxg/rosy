/**
 * native.js — Capacitor bridge helpers
 * ------------------------------------
 * When Rosy runs as an installed app (Android/iOS via Capacitor) the WebView's
 * navigator.geolocation only works once the OS has granted the runtime location
 * permission. We trigger that prompt via the Geolocation plugin (exposed on the
 * global Capacitor bridge). In a normal browser this is a no-op.
 */
export async function ensureLocationPermission() {
  const cap = window.Capacitor;
  if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return; // web browser
  try {
    const Geo = cap.Plugins && cap.Plugins.Geolocation;
    if (Geo && Geo.requestPermissions) {
      await Geo.requestPermissions({ permissions: ['location'] });
    }
  } catch (err) {
    console.warn('Native location permission request failed:', err);
  }
}

/**
 * Make sure the DEVICE's location services (the GPS master switch) are on.
 * On a packaged Android app this shows the Uber-style one-tap "turn on location"
 * system dialog in-app when GPS is off (via Google Play Services). Resolves to
 * `true` if location ends up enabled, `false` if the user declined or it
 * couldn't be resolved. No-op (returns true) in a normal browser.
 * @returns {Promise<boolean>}
 */
export function ensureLocationServices() {
  return new Promise((resolve) => {
    const cap = window.Capacitor;
    if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return resolve(true);
    const la = window.cordova && window.cordova.plugins && window.cordova.plugins.locationAccuracy;
    if (!la || !la.request) return resolve(true); // plugin missing — let GPS just try
    la.request(
      () => resolve(true),
      (err) => { console.warn('Turn-on-location request declined/failed:', err); resolve(false); },
      la.REQUEST_PRIORITY_HIGH_ACCURACY
    );
  });
}

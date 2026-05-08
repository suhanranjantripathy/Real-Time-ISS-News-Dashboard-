// Haversine formula to calculate distance between two lat/lng points in km
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate speed in km/h given two positions and a time delta in seconds
export function calcSpeed(lat1, lon1, lat2, lon2, timeDeltaSeconds) {
  if (timeDeltaSeconds <= 0) return 0;
  const dist = haversineDistance(lat1, lon1, lat2, lon2);
  return (dist / timeDeltaSeconds) * 3600;
}

// Format timestamp to HH:MM:SS
export function formatTime(ts) {
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString();
}

// Get nearest location label using reverse geocoding (no-key service)
export async function getNearestLocation(lat, lon) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    const addr = data.address;
    if (addr) {
      return (
        addr.city ||
        addr.town ||
        addr.village ||
        addr.county ||
        addr.state ||
        addr.country ||
        data.display_name?.split(',')[0] ||
        'Unknown'
      );
    }
    return 'Over Ocean';
  } catch {
    return 'Over Ocean';
  }
}

// Throttle helper
export function throttle(fn, ms) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      return fn(...args);
    }
  };
}

// LocalStorage helpers
export function lsGet(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
export function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

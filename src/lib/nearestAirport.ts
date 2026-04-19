import { majorAirports, type MajorAirport } from "@/data/majorAirports";

/**
 * Reverse-geocode a lat/lon to the nearest known ICAO airport from our static
 * dataset (`majorAirports`). Returns `null` if the closest airport is farther
 * than `maxKm` (default 50 km), so we don't mislabel an arbitrary point in the
 * middle of nowhere as "KJFK".
 *
 * Distance uses the haversine formula on a spherical Earth.
 */
const EARTH_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function nearestAirport(
  lat: number | null | undefined,
  lon: number | null | undefined,
  maxKm = 50,
): { airport: MajorAirport; distanceKm: number } | null {
  if (lat == null || lon == null || Number.isNaN(lat) || Number.isNaN(lon)) {
    return null;
  }
  let best: { airport: MajorAirport; distanceKm: number } | null = null;
  for (const ap of majorAirports) {
    const d = haversineKm({ lat, lon }, { lat: ap.lat, lon: ap.lng });
    if (best == null || d < best.distanceKm) {
      best = { airport: ap, distanceKm: d };
    }
  }
  if (!best || best.distanceKm > maxKm) return null;
  return best;
}

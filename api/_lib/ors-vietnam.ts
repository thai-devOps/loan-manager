/**
 * OpenRouteService / geocode defaults scoped to Việt Nam
 * (fleet ops: An Giang + Mekong Delta bias).
 */

/** Approximate Vietnam bounding box (WGS84). */
export const VN_BBOX = {
  minLat: 8.18,
  maxLat: 23.4,
  minLon: 102.14,
  maxLon: 109.5,
} as const;

/** Focus point — Long Xuyên, An Giang (primary service area). */
export const VN_FOCUS = {
  latitude: 10.3864,
  longitude: 105.4352,
} as const;

export function isInsideVietnam(lat: number, lon: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= VN_BBOX.minLat &&
    lat <= VN_BBOX.maxLat &&
    lon >= VN_BBOX.minLon &&
    lon <= VN_BBOX.maxLon
  );
}

/** Apply Vietnam country + rect + language params to an ORS geocode URL. */
export function applyOrsVietnamGeocodeParams(url: URL): void {
  url.searchParams.set("lang", "vi");
  url.searchParams.set("boundary.country", "VN");
  url.searchParams.set("boundary.rect.min_lat", String(VN_BBOX.minLat));
  url.searchParams.set("boundary.rect.max_lat", String(VN_BBOX.maxLat));
  url.searchParams.set("boundary.rect.min_lon", String(VN_BBOX.minLon));
  url.searchParams.set("boundary.rect.max_lon", String(VN_BBOX.maxLon));
  url.searchParams.set("focus.point.lat", String(VN_FOCUS.latitude));
  url.searchParams.set("focus.point.lon", String(VN_FOCUS.longitude));
}

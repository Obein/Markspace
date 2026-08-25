/**
 * GeoDistanceService
 * 
 * Computes great-circle geographical distances using the standard Haversine formula
 * for continuous dynamic zero-trust session anomaly detection (>50km threshold).
 */
export class GeoDistanceService {
  /** Earth mean radius in kilometers */
  private static readonly EARTH_RADIUS_KM = 6371;

  /** Maximum permitted geographic shift within an active continuous session before termination */
  public static readonly MAX_ANOMALY_DISTANCE_KM = 50;

  /**
   * Converts degrees to radians.
   */
  private static toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Validates latitude (-90 to 90) and longitude (-180 to 180).
   */
  public static isValidCoordinate(lat?: number | null, lon?: number | null): boolean {
    if (lat === null || lat === undefined || lon === null || lon === undefined) {
      return false;
    }
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      return false;
    }
    if (isNaN(lat) || isNaN(lon)) {
      return false;
    }
    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  }

  /**
   * Calculates the Haversine great-circle distance between two geographical points in kilometers.
   * 
   * @param lat1 Latitude of point 1 (in degrees)
   * @param lon1 Longitude of point 1 (in degrees)
   * @param lat2 Latitude of point 2 (in degrees)
   * @param lon2 Longitude of point 2 (in degrees)
   * @returns Distance in kilometers
   */
  public static calculateDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    if (!this.isValidCoordinate(lat1, lon1) || !this.isValidCoordinate(lat2, lon2)) {
      return 0;
    }

    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const radLat1 = this.toRadians(lat1);
    const radLat2 = this.toRadians(lat2);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));

    return this.EARTH_RADIUS_KM * c;
  }

  /**
   * Checks whether the geographic shift between initial and current session coordinates
   * exceeds the maximum allowed anomaly threshold (50km).
   */
  public static isGeoAnomaly(
    initialLat?: number | null,
    initialLon?: number | null,
    currentLat?: number | null,
    currentLon?: number | null,
    maxAllowedKm: number = GeoDistanceService.MAX_ANOMALY_DISTANCE_KM
  ): { isAnomaly: boolean; distanceKm: number } {
    if (
      !this.isValidCoordinate(initialLat, initialLon) ||
      !this.isValidCoordinate(currentLat, currentLon)
    ) {
      // If coordinates are missing (e.g. local dev / localhost / CF geo unavailable), do not falsely terminate
      return { isAnomaly: false, distanceKm: 0 };
    }

    const distanceKm = this.calculateDistanceKm(
      initialLat!,
      initialLon!,
      currentLat!,
      currentLon!
    );

    return {
      isAnomaly: distanceKm > maxAllowedKm,
      distanceKm,
    };
  }
}

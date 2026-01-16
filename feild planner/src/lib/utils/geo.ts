/**
 * Geographic coordinate utilities for satellite map integration.
 *
 * Converts between the app's local coordinate system (field inches)
 * and geographic coordinates (latitude/longitude) for Mapbox.
 */

// Constants
const INCHES_PER_METER = 39.3701;
const EARTH_RADIUS_METERS = 6378137; // WGS84 equatorial radius
const METERS_PER_PIXEL_AT_ZOOM_0 = 156543.03392; // At equator, zoom level 0

/**
 * Convert field position (inches from origin) to geographic coordinates.
 *
 * Uses a flat-earth approximation which is accurate to <1 inch for
 * garden-scale distances (up to ~100 yards). For larger areas, consider
 * using proper geodesic calculations.
 *
 * @param fieldX - X position in field inches (positive = east)
 * @param fieldY - Y position in field inches (positive = north)
 * @param anchor - Geographic coordinates of field origin
 * @param bearing - Field orientation in degrees clockwise from true north
 */
export function fieldToGeo(
	fieldX: number,
	fieldY: number,
	anchor: { lat: number; lng: number },
	bearing: number = 0
): { lat: number; lng: number } {
	// Convert inches to meters
	const metersX = fieldX / INCHES_PER_METER;
	const metersY = fieldY / INCHES_PER_METER;

	// Rotate by bearing (field Y points along bearing direction)
	const bearingRad = (bearing * Math.PI) / 180;
	const cos = Math.cos(bearingRad);
	const sin = Math.sin(bearingRad);

	// Rotated coordinates in meters (east, north)
	const eastMeters = metersX * cos - metersY * sin;
	const northMeters = metersX * sin + metersY * cos;

	// Convert meters to lat/lng delta
	// Latitude: meters / earth radius (in radians), then to degrees
	const latOffset = (northMeters / EARTH_RADIUS_METERS) * (180 / Math.PI);

	// Longitude: adjusted for latitude (meridians converge toward poles)
	const latRad = anchor.lat * (Math.PI / 180);
	const lngOffset = (eastMeters / (EARTH_RADIUS_METERS * Math.cos(latRad))) * (180 / Math.PI);

	return {
		lat: anchor.lat + latOffset,
		lng: anchor.lng + lngOffset
	};
}

/**
 * Convert geographic coordinates to field position (inches from origin).
 *
 * Inverse of fieldToGeo - same flat-earth approximation.
 *
 * @param lat - Latitude
 * @param lng - Longitude
 * @param anchor - Geographic coordinates of field origin
 * @param bearing - Field orientation in degrees clockwise from true north
 */
export function geoToField(
	lat: number,
	lng: number,
	anchor: { lat: number; lng: number },
	bearing: number = 0
): { x: number; y: number } {
	// Convert lat/lng delta to meters
	const latDelta = lat - anchor.lat;
	const lngDelta = lng - anchor.lng;

	// Latitude delta to meters
	const northMeters = latDelta * (Math.PI / 180) * EARTH_RADIUS_METERS;

	// Longitude delta to meters (adjusted for latitude)
	const latRad = anchor.lat * (Math.PI / 180);
	const eastMeters = lngDelta * (Math.PI / 180) * EARTH_RADIUS_METERS * Math.cos(latRad);

	// Reverse rotation by bearing
	const bearingRad = (bearing * Math.PI) / 180;
	const cos = Math.cos(bearingRad);
	const sin = Math.sin(bearingRad);

	// Inverse rotation: [cos, sin; -sin, cos]^-1 = [cos, -sin; sin, cos]
	const metersX = eastMeters * cos + northMeters * sin;
	const metersY = -eastMeters * sin + northMeters * cos;

	// Convert meters to inches
	return {
		x: metersX * INCHES_PER_METER,
		y: metersY * INCHES_PER_METER
	};
}

/**
 * Calculate the Mapbox zoom level that matches our app's scale.
 *
 * At a given app zoom and pixelsPerInch, this returns the Mapbox zoom
 * level that renders real-world distances at the same pixel size.
 *
 * @param pixelsPerInch - App's base scale (default 12)
 * @param appZoom - App's current zoom level
 * @param latitude - Map center latitude (affects Mercator scale)
 */
export function getMapboxZoomForScale(
	pixelsPerInch: number,
	appZoom: number,
	latitude: number
): number {
	// Our app: 1 inch = pixelsPerInch * appZoom pixels
	// So 1 meter = pixelsPerInch * appZoom * INCHES_PER_METER pixels
	const appPixelsPerMeter = pixelsPerInch * appZoom * INCHES_PER_METER;

	// Mapbox: meters per pixel at zoom Z and latitude L
	// = METERS_PER_PIXEL_AT_ZOOM_0 * cos(L) / 2^Z
	// So pixels per meter = 2^Z / (METERS_PER_PIXEL_AT_ZOOM_0 * cos(L))

	// Solve for Z: appPixelsPerMeter = 2^Z / (METERS_PER_PIXEL_AT_ZOOM_0 * cos(L))
	// 2^Z = appPixelsPerMeter * METERS_PER_PIXEL_AT_ZOOM_0 * cos(L)
	// Z = log2(appPixelsPerMeter * METERS_PER_PIXEL_AT_ZOOM_0 * cos(L))

	const latRad = latitude * (Math.PI / 180);
	const cosLat = Math.cos(latRad);

	const mapboxZoom = Math.log2(appPixelsPerMeter * METERS_PER_PIXEL_AT_ZOOM_0 * cosLat);

	// Clamp to valid Mapbox zoom range
	return Math.max(0, Math.min(22, mapboxZoom));
}

/**
 * Calculate the center point for Mapbox given app pan offset.
 *
 * When the app pans, we need to adjust the Mapbox center so the
 * satellite imagery stays aligned with the SVG canvas.
 *
 * @param anchor - Geographic coordinates of field origin
 * @param panX - App's pan X offset in pixels
 * @param panY - App's pan Y offset in pixels
 * @param pixelsPerInch - App's base scale
 * @param appZoom - App's current zoom level
 * @param bearing - Field orientation in degrees
 * @param viewportWidth - Viewport width in pixels
 * @param viewportHeight - Viewport height in pixels
 */
export function getMapCenterFromPan(
	anchor: { lat: number; lng: number },
	panX: number,
	panY: number,
	pixelsPerInch: number,
	appZoom: number,
	bearing: number,
	viewportWidth: number,
	viewportHeight: number
): { lat: number; lng: number } {
	// The map center should be at the center of the viewport
	// The anchor point is at (panX, panY) in canvas space
	// So the center is offset from anchor by (viewportWidth/2 - panX, viewportHeight/2 - panY) pixels

	// Convert pixel offset to field inches
	const scale = pixelsPerInch * appZoom;
	const offsetInchesX = (viewportWidth / 2 - panX) / scale;
	const offsetInchesY = (viewportHeight / 2 - panY) / scale;

	// Note: In SVG, Y increases downward, but in our field coordinates
	// Y increases upward (north). The SVG is flipped, so we negate Y.
	// Actually, looking at the coordinate system, let's keep it simple:
	// We'll calculate the geo center directly.

	return fieldToGeo(-offsetInchesX, offsetInchesY, anchor, bearing);
}

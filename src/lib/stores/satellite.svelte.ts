/**
 * Satellite map state management.
 * Controls Mapbox satellite imagery as an optional canvas background.
 */
import type mapboxgl from 'mapbox-gl';

export interface SatelliteState {
	/** Whether satellite mode is enabled */
	enabled: boolean;
	/** GPS latitude of field origin (center of view) */
	anchorLat: number;
	/** GPS longitude of field origin (center of view) */
	anchorLng: number;
	/** GPS request in progress */
	isLocating: boolean;
	/** Error message from GPS or map loading */
	locationError: string | null;
	/** Reference to Mapbox map instance (for imperative control) */
	mapInstance: mapboxgl.Map | null;
}

// Default location: approximate center of continental US (for initial state)
const DEFAULT_LAT = 39.8283;
const DEFAULT_LNG = -98.5795;

export const satelliteState = $state<SatelliteState>({
	enabled: false,
	anchorLat: DEFAULT_LAT,
	anchorLng: DEFAULT_LNG,
	isLocating: false,
	locationError: null,
	mapInstance: null
});

/**
 * Enable satellite mode. If no location is set, triggers GPS request.
 */
export function enableSatellite(): void {
	satelliteState.enabled = true;
	// If we haven't located yet, request GPS
	if (satelliteState.anchorLat === DEFAULT_LAT && satelliteState.anchorLng === DEFAULT_LNG) {
		requestGeolocation();
	}
}

/**
 * Disable satellite mode and return to grid view.
 */
export function disableSatellite(): void {
	satelliteState.enabled = false;
	satelliteState.locationError = null;
}

/**
 * Toggle satellite mode on/off.
 */
export function toggleSatellite(): void {
	if (satelliteState.enabled) {
		disableSatellite();
	} else {
		enableSatellite();
	}
}

/**
 * Set the anchor point (field origin) to specific coordinates.
 */
export function setAnchor(lat: number, lng: number): void {
	satelliteState.anchorLat = lat;
	satelliteState.anchorLng = lng;
	satelliteState.locationError = null;
}

/**
 * Store reference to Mapbox map instance for external control.
 */
export function setMapInstance(map: mapboxgl.Map | null): void {
	satelliteState.mapInstance = map;
}

/**
 * Request device geolocation and update anchor point.
 */
export function requestGeolocation(): void {
	if (!navigator.geolocation) {
		satelliteState.locationError = 'Geolocation is not supported by your browser';
		return;
	}

	satelliteState.isLocating = true;
	satelliteState.locationError = null;

	navigator.geolocation.getCurrentPosition(
		(position) => {
			satelliteState.anchorLat = position.coords.latitude;
			satelliteState.anchorLng = position.coords.longitude;
			satelliteState.isLocating = false;
			satelliteState.locationError = null;
		},
		(error) => {
			satelliteState.isLocating = false;
			switch (error.code) {
				case error.PERMISSION_DENIED:
					satelliteState.locationError = 'Location permission denied';
					break;
				case error.POSITION_UNAVAILABLE:
					satelliteState.locationError = 'Location unavailable';
					break;
				case error.TIMEOUT:
					satelliteState.locationError = 'Location request timed out';
					break;
				default:
					satelliteState.locationError = 'Failed to get location';
			}
		},
		{
			enableHighAccuracy: true,
			timeout: 10000,
			maximumAge: 60000 // Cache location for 1 minute
		}
	);
}

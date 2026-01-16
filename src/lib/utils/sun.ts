/**
 * Sun position calculations using suncalc library.
 * Provides altitude and azimuth for shadow simulation.
 */
import SunCalc from 'suncalc';

export interface SunPosition {
	altitude: number; // degrees above horizon (0-90, negative if below)
	azimuth: number; // degrees from North, clockwise (0-360)
	isNight: boolean; // true if sun is below horizon
}

const MONTH_NAMES = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
];

/**
 * Calculate sun position for a given latitude, month, and time of day.
 *
 * @param latitude - Latitude in degrees (-90 to 90)
 * @param month - Month as continuous value (0-11.99, allows smooth interpolation)
 * @param timeOfDay - Time as fraction of daylight hours (0 = sunrise, 1 = sunset)
 * @returns Sun position with altitude and azimuth in degrees
 */
export function calculateSunPosition(
	latitude: number,
	month: number,
	timeOfDay: number
): SunPosition {
	// Clamp inputs to valid ranges
	latitude = Math.max(-90, Math.min(90, latitude));
	month = Math.max(0, Math.min(11.99, month));
	timeOfDay = Math.max(0, Math.min(1, timeOfDay));

	// Build a date for the given month with smooth day interpolation
	const year = new Date().getFullYear();
	const monthFloor = Math.floor(month);
	const monthFraction = month - monthFloor;

	// Get days in this month for proper interpolation
	const daysInMonth = new Date(year, monthFloor + 1, 0).getDate();
	// Day of month: 1 at start of month, last day at end
	// This ensures smooth transitions: Jan 31 (month ~0.97) → Feb 1 (month ~1.0)
	const dayOfMonth = Math.max(1, Math.min(daysInMonth, Math.round(1 + monthFraction * (daysInMonth - 1))));
	const date = new Date(year, monthFloor, dayOfMonth);

	// Get sunrise and sunset times for this date and latitude
	// Use longitude 0 for solar time (we only care about relative position)
	const times = SunCalc.getTimes(date, latitude, 0);

	// Handle polar day/night
	if (isNaN(times.sunrise.getTime()) || isNaN(times.sunset.getTime())) {
		// Polar conditions - check if it's polar day or polar night
		const noonPos = SunCalc.getPosition(new Date(year, monthFloor, 15, 12, 0, 0), latitude, 0);
		if (noonPos.altitude > 0) {
			// Polar day - sun is always up
			const hour = 6 + timeOfDay * 12; // Map 0-1 to 6am-6pm
			const testTime = new Date(year, monthFloor, 15, hour, 0, 0);
			const pos = SunCalc.getPosition(testTime, latitude, 0);
			return {
				altitude: pos.altitude * (180 / Math.PI),
				azimuth: ((pos.azimuth * (180 / Math.PI) + 180) % 360 + 360) % 360,
				isNight: false
			};
		} else {
			// Polar night - sun is always down
			return {
				altitude: -10,
				azimuth: 180,
				isNight: true
			};
		}
	}

	// Interpolate time between sunrise and sunset
	const sunriseMs = times.sunrise.getTime();
	const sunsetMs = times.sunset.getTime();
	const currentMs = sunriseMs + timeOfDay * (sunsetMs - sunriseMs);
	const currentTime = new Date(currentMs);

	// Get sun position at this time
	const pos = SunCalc.getPosition(currentTime, latitude, 0);

	// Convert from radians to degrees
	// suncalc azimuth: 0 = south, positive = west
	// We want: 0 = north, clockwise
	const altitudeDeg = pos.altitude * (180 / Math.PI);
	const azimuthDeg = ((pos.azimuth * (180 / Math.PI) + 180) % 360 + 360) % 360;

	return {
		altitude: altitudeDeg,
		azimuth: azimuthDeg,
		isNight: altitudeDeg < 0
	};
}

/**
 * Get the name of a month from its index.
 */
export function getMonthName(month: number): string {
	return MONTH_NAMES[Math.floor(month) % 12];
}

/**
 * Format time of day (0-1) as human-readable string.
 * Assumes daylight hours roughly 6am-6pm for display purposes.
 */
export function formatTimeOfDay(timeOfDay: number): string {
	// Map 0-1 to approximate clock time during daylight
	// 0 = ~6am (sunrise), 0.5 = ~noon, 1 = ~6pm (sunset)
	const hours = 6 + timeOfDay * 12;
	const hour = Math.floor(hours);
	const minutes = Math.round((hours - hour) * 60);

	const period = hour >= 12 ? 'PM' : 'AM';
	const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;

	return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Get daylight hours for a given latitude and month.
 * Useful for displaying "X hours of daylight" info.
 */
export function getDaylightHours(latitude: number, month: number): number {
	const year = new Date().getFullYear();
	const monthFloor = Math.floor(month);
	const date = new Date(year, monthFloor, 15);

	const times = SunCalc.getTimes(date, latitude, 0);

	if (isNaN(times.sunrise.getTime()) || isNaN(times.sunset.getTime())) {
		// Polar conditions
		const noonPos = SunCalc.getPosition(new Date(year, monthFloor, 15, 12, 0, 0), latitude, 0);
		return noonPos.altitude > 0 ? 24 : 0;
	}

	const daylightMs = times.sunset.getTime() - times.sunrise.getTime();
	return daylightMs / (1000 * 60 * 60);
}

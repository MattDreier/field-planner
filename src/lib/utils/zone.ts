import type { ZoneType, FenceVertex, ZoneVertex } from '$lib/types';

/**
 * Zone type color defaults (semi-transparent fills)
 */
export const ZONE_COLORS: Record<ZoneType, string> = {
	lawn: 'hsla(120, 50%, 60%, 0.25)',
	mulch: 'hsla(20, 50%, 35%, 0.3)',
	rocks: 'hsla(30, 10%, 55%, 0.25)',
	water: 'hsla(210, 60%, 55%, 0.3)',
	landscape_fabric: 'hsla(260, 15%, 25%, 0.3)',
	patio: 'hsla(0, 0%, 45%, 0.2)',
	other: 'hsla(210, 30%, 60%, 0.25)'
};

/**
 * Zone type stroke colors (hue-matched, higher opacity for visibility on dark canvas)
 */
export const ZONE_STROKES: Record<ZoneType, string> = {
	lawn: 'hsla(120, 30%, 50%, 0.55)',
	mulch: 'hsla(20, 30%, 30%, 0.55)',
	rocks: 'hsla(30, 8%, 45%, 0.55)',
	water: 'hsla(210, 40%, 45%, 0.55)',
	landscape_fabric: 'hsla(260, 10%, 35%, 0.55)',
	patio: 'hsla(0, 0%, 40%, 0.5)',
	other: 'hsla(210, 20%, 45%, 0.55)'
};

/**
 * Human-readable zone type labels
 */
export const ZONE_LABELS: Record<ZoneType, string> = {
	lawn: 'Lawn',
	mulch: 'Mulch',
	rocks: 'Rocks',
	water: 'Water',
	landscape_fabric: 'Landscape Fabric',
	patio: 'Concrete',
	other: 'Other'
};

/**
 * Sample points along a cubic bezier curve at uniform t values.
 */
export function sampleBezier(
	p0: { x: number; y: number },
	cp1: { x: number; y: number },
	cp2: { x: number; y: number },
	p1: { x: number; y: number },
	numSamples = 20
): { x: number; y: number }[] {
	const points: { x: number; y: number }[] = [];
	for (let i = 1; i <= numSamples; i++) {
		const t = i / numSamples;
		const t2 = t * t;
		const t3 = t2 * t;
		const mt = 1 - t;
		const mt2 = mt * mt;
		const mt3 = mt2 * mt;
		points.push({
			x: mt3 * p0.x + 3 * mt2 * t * cp1.x + 3 * mt * t2 * cp2.x + t3 * p1.x,
			y: mt3 * p0.y + 3 * mt2 * t * cp1.y + 3 * mt * t2 * cp2.y + t3 * p1.y
		});
	}
	return points;
}

/**
 * Build an SVG path string from zone vertices with optional bezier control points.
 */
export function buildZonePath(verts: ZoneVertex[]): string {
	if (verts.length < 3) return '';
	let d = `M ${verts[0].x},${verts[0].y}`;
	for (let i = 1; i <= verts.length; i++) {
		const prev = verts[i - 1];
		const curr = verts[i % verts.length];
		const hasCP1 = prev.cp1;
		const hasCP2 = curr.cp2;
		if (hasCP1 || hasCP2) {
			const cp1x = hasCP1 ? prev.cp1!.x : prev.x;
			const cp1y = hasCP1 ? prev.cp1!.y : prev.y;
			const cp2x = hasCP2 ? curr.cp2!.x : curr.x;
			const cp2y = hasCP2 ? curr.cp2!.y : curr.y;
			d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${curr.x},${curr.y}`;
		} else {
			d += ` L ${curr.x},${curr.y}`;
		}
	}
	d += ' Z';
	return d;
}

/**
 * Check if any vertex in the array has bezier control points.
 */
function hasCurves(vertices: ZoneVertex[]): boolean {
	return vertices.some(v => v.cp1 || v.cp2);
}

/**
 * Expand zone vertices into a dense point array, sampling bezier curves.
 * Straight edges produce their endpoint directly; curved edges produce sampled points.
 */
export function expandToSampledPoints(vertices: ZoneVertex[]): { x: number; y: number }[] {
	const points: { x: number; y: number }[] = [];
	const n = vertices.length;
	for (let i = 0; i < n; i++) {
		const prev = vertices[i];
		const curr = vertices[(i + 1) % n];
		points.push({ x: prev.x, y: prev.y });
		const hasCP1 = prev.cp1;
		const hasCP2 = curr.cp2;
		if (hasCP1 || hasCP2) {
			const cp1 = hasCP1 ? prev.cp1! : { x: prev.x, y: prev.y };
			const cp2 = hasCP2 ? curr.cp2! : { x: curr.x, y: curr.y };
			const sampled = sampleBezier(prev, cp1, cp2, curr, 20);
			points.push(...sampled);
		}
	}
	return points;
}

/**
 * Calculate polygon area using the shoelace formula.
 * For zones with bezier curves, approximates by sampling points along the curves.
 * Returns area in square inches (vertices are in field inches).
 */
export function calculatePolygonArea(vertices: ZoneVertex[] | FenceVertex[]): number {
	if (vertices.length < 3) return 0;

	// If any vertex has control points, expand curves to sampled points
	const pts = hasCurves(vertices as ZoneVertex[])
		? expandToSampledPoints(vertices as ZoneVertex[])
		: vertices;

	let area = 0;
	const n = pts.length;

	for (let i = 0; i < n; i++) {
		const j = (i + 1) % n;
		area += pts[i].x * pts[j].y;
		area -= pts[j].x * pts[i].y;
	}

	return Math.abs(area) / 2;
}

/**
 * Convert square inches to square feet
 */
export function sqInchesToSqFeet(sqInches: number): number {
	return sqInches / 144;
}

/**
 * Calculate volume in cubic yards from area (sq inches) and depth (inches).
 * 1 cubic yard = 46,656 cubic inches
 */
export function calculateCubicYards(areaSqInches: number, depthInches: number): number {
	return (areaSqInches * depthInches) / 46656;
}

/**
 * Calculate total fabric roll length needed (in inches) for a zone.
 * Uses scanline intersection to measure each strip's length in the rotated frame,
 * matching the same geometry used to render seam lines.
 */
export function calculateFabricRollLength(
	vertices: ZoneVertex[],
	fabricWidthInches: number,
	overlapInches: number,
	rotationDeg: number
): number {
	if (vertices.length < 3 || fabricWidthInches <= 0) return 0;
	const effectiveWidth = fabricWidthInches - overlapInches;
	if (effectiveWidth <= 0) return 0;

	// Expand curves to dense point array
	const pts = hasCurves(vertices) ? expandToSampledPoints(vertices) : vertices.map(v => ({ x: v.x, y: v.y }));

	// Centroid for rotation pivot
	let cx = 0, cy = 0;
	for (const p of pts) { cx += p.x; cy += p.y; }
	cx /= pts.length;
	cy /= pts.length;

	// Rotate into seam-aligned frame
	const rad = -rotationDeg * Math.PI / 180;
	const cos = Math.cos(rad);
	const sin = Math.sin(rad);
	const rotated = pts.map(p => {
		const dx = p.x - cx;
		const dy = p.y - cy;
		return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
	});

	let minY = Infinity, maxY = -Infinity;
	for (const v of rotated) {
		if (v.y < minY) minY = v.y;
		if (v.y > maxY) maxY = v.y;
	}

	const n = rotated.length;

	// Find the full horizontal extent of the polygon at a given Y
	function extentAtY(y: number): number {
		const intersections: number[] = [];
		for (let i = 0; i < n; i++) {
			const a = rotated[i];
			const b = rotated[(i + 1) % n];
			if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) {
				const t = (y - a.y) / (b.y - a.y);
				intersections.push(a.x + t * (b.x - a.x));
			}
		}
		if (intersections.length < 2) return 0;
		return Math.max(...intersections) - Math.min(...intersections);
	}

	let totalLength = 0;
	const samplesPerStrip = 5;

	// Walk strip bands from minY to maxY
	for (let bandStart = minY; bandStart < maxY; bandStart += effectiveWidth) {
		const bandEnd = Math.min(bandStart + effectiveWidth, maxY);
		let maxExtent = 0;

		// Sample multiple scanlines within the band to find the widest point
		for (let s = 0; s < samplesPerStrip; s++) {
			const y = bandStart + (bandEnd - bandStart) * (s + 0.5) / samplesPerStrip;
			const extent = extentAtY(y);
			if (extent > maxExtent) maxExtent = extent;
		}

		totalLength += maxExtent;
	}

	return totalLength;
}

<script lang="ts">
	/**
	 * Mapbox GL JS satellite imagery background layer.
	 *
	 * Renders beneath the SVG canvas to provide real-world satellite imagery
	 * as a garden planning reference. Syncs with app zoom, pan, and rotation.
	 */
	import { onMount, onDestroy } from 'svelte';
	import { setMapInstance } from '$lib/stores/satellite.svelte';
	import { getMapboxZoomForScale, getMapCenterFromPan } from '$lib/utils/geo';
	import type mapboxgl from 'mapbox-gl';

	interface Props {
		/** Geographic latitude of field origin */
		anchorLat: number;
		/** Geographic longitude of field origin */
		anchorLng: number;
		/** Field rotation in degrees clockwise from north */
		bearing: number;
		/** App zoom level */
		zoom: number;
		/** App pan X offset in pixels */
		panX: number;
		/** App pan Y offset in pixels */
		panY: number;
		/** Base pixels per inch (default 12) */
		pixelsPerInch: number;
	}

	let {
		anchorLat,
		anchorLng,
		bearing,
		zoom,
		panX,
		panY,
		pixelsPerInch
	}: Props = $props();

	let container: HTMLDivElement;
	let map: mapboxgl.Map | null = null;
	let MapboxGL: typeof import('mapbox-gl').default | null = null;
	let resizeObserver: ResizeObserver | null = null;

	// Track viewport dimensions (managed internally via ResizeObserver)
	let viewportWidth = $state(800);
	let viewportHeight = $state(600);

	// Track if we're currently syncing to prevent feedback loops
	let isSyncing = false;

	onMount(() => {
		// Set up ResizeObserver to track container dimensions
		resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				viewportWidth = entry.contentRect.width;
				viewportHeight = entry.contentRect.height;
			}
		});
		resizeObserver.observe(container);

		// Initialize map asynchronously
		initializeMap();
	});

	async function initializeMap() {
		// Dynamically import mapbox-gl (browser-only)
		const mb = await import('mapbox-gl');
		MapboxGL = mb.default;

		// Import CSS
		await import('mapbox-gl/dist/mapbox-gl.css');

		// Get access token from environment
		const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
		if (!accessToken) {
			console.error('VITE_MAPBOX_ACCESS_TOKEN not set. Get a free token at https://account.mapbox.com/');
			return;
		}

		MapboxGL.accessToken = accessToken;

		// Calculate initial map state
		const mapZoom = getMapboxZoomForScale(pixelsPerInch, zoom, anchorLat);
		const center = getMapCenterFromPan(
			{ lat: anchorLat, lng: anchorLng },
			panX,
			panY,
			pixelsPerInch,
			zoom,
			bearing,
			viewportWidth,
			viewportHeight
		);

		// Create map instance
		map = new MapboxGL.Map({
			container,
			style: 'mapbox://styles/mapbox/satellite-v9',
			center: [center.lng, center.lat],
			zoom: mapZoom,
			bearing: bearing,
			pitch: 0,
			interactive: false, // We control pan/zoom from the SVG layer
			attributionControl: true,
			logoPosition: 'bottom-left'
		});

		setMapInstance(map);
	}

	onDestroy(() => {
		resizeObserver?.disconnect();
		if (map) {
			map.remove();
			setMapInstance(null);
		}
	});

	// Sync app state to map whenever props change
	$effect(() => {
		if (!map || isSyncing || viewportWidth === 0 || viewportHeight === 0) return;

		isSyncing = true;

		try {
			// Calculate map center from pan offset
			const center = getMapCenterFromPan(
				{ lat: anchorLat, lng: anchorLng },
				panX,
				panY,
				pixelsPerInch,
				zoom,
				bearing,
				viewportWidth,
				viewportHeight
			);

			// Calculate zoom level
			const mapZoom = getMapboxZoomForScale(pixelsPerInch, zoom, anchorLat);

			// Update map (use jumpTo for instant sync, no animation)
			map.jumpTo({
				center: [center.lng, center.lat],
				zoom: mapZoom,
				bearing: bearing
			});
		} finally {
			isSyncing = false;
		}
	});
</script>

<div bind:this={container} class="absolute inset-0 z-0">
	<!-- Mapbox GL JS renders into this container -->
</div>

<style>
	/* Ensure the map container fills its parent */
	div {
		width: 100%;
		height: 100%;
	}

	/* Style Mapbox attribution */
	:global(.mapboxgl-ctrl-logo) {
		opacity: 0.7;
	}

	:global(.mapboxgl-ctrl-attrib) {
		font-size: 10px;
		opacity: 0.7;
	}
</style>

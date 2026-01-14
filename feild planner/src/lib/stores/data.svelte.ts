/**
 * Unified data store for beds and plants.
 *
 * Provides a consistent API regardless of persistence mode:
 * - Local mode: Uses $state() arrays with synchronous local mutations
 * - Convex mode: Uses useQuery() for data and client.mutation() for changes
 *
 * Usage:
 *   const store = createDataStore('local');
 *   // or with Convex:
 *   const store = createDataStore('convex', layoutId, convexClient);
 */

import type { Bed, PlacedPlant, RectangularBed, CircularBed } from '$lib/types';
import type { Id } from '../../convex/_generated/dataModel';
import type { PersistenceMode } from './persistence.svelte';
import { useQuery, useConvexClient } from 'convex-svelte';
import { api } from '../../convex/_generated/api';
import type { ConvexClient } from 'convex/browser';

// Type for bed creation parameters
export interface CreateRectangleBedParams {
	x: number;
	y: number;
	widthFeet: number;
	heightFeet: number;
	name?: string;
	fillColor?: string;
}

export interface CreateCircleBedParams {
	x: number;
	y: number;
	widthFeet: number; // diameter
	name?: string;
	fillColor?: string;
}

export interface UpdateBedParams {
	x?: number;
	y?: number;
	widthFeet?: number;
	heightFeet?: number;
	name?: string;
	fillColor?: string;
}

// Type for plant creation parameters
export interface CreatePlantParams {
	bedId: Id<'beds'>;
	flowerId: string;
	x: number;
	y: number;
	spacingMin: number;
	heightMax: number;
	name: string;
}

// Generic ID type that works for both local and Convex IDs
export type BedId = Id<'beds'> | `local-bed-${number}`;
export type PlantId = Id<'placedPlants'> | `local-plant-${number}`;

// Data store interface
export interface DataStore {
	// Reactive data accessors
	readonly beds: Bed[];
	readonly plants: PlacedPlant[];
	readonly isLoading: boolean;
	readonly error: Error | undefined;

	// Bed mutations
	createRectangleBed(params: CreateRectangleBedParams): Promise<Id<'beds'>>;
	createCircleBed(params: CreateCircleBedParams): Promise<Id<'beds'>>;
	updateBed(id: Id<'beds'>, params: UpdateBedParams): Promise<void>;
	deleteBed(id: Id<'beds'>): Promise<void>;

	// Plant mutations
	createPlant(params: CreatePlantParams): Promise<Id<'placedPlants'>>;
	movePlant(id: Id<'placedPlants'>, x: number, y: number): Promise<void>;
	movePlantToBed(
		id: Id<'placedPlants'>,
		newBedId: Id<'beds'>,
		x: number,
		y: number
	): Promise<void>;
	deletePlant(id: Id<'placedPlants'>): Promise<void>;
}

// Local store implementation
function createLocalDataStore(): DataStore {
	const LOCAL_LAYOUT_ID = 'local-layout' as Id<'layouts'>;

	let beds = $state<Bed[]>([]);
	let plants = $state<PlacedPlant[]>([]);

	return {
		get beds() {
			return beds;
		},
		get plants() {
			return plants;
		},
		get isLoading() {
			return false;
		},
		get error() {
			return undefined;
		},

		async createRectangleBed(params) {
			const id = `local-bed-${Date.now()}` as Id<'beds'>;
			const newBed: RectangularBed = {
				_id: id,
				layoutId: LOCAL_LAYOUT_ID,
				shape: 'rectangle',
				x: params.x,
				y: params.y,
				widthFeet: params.widthFeet,
				heightFeet: params.heightFeet,
				name: params.name,
				fillColor: params.fillColor,
				createdAt: Date.now()
			};
			beds = [...beds, newBed];
			return id;
		},

		async createCircleBed(params) {
			const id = `local-bed-${Date.now()}` as Id<'beds'>;
			const newBed: CircularBed = {
				_id: id,
				layoutId: LOCAL_LAYOUT_ID,
				shape: 'circle',
				x: params.x,
				y: params.y,
				widthFeet: params.widthFeet,
				name: params.name,
				fillColor: params.fillColor,
				createdAt: Date.now()
			};
			beds = [...beds, newBed];
			return id;
		},

		async updateBed(id, params) {
			beds = beds.map((b) => {
				if (b._id !== id) return b;
				return {
					...b,
					...(params.x !== undefined && { x: params.x }),
					...(params.y !== undefined && { y: params.y }),
					...(params.widthFeet !== undefined && { widthFeet: params.widthFeet }),
					...(params.heightFeet !== undefined &&
						b.shape === 'rectangle' && { heightFeet: params.heightFeet }),
					...(params.name !== undefined && { name: params.name }),
					...(params.fillColor !== undefined && { fillColor: params.fillColor })
				} as Bed;
			});
		},

		async deleteBed(id) {
			// Remove all plants in this bed
			plants = plants.filter((p) => p.bedId !== id);
			// Remove the bed
			beds = beds.filter((b) => b._id !== id);
		},

		async createPlant(params) {
			const id = `local-plant-${Date.now()}` as Id<'placedPlants'>;
			const newPlant: PlacedPlant = {
				_id: id,
				bedId: params.bedId,
				layoutId: LOCAL_LAYOUT_ID,
				flowerId: params.flowerId,
				x: params.x,
				y: params.y,
				spacingMin: params.spacingMin,
				heightMax: params.heightMax,
				name: params.name,
				createdAt: Date.now()
			};
			plants = [...plants, newPlant];
			return id;
		},

		async movePlant(id, x, y) {
			plants = plants.map((p) => (p._id === id ? { ...p, x, y } : p));
		},

		async movePlantToBed(id, newBedId, x, y) {
			plants = plants.map((p) => (p._id === id ? { ...p, bedId: newBedId, x, y } : p));
		},

		async deletePlant(id) {
			plants = plants.filter((p) => p._id !== id);
		}
	};
}

// Convex store implementation
function createConvexDataStore(layoutId: Id<'layouts'>, client: ConvexClient): DataStore {
	// Subscribe to beds and plants queries
	const bedsQuery = useQuery(api.beds.listByLayout, () => ({ layoutId }));
	const plantsQuery = useQuery(api.plants.listByLayout, () => ({ layoutId }));

	return {
		get beds() {
			return (bedsQuery.data ?? []) as Bed[];
		},
		get plants() {
			return (plantsQuery.data ?? []) as PlacedPlant[];
		},
		get isLoading() {
			return bedsQuery.isLoading || plantsQuery.isLoading;
		},
		get error() {
			return bedsQuery.error ?? plantsQuery.error;
		},

		async createRectangleBed(params) {
			return await client.mutation(api.beds.createRectangle, {
				layoutId,
				x: params.x,
				y: params.y,
				widthFeet: params.widthFeet,
				heightFeet: params.heightFeet,
				name: params.name,
				fillColor: params.fillColor
			});
		},

		async createCircleBed(params) {
			return await client.mutation(api.beds.createCircle, {
				layoutId,
				x: params.x,
				y: params.y,
				widthFeet: params.widthFeet,
				name: params.name,
				fillColor: params.fillColor
			});
		},

		async updateBed(id, params) {
			await client.mutation(api.beds.update, {
				id,
				x: params.x,
				y: params.y,
				widthFeet: params.widthFeet,
				heightFeet: params.heightFeet,
				name: params.name,
				fillColor: params.fillColor
			});
		},

		async deleteBed(id) {
			await client.mutation(api.beds.remove, { id });
		},

		async createPlant(params) {
			return await client.mutation(api.plants.create, {
				layoutId,
				bedId: params.bedId,
				flowerId: params.flowerId,
				x: params.x,
				y: params.y,
				spacingMin: params.spacingMin,
				heightMax: params.heightMax,
				name: params.name
			});
		},

		async movePlant(id, x, y) {
			await client.mutation(api.plants.updatePosition, { id, x, y });
		},

		async movePlantToBed(id, newBedId, x, y) {
			await client.mutation(api.plants.moveToBed, { id, newBedId, x, y });
		},

		async deletePlant(id) {
			await client.mutation(api.plants.remove, { id });
		}
	};
}

/**
 * Factory function to create a data store based on persistence mode.
 *
 * @param mode - 'local' for in-memory state, 'convex' for backend persistence
 * @param layoutId - Required for Convex mode, the ID of the layout to load
 * @param client - Required for Convex mode, the ConvexClient instance
 * @returns A DataStore instance with reactive data and mutation methods
 *
 * @example
 * // Local mode (demo)
 * const store = createDataStore('local');
 *
 * // Convex mode
 * const client = useConvexClient();
 * const store = createDataStore('convex', layoutId, client);
 */
export function createDataStore(mode: 'local'): DataStore;
export function createDataStore(
	mode: 'convex',
	layoutId: Id<'layouts'>,
	client: ConvexClient
): DataStore;
export function createDataStore(
	mode: PersistenceMode,
	layoutId?: Id<'layouts'>,
	client?: ConvexClient
): DataStore {
	if (mode === 'local') {
		return createLocalDataStore();
	}

	if (!layoutId || !client) {
		throw new Error('Convex mode requires layoutId and client parameters');
	}

	return createConvexDataStore(layoutId, client);
}

/**
 * Type guard to check if an ID is a local ID.
 */
export function isLocalId(id: string): boolean {
	return id.startsWith('local-');
}

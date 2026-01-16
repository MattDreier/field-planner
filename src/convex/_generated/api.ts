/* eslint-disable */
/**
 * Generated API - Placeholder file
 * Run `bunx convex dev` to generate real types
 */

import type { GenericApi, GenericMutation, GenericQuery } from 'convex/server';

// Placeholder API structure (will be replaced by Convex CLI)
export const api = {
	layouts: {
		list: {} as GenericQuery<{}, unknown[]>,
		get: {} as GenericQuery<{ id: string }, unknown>,
		create: {} as GenericMutation<{
			name: string;
			description?: string;
			canvasWidth: number;
			canvasHeight: number;
			pixelsPerInch: number;
		}, string>,
		update: {} as GenericMutation<{
			id: string;
			name?: string;
			description?: string;
			canvasWidth?: number;
			canvasHeight?: number;
			pixelsPerInch?: number;
		}, void>,
		remove: {} as GenericMutation<{ id: string }, void>
	},
	beds: {
		listByLayout: {} as GenericQuery<{ layoutId: string }, unknown[]>,
		createRectangle: {} as GenericMutation<{
			layoutId: string;
			x: number;
			y: number;
			widthFeet: number;
			heightFeet: number;
			name?: string;
			fillColor?: string;
		}, string>,
		createCircle: {} as GenericMutation<{
			layoutId: string;
			x: number;
			y: number;
			widthFeet: number;
			name?: string;
			fillColor?: string;
		}, string>,
		update: {} as GenericMutation<{
			id: string;
			x?: number;
			y?: number;
			widthFeet?: number;
			heightFeet?: number;
			name?: string;
			fillColor?: string;
		}, void>,
		remove: {} as GenericMutation<{ id: string }, void>
	},
	plants: {
		listByLayout: {} as GenericQuery<{ layoutId: string }, unknown[]>,
		listByBed: {} as GenericQuery<{ bedId: string }, unknown[]>,
		create: {} as GenericMutation<{
			bedId: string;
			layoutId: string;
			flowerId: string;
			x: number;
			y: number;
			spacingMin: number;
			heightMax: number;
			name: string;
		}, string>,
		updatePosition: {} as GenericMutation<{
			id: string;
			x: number;
			y: number;
		}, void>,
		moveToBed: {} as GenericMutation<{
			id: string;
			newBedId: string;
			x: number;
			y: number;
		}, void>,
		remove: {} as GenericMutation<{ id: string }, void>
	}
} as const;

export type API = typeof api;

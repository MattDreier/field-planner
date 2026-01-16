import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

// Get all plants for a layout
export const listByLayout = query({
	args: { layoutId: v.id('layouts') },
	handler: async (ctx, args) => {
		return await ctx.db
			.query('placedPlants')
			.withIndex('by_layout', (q) => q.eq('layoutId', args.layoutId))
			.collect();
	}
});

// Get all plants for a bed
export const listByBed = query({
	args: { bedId: v.id('beds') },
	handler: async (ctx, args) => {
		return await ctx.db
			.query('placedPlants')
			.withIndex('by_bed', (q) => q.eq('bedId', args.bedId))
			.collect();
	}
});

// Place a plant in a bed
export const create = mutation({
	args: {
		bedId: v.id('beds'),
		layoutId: v.id('layouts'),
		flowerId: v.string(),
		x: v.number(),
		y: v.number(),
		spacingMin: v.number(),
		heightMax: v.number(),
		name: v.string()
	},
	handler: async (ctx, args) => {
		const plantId = await ctx.db.insert('placedPlants', {
			...args,
			createdAt: Date.now()
		});

		// Update layout timestamp
		await ctx.db.patch(args.layoutId, { updatedAt: Date.now() });

		return plantId;
	}
});

// Move a plant within a bed
export const updatePosition = mutation({
	args: {
		id: v.id('placedPlants'),
		x: v.number(),
		y: v.number()
	},
	handler: async (ctx, args) => {
		const plant = await ctx.db.get(args.id);
		if (!plant) {
			throw new Error('Plant not found');
		}

		await ctx.db.patch(args.id, { x: args.x, y: args.y });

		// Update layout timestamp
		await ctx.db.patch(plant.layoutId, { updatedAt: Date.now() });
	}
});

// Move a plant to a different bed
export const moveToBed = mutation({
	args: {
		id: v.id('placedPlants'),
		newBedId: v.id('beds'),
		x: v.number(),
		y: v.number()
	},
	handler: async (ctx, args) => {
		const plant = await ctx.db.get(args.id);
		if (!plant) {
			throw new Error('Plant not found');
		}

		await ctx.db.patch(args.id, {
			bedId: args.newBedId,
			x: args.x,
			y: args.y
		});

		// Update layout timestamp
		await ctx.db.patch(plant.layoutId, { updatedAt: Date.now() });
	}
});

// Remove a plant
export const remove = mutation({
	args: { id: v.id('placedPlants') },
	handler: async (ctx, args) => {
		const plant = await ctx.db.get(args.id);
		if (!plant) {
			throw new Error('Plant not found');
		}

		await ctx.db.delete(args.id);

		// Update layout timestamp
		await ctx.db.patch(plant.layoutId, { updatedAt: Date.now() });
	}
});

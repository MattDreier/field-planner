import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireAuth } from './lib/auth';

// Get all plants for a layout (with ownership verification)
export const listByLayout = query({
	args: { layoutId: v.id('layouts') },
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);

		// Verify layout ownership
		const layout = await ctx.db.get(args.layoutId);
		if (!layout) {
			throw new Error('Layout not found');
		}
		if (layout.userId !== userId) {
			throw new Error('Not authorized to access this layout');
		}

		return await ctx.db
			.query('placedPlants')
			.withIndex('by_layout', (q) => q.eq('layoutId', args.layoutId))
			.collect();
	}
});

// Get all plants for a bed (with ownership verification)
export const listByBed = query({
	args: { bedId: v.id('beds') },
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);

		// Verify bed ownership
		const bed = await ctx.db.get(args.bedId);
		if (!bed) {
			throw new Error('Bed not found');
		}
		if (bed.userId !== userId) {
			throw new Error('Not authorized to access this bed');
		}

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
		name: v.string(),
		// Timeline scheduling (flattened)
		indoorStartDate: v.optional(v.string()),
		transplantDate: v.optional(v.string()),
		directSowDate: v.optional(v.string()),
		// Succession planning
		successionGroupId: v.optional(v.string()),
		successionIndex: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);

		// Verify layout ownership
		const layout = await ctx.db.get(args.layoutId);
		if (!layout) {
			throw new Error('Layout not found');
		}
		if (layout.userId !== userId) {
			throw new Error('Not authorized to add plants to this layout');
		}

		// Verify bed belongs to layout
		const bed = await ctx.db.get(args.bedId);
		if (!bed) {
			throw new Error('Bed not found');
		}
		if (bed.layoutId !== args.layoutId) {
			throw new Error('Bed does not belong to this layout');
		}

		const plantId = await ctx.db.insert('placedPlants', {
			...args,
			userId,
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
		const userId = await requireAuth(ctx);
		const plant = await ctx.db.get(args.id);
		if (!plant) {
			throw new Error('Plant not found');
		}
		if (plant.userId !== userId) {
			throw new Error('Not authorized to update this plant');
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
		const userId = await requireAuth(ctx);
		const plant = await ctx.db.get(args.id);
		if (!plant) {
			throw new Error('Plant not found');
		}
		if (plant.userId !== userId) {
			throw new Error('Not authorized to move this plant');
		}

		// Verify new bed ownership and belongs to same layout
		const newBed = await ctx.db.get(args.newBedId);
		if (!newBed) {
			throw new Error('Destination bed not found');
		}
		if (newBed.userId !== userId) {
			throw new Error('Not authorized to move plant to this bed');
		}
		if (newBed.layoutId !== plant.layoutId) {
			throw new Error('Cannot move plant to a bed in a different layout');
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
		const userId = await requireAuth(ctx);
		const plant = await ctx.db.get(args.id);
		if (!plant) {
			throw new Error('Plant not found');
		}
		if (plant.userId !== userId) {
			throw new Error('Not authorized to delete this plant');
		}

		await ctx.db.delete(args.id);

		// Update layout timestamp
		await ctx.db.patch(plant.layoutId, { updatedAt: Date.now() });
	}
});

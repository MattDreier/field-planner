import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const getByLayout = query({
	args: { layoutId: v.id('layouts') },
	handler: async (ctx, args) => {
		return await ctx.db
			.query('properties')
			.withIndex('by_layout', (q) => q.eq('layoutId', args.layoutId))
			.first();
	}
});

export const upsert = mutation({
	args: {
		layoutId: v.id('layouts'),
		userId: v.string(),
		address: v.string(),
		formattedAddress: v.optional(v.string()),
		lat: v.number(),
		lng: v.number(),
		bearing: v.number(),
		anchorFieldX: v.number(),
		anchorFieldY: v.number(),
		boundaryVertices: v.optional(v.array(v.object({ x: v.number(), y: v.number() }))),
		lotAreaSqFt: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query('properties')
			.withIndex('by_layout', (q) => q.eq('layoutId', args.layoutId))
			.first();

		const now = Date.now();

		if (existing) {
			await ctx.db.patch(existing._id, {
				...args,
				updatedAt: now
			});
			return existing._id;
		}

		return await ctx.db.insert('properties', {
			...args,
			createdAt: now,
			updatedAt: now
		});
	}
});

export const updateBoundary = mutation({
	args: {
		layoutId: v.id('layouts'),
		boundaryVertices: v.array(v.object({ x: v.number(), y: v.number() })),
		lotAreaSqFt: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query('properties')
			.withIndex('by_layout', (q) => q.eq('layoutId', args.layoutId))
			.first();

		if (!existing) throw new Error('Property not found for layout');

		await ctx.db.patch(existing._id, {
			boundaryVertices: args.boundaryVertices,
			lotAreaSqFt: args.lotAreaSqFt,
			updatedAt: Date.now()
		});
	}
});

export const remove = mutation({
	args: { layoutId: v.id('layouts') },
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query('properties')
			.withIndex('by_layout', (q) => q.eq('layoutId', args.layoutId))
			.first();

		if (existing) {
			await ctx.db.delete(existing._id);
		}
	}
});

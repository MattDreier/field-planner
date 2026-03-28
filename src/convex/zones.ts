import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireAuth } from './lib/auth';

// Get all zones for a layout (with ownership verification)
export const listByLayout = query({
	args: { layoutId: v.id('layouts') },
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);

		const layout = await ctx.db.get(args.layoutId);
		if (!layout) {
			throw new Error('Layout not found');
		}
		if (layout.userId !== userId) {
			throw new Error('Not authorized to access this layout');
		}

		return await ctx.db
			.query('zones')
			.withIndex('by_layout', (q) => q.eq('layoutId', args.layoutId))
			.collect();
	}
});

// Create a zone
export const create = mutation({
	args: {
		layoutId: v.id('layouts'),
		vertices: v.array(v.object({ x: v.number(), y: v.number() })),
		zoneType: v.union(
			v.literal('lawn'),
			v.literal('mulch'),
			v.literal('rocks'),
			v.literal('water'),
			v.literal('landscape_fabric'),
			v.literal('patio'),
			v.literal('other')
		),
		name: v.optional(v.string()),
		depthInches: v.optional(v.number()),
		fabricWidthInches: v.optional(v.number()),
		fabricOverlapInches: v.optional(v.number()),
		fabricRotationDeg: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);

		const layout = await ctx.db.get(args.layoutId);
		if (!layout) {
			throw new Error('Layout not found');
		}
		if (layout.userId !== userId) {
			throw new Error('Not authorized to add zones to this layout');
		}

		const zoneId = await ctx.db.insert('zones', {
			...args,
			userId,
			createdAt: Date.now()
		});

		await ctx.db.patch(args.layoutId, { updatedAt: Date.now() });

		return zoneId;
	}
});

// Update a zone (partial updates for ZoneProperties panel edits)
export const update = mutation({
	args: {
		id: v.id('zones'),
		name: v.optional(v.string()),
		zoneType: v.optional(
			v.union(
				v.literal('lawn'),
				v.literal('mulch'),
				v.literal('rocks'),
				v.literal('water'),
				v.literal('landscape_fabric'),
				v.literal('patio'),
				v.literal('other')
			)
		),
		depthInches: v.optional(v.number()),
		fabricWidthInches: v.optional(v.number()),
		fabricOverlapInches: v.optional(v.number()),
		fabricRotationDeg: v.optional(v.number()),
		vertices: v.optional(v.array(v.object({ x: v.number(), y: v.number() })))
	},
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);
		const zone = await ctx.db.get(args.id);
		if (!zone) {
			throw new Error('Zone not found');
		}
		if (zone.userId !== userId) {
			throw new Error('Not authorized to update this zone');
		}

		const { id, ...updates } = args;
		// Filter out undefined values so we only patch provided fields
		const patch: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(updates)) {
			if (value !== undefined) {
				patch[key] = value;
			}
		}

		if (Object.keys(patch).length > 0) {
			await ctx.db.patch(args.id, patch);
			await ctx.db.patch(zone.layoutId, { updatedAt: Date.now() });
		}
	}
});

// Remove a zone
export const remove = mutation({
	args: { id: v.id('zones') },
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);
		const zone = await ctx.db.get(args.id);
		if (!zone) {
			throw new Error('Zone not found');
		}
		if (zone.userId !== userId) {
			throw new Error('Not authorized to delete this zone');
		}

		await ctx.db.delete(args.id);
		await ctx.db.patch(zone.layoutId, { updatedAt: Date.now() });
	}
});

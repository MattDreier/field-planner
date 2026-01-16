import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
	// Field layouts (top-level entity)
	layouts: defineTable({
		userId: v.string(),
		name: v.string(),
		description: v.optional(v.string()),
		// Canvas settings (all in inches)
		canvasWidth: v.number(),
		canvasHeight: v.number(),
		pixelsPerInch: v.number(),
		// Timestamps
		createdAt: v.number(),
		updatedAt: v.number()
	}).index('by_user', ['userId']),

	// Garden beds (one-to-many with layouts)
	beds: defineTable({
		userId: v.string(),
		layoutId: v.id('layouts'),

		// Shape type discriminator
		shape: v.union(v.literal('rectangle'), v.literal('circle')),

		// Position (in inches from top-left of canvas)
		x: v.number(),
		y: v.number(),

		// Dimensions in FEET (user-facing)
		// For rectangles: width/height in feet
		// For circles: width = diameter in feet, height ignored
		widthFeet: v.number(),
		heightFeet: v.optional(v.number()), // only for rectangles

		// Visual properties
		name: v.optional(v.string()),
		fillColor: v.optional(v.string()),

		// Transform
		rotation: v.optional(v.number()),

		// Metadata
		createdAt: v.number()
	})
		.index('by_layout', ['layoutId'])
		.index('by_user', ['userId']),

	// Placed plants (one-to-many with beds)
	placedPlants: defineTable({
		userId: v.string(),
		bedId: v.id('beds'),
		layoutId: v.id('layouts'), // denormalized for efficient queries

		// Reference to flower database
		flowerId: v.string(), // matches FlowerData.id from flowers.ts

		// Position within bed (in inches, relative to bed origin)
		x: v.number(),
		y: v.number(),

		// Cached values from flower database (for display without re-lookup)
		spacingMin: v.number(), // inches
		heightMax: v.number(), // inches
		name: v.string(), // flower name

		// Timeline scheduling (flattened)
		indoorStartDate: v.optional(v.string()),
		transplantDate: v.optional(v.string()),
		directSowDate: v.optional(v.string()),

		// Succession planning
		successionGroupId: v.optional(v.string()),
		successionIndex: v.optional(v.number()),

		createdAt: v.number()
	})
		.index('by_bed', ['bedId'])
		.index('by_layout', ['layoutId'])
		.index('by_user', ['userId'])
});

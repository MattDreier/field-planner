import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
	// Field layouts (top-level entity)
	layouts: defineTable({
		name: v.string(),
		description: v.optional(v.string()),
		// Canvas settings (all in inches)
		canvasWidth: v.number(),
		canvasHeight: v.number(),
		pixelsPerInch: v.number(),
		// Timestamps
		createdAt: v.number(),
		updatedAt: v.number()
	}),

	// Garden beds (one-to-many with layouts)
	beds: defineTable({
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

		// Metadata
		createdAt: v.number()
	}).index('by_layout', ['layoutId']),

	// Placed plants (one-to-many with beds)
	placedPlants: defineTable({
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

		createdAt: v.number()
	})
		.index('by_bed', ['bedId'])
		.index('by_layout', ['layoutId'])
});

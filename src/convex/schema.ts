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
		flowerId: v.string(), // matches PlantData.id from plants.ts

		// Position within bed (in inches, relative to bed origin)
		x: v.number(),
		y: v.number(),

		// Cached values from plant database (for display without re-lookup)
		spacingMin: v.number(), // inches
		heightMax: v.number(), // inches
		name: v.string(), // plant name

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
		.index('by_user', ['userId']),

	// Fences (one-to-many with layouts)
	fences: defineTable({
		userId: v.string(),
		layoutId: v.id('layouts'),
		vertices: v.array(v.object({ x: v.number(), y: v.number() })),
		heightFeet: v.number(),
		name: v.optional(v.string()),
		color: v.optional(v.string()),
		createdAt: v.number()
	})
		.index('by_layout', ['layoutId'])
		.index('by_user', ['userId']),

	// Zones (one-to-many with layouts)
	zones: defineTable({
		userId: v.string(),
		layoutId: v.id('layouts'),
		vertices: v.array(v.object({
			x: v.number(),
			y: v.number(),
			cp1: v.optional(v.object({ x: v.number(), y: v.number() })),
			cp2: v.optional(v.object({ x: v.number(), y: v.number() })),
		})),
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
		fabricRotationDeg: v.optional(v.number()),
		createdAt: v.number()
	})
		.index('by_layout', ['layoutId'])
		.index('by_user', ['userId'])
});

---
description: Research and add plants to the database using parallel research agents
argument: Plant name(s) — single or comma-separated (e.g., "Basil" or "Tomato, Basil, Rosemary")
---

# Add Plant to Database

Add new entries to the `PLANT_DATABASE` array in `src/lib/data/plants.ts`.

## Step 1: Prepare

1. Read `src/lib/data/plants.ts` — collect all existing `id` values from the file
2. Also read lines 1–71 (the `PlantData` interface) and lines 73–115 (Zinnias example) — you will paste these into each agent's prompt (see Step 2)
3. For vegetables, also read lines 605–650 (Roma Tomato example) to include as a kind-specific reference
4. Parse `$ARGUMENTS` into individual plant names
5. Determine each plant's `kind` (flower / vegetable / herb) — ask the user if unclear
6. For ambiguous names (e.g., "Tomato" could be Roma, Cherry, Beefsteak), ask the user to specify the variety
7. Skip and report any plants whose kebab-case ID already exists in `PLANT_DATABASE`

## Step 2: Research — One Agent Per Plant

Launch **one agent per plant, all in parallel** using the Task tool:
- `subagent_type: "general-purpose"`, `model: "sonnet"`
- For batches larger than 7, process in groups of 7

Each agent's prompt must include all of the information below. Replace `{NAME}` with the plant name, `{KIND}` with flower/vegetable/herb, `{INTERFACE}` with the PlantData interface text from Step 1, and `{EXAMPLE}` with the Zinnias example (and Roma Tomato example for vegetables).

---

### Agent Prompt Content

Include ALL of the following in each agent's prompt:

**Task:** Research "{NAME}" (kind: `{KIND}`) for a garden plant database and return a complete, formatted TypeScript entry.

**PlantData Interface — your output must match this shape exactly:**

```typescript
{INTERFACE}
```

**Formatting example (Zinnias):**

```typescript
{EXAMPLE}
```

**Do NOT read `src/lib/data/plants.ts` yourself — the interface and example above are all you need.**

**Step 1 — Web research** (do 2–3 searches, prioritize .edu and USDA sources):
1. `{NAME} growing guide spacing height germination days`
2. `{NAME} planting schedule harvest time companion plants common pests`
3. Kind-specific:
   - Flower: `{NAME} cut flower vase life colors blooms per plant`
   - Vegetable: `{NAME} yield per plant storage cooking uses flavor`
   - Herb: `{NAME} culinary uses flavor profile harvesting`

**Step 2 — Build the entry following these rules:**
- All heights and spacings in **INCHES** (feet × 12, cm × 0.394)
- All temperatures in **FAHRENHEIT** (°C × 1.8 + 32)
- `id` must be lowercase kebab-case (e.g., `cherry-tomato`)
- For corm/division propagation: set `daysToGermination`, `germinationTempMin`, `germinationTempMax` to `0`
- No empty strings or undefined values — estimate if uncertain and note it in `specialNotes`
- Match the formatting style of the example above
- `colors` must be simple lowercase color names (e.g., `'white'`, `'green'`, `'yellow'`, `'purple'`, `'blue'`, `'pink'`, `'red'`, `'orange'`, `'lavender'`). No descriptive phrases like `'White flowers'` or `'Green foliage'`. No hyphenated compounds like `'lavender-pink'`.

Include the kind-specific optional fields:

| Flowers | Vegetables | Herbs |
|---------|-----------|-------|
| `cutAndComeAgain`: boolean | `cutAndComeAgain`: boolean | `ediblePart`: string |
| `cutAndComeAgainNotes`: string | `cutAndComeAgainNotes`: string | `flavorProfile`: string |
| `vaseLifeDays`: number | `ediblePart`: string | `cookingUses`: string[] |
| `vaseLifeDaysMax`: number | `daysToMaturity`: number | |
| `bloomsPerPlant`: string | `daysToMaturityMax`: number | |
| | `yieldPerPlant`: string | |
| | `flavorProfile`: string | |
| | `storageLife`: string | |
| | `cookingUses`: string[] | |

**Important for vegetables:** `cutAndComeAgain` determines how the succession planner calculates intervals. Set `true` for continuous producers (tomatoes, peppers, beans, kale, okra) and `false` for single-harvest crops (corn, carrots, cabbage, potatoes). Include `cutAndComeAgainNotes` explaining the harvest pattern.

Always include for all kinds: `colors`, `harvestTips`, `commonPests` (3–5 items), `companionPlants` (3–5 items), and `plantingSchedule`.

For `plantingSchedule`, use **exactly one** of these type definitions. Do NOT add any fields beyond what is shown — these are the exact TypeScript interfaces:

```typescript
// Option 1: Relative to frost date
interface RelativeToFrostTiming {
  type: 'relative-to-frost';
  reference: 'last' | 'first';
  weeksOffsetMin: number;  // Must be <= weeksOffsetMax
  weeksOffsetMax: number;
  method: 'indoor' | 'direct';
}
// IMPORTANT: Offsets are negative for "before frost" (e.g., 8 weeks before = -8).
// weeksOffsetMin must be <= weeksOffsetMax (e.g., min: -8, max: -6 means "6–8 weeks before").

// Option 2: Soil temperature threshold
interface SoilTemperatureTiming {
  type: 'soil-temperature';
  minTemp: number; // Fahrenheit
  method: 'direct';  // Only 'direct' is valid
}

// Option 3: After frost passes
interface AfterFrostTiming {
  type: 'after-frost';
  weeksAfter: number; // 0 = immediately after
  method: 'direct';  // Only 'direct' is valid
}

// Option 4: Season-based
interface SeasonTiming {
  type: 'season';
  season: 'early-spring' | 'late-winter' | 'spring' | 'fall';
  method: 'indoor' | 'direct';
}

// Option 5: As soon as soil is workable
interface WorkableSoilTiming {
  type: 'workable-soil';
  method: 'direct';  // Only 'direct' is valid
}
```

Wrap the chosen timing in: `plantingSchedule: { primary: { ... } }`

Do NOT add any extra fields to `plantingSchedule` (no `succession`, `secondary`, etc.) — only `primary` and optionally `zoneOverrides`.

**Step 3 — Return ONLY a fenced TypeScript code block.** No preamble, no explanation, no text before or after the code block. The first characters of your response must be ` ```typescript `:

```typescript
{
  id: 'example-plant',
  name: 'Example Plant',
  // ... all required and kind-specific fields ...
}
```

---

## Step 3: Insert Results

1. Extract each agent's TypeScript object literal from its code block
2. Add all new entries to the end of the `PLANT_DATABASE` array in `src/lib/data/plants.ts`
3. Add all entries in a single edit when possible

## Step 4: Verify

1. Run `bun run build` — fix any type errors that arise
2. Report: number of plants added, new database total, and any issues encountered

# Plant Database Expansion Progress

**Started**: 2026-02-07
**Goal**: Add 63 new plants (14 existing + 63 new = 77 total)
**Skill used**: `/add-plant` with parallel research agents

---

## Completed Batches

### Batch 1: Warm-Season Vegetables (14 plants) - DONE
All 14 added and build verified.

| Plant | ID | Kind | Category | Propagation |
|-------|-----|------|----------|-------------|
| Pepper | `pepper` | vegetable | annual | seed |
| Cucumber | `cucumber` | vegetable | annual | seed |
| Zucchini | `zucchini` | vegetable | annual | seed |
| Summer Squash | `summer-squash` | vegetable | annual | seed |
| Winter Squash | `winter-squash` | vegetable | annual | seed |
| Pumpkin | `pumpkin` | vegetable | annual | seed |
| Sweet Corn | `sweet-corn` | vegetable | annual | seed |
| Green Bean | `green-bean` | vegetable | annual | seed |
| Lima Bean | `lima-bean` | vegetable | annual | seed |
| Eggplant | `eggplant` | vegetable | annual | seed |
| Okra | `okra` | vegetable | annual | seed |
| Watermelon | `watermelon` | vegetable | annual | seed |
| Cantaloupe | `cantaloupe` | vegetable | annual | seed |
| Sweet Potato | `sweet-potato` | vegetable | annual | transplant |

---

## Remaining Batches

### Batch 2: Cool-Season Leafy Greens (6 plants) - DONE
All 6 added and build verified.
```
/add-plant Lettuce, Spinach, Kale, Swiss Chard, Collard Greens, Arugula
```

| Plant | Expected ID | Kind | Category | Propagation |
|-------|------------|------|----------|-------------|
| Lettuce | `lettuce` | vegetable | cool-season-annual | seed |
| Spinach | `spinach` | vegetable | cool-season-annual | seed |
| Kale | `kale` | vegetable | cool-season-annual | seed |
| Swiss Chard | `swiss-chard` | vegetable | cool-season-annual | seed |
| Collard Greens | `collard-greens` | vegetable | cool-season-annual | seed |
| Arugula | `arugula` | vegetable | cool-season-annual | seed |

### Batch 3: Cool-Season Brassicas (4 plants) - DONE
All 4 added and build verified.
```
/add-plant Cabbage, Broccoli, Cauliflower, Brussels Sprouts
```

| Plant | Expected ID | Kind | Category | Propagation |
|-------|------------|------|----------|-------------|
| Cabbage | `cabbage` | vegetable | cool-season-annual | seed |
| Broccoli | `broccoli` | vegetable | cool-season-annual | seed |
| Cauliflower | `cauliflower` | vegetable | cool-season-annual | seed |
| Brussels Sprouts | `brussels-sprouts` | vegetable | cool-season-annual | seed |

### Batch 4: Cool-Season Pods & Roots (7 plants) - DONE
All 7 added and build verified.
```
/add-plant Pea, Radish, Carrot, Beet, Turnip, Parsnip, Potato
```

| Plant | Expected ID | Kind | Category | Propagation | Notes |
|-------|------------|------|----------|-------------|-------|
| Pea | `pea` | vegetable | cool-season-annual | seed | |
| Radish | `radish` | vegetable | cool-season-annual | seed | Fastest veggie (22-30 days) |
| Carrot | `carrot` | vegetable | cool-season-annual | seed | |
| Beet | `beet` | vegetable | cool-season-annual | seed | |
| Turnip | `turnip` | vegetable | cool-season-annual | seed | |
| Parsnip | `parsnip` | vegetable | cool-season-annual | seed | Very slow germination |
| Potato | `potato` | vegetable | cool-season-annual | **transplant** | From seed potatoes |

### Batch 5: Cool-Season Alliums & Misc (7 plants) - DONE
All 7 added and build verified.
```
/add-plant Onion, Garlic, Leek, Scallion, Celery, Kohlrabi, Rutabaga
```

| Plant | Expected ID | Kind | Category | Propagation | Notes |
|-------|------------|------|----------|-------------|-------|
| Onion | `onion` | vegetable | cool-season-annual | seed | |
| Garlic | `garlic` | vegetable | cool-season-annual | **division** | Planted from cloves in fall |
| Leek | `leek` | vegetable | cool-season-annual | seed | |
| Scallion | `scallion` | vegetable | cool-season-annual | seed | |
| Celery | `celery` | vegetable | cool-season-annual | seed | |
| Kohlrabi | `kohlrabi` | vegetable | cool-season-annual | seed | |
| Rutabaga | `rutabaga` | vegetable | cool-season-annual | seed | |

### Batch 6: Perennial Vegetables (4 plants) - DONE
All 4 added and build verified.
```
/add-plant Asparagus, Rhubarb, Horseradish, Jerusalem Artichoke
```

| Plant | Expected ID | Kind | Category | Propagation | Notes |
|-------|------------|------|----------|-------------|-------|
| Asparagus | `asparagus` | vegetable | perennial | **division** | From crowns; 2-3 year wait |
| Rhubarb | `rhubarb` | vegetable | perennial | **division** | Leaves toxic |
| Horseradish | `horseradish` | vegetable | perennial | **division** | Root cuttings; invasive |
| Jerusalem Artichoke | `jerusalem-artichoke` | vegetable | perennial | **division** | Tubers; very invasive |

### Batch 7: Annual Herbs (7 plants) - DONE
All 7 added and build verified. First test of new 1-agent-per-plant `/add-plant` skill design.
```
/add-plant Basil, Cilantro, Dill, Parsley, Borage, Summer Savory, Chamomile
```

| Plant | Expected ID | Kind | Category | Propagation |
|-------|------------|------|----------|-------------|
| Basil | `basil` | herb | annual | seed |
| Cilantro | `cilantro` | herb | hardy-annual | seed |
| Dill | `dill` | herb | annual | seed |
| Parsley | `parsley` | herb | biennial | seed |
| Borage | `borage` | herb | annual | seed |
| Summer Savory | `summer-savory` | herb | annual | seed |
| Chamomile | `chamomile` | herb | annual | seed |

### Batch 8: Perennial Herbs Part 1 (7 plants) - DONE
All 7 added and build verified. First test of optimized `/add-plant` skill — all 6 fixes held (no schema drift, correct min/max ordering, clean color format, code-only output, no redundant file reads, correct Mint division propagation).
```
/add-plant Chives, Garlic Chives, Thyme, Oregano, Sage, Rosemary, Mint
```

| Plant | Expected ID | Kind | Category | Propagation | Notes |
|-------|------------|------|----------|-------------|-------|
| Chives | `chives` | herb | perennial | seed | |
| Garlic Chives | `garlic-chives` | herb | perennial | seed | |
| Thyme | `thyme` | herb | perennial | seed | |
| Oregano | `oregano` | herb | perennial | seed | |
| Sage | `sage` | herb | perennial | seed | |
| Rosemary | `rosemary` | herb | perennial | seed | |
| Mint | `mint` | herb | perennial | **division** | VERY invasive |

### Batch 9: Perennial Herbs Part 2 (7 plants) - TODO
```
/add-plant Lemon Balm, Tarragon, Lavender, Lovage, Winter Savory, Fennel, Marjoram
```

| Plant | Expected ID | Kind | Category | Propagation | Notes |
|-------|------------|------|----------|-------------|-------|
| Lemon Balm | `lemon-balm` | herb | perennial | seed | |
| Tarragon | `tarragon` | herb | perennial | **division** | French type |
| Lavender | `lavender` | herb | perennial | seed | |
| Lovage | `lovage` | herb | perennial | seed | |
| Winter Savory | `winter-savory` | herb | perennial | seed | |
| Fennel | `fennel` | herb | perennial | seed | |
| Marjoram | `marjoram` | herb | tender-perennial | seed | |

---

## Special Propagation Cases (zeroed germination fields needed)

| Plant | Propagation | Method | Batch |
|-------|------------|--------|-------|
| Sweet Potato | transplant | Slips | 1 (DONE) |
| Potato | transplant | Seed potatoes | 4 |
| Garlic | division | Cloves | 5 |
| Asparagus | division | Crowns | 6 |
| Rhubarb | division | Crowns | 6 |
| Horseradish | division | Root cuttings | 6 |
| Jerusalem Artichoke | division | Tubers | 6 |
| Mint | division | Runners | 8 |
| Tarragon | division | Division | 9 |

---

## Summary

| Status | Batches | Plants |
|--------|---------|--------|
| Done | 8 | 56 |
| Remaining | 1 | 7 |
| **Total** | **9** | **63** |

**Current database count**: 70 plants (14 original flowers + 56 added)
**Target database count**: 77 plants

## Resume Instructions

To continue, run each remaining batch's `/add-plant` command in order. After each batch, run `bun run build` to verify. After all batches, do final verification:
1. `bun run build` - type check
2. Verify 77 total entries in PLANT_DATABASE
3. Spot-check entries per category
4. Verify all IDs unique
5. Verify no empty required fields

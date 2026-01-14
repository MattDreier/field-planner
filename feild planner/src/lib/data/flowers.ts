/**
 * Comprehensive Cut Flower Database
 * Contains detailed growing information for 13 cut flower varieties
 */

export interface FlowerData {
  id: string;
  name: string;
  scientificName: string;
  category: 'annual' | 'perennial' | 'biennial' | 'tender-perennial' | 'hardy-annual' | 'cool-season-annual';
  propagationMethod: 'seed' | 'corm' | 'division' | 'transplant';

  // Germination
  daysToGermination: number;
  daysToGerminationMax?: number;
  germinationTempMin: number;
  germinationTempMax: number;
  germinationNotes?: string;

  // Growth to harvest
  daysToHarvest: number;
  daysToHarvestMax?: number;

  // Physical dimensions
  heightMin: number;
  heightMax: number;
  spacingMin: number;
  spacingMax: number;

  // Growing conditions
  lightRequirements: string;
  wateringNeeds: string;
  humidity: string;
  soilPH: string;
  soilType: string;
  fertilizer: string;

  // Harvest characteristics
  cutAndComeAgain: boolean;
  cutAndComeAgainNotes?: string;
  vaseLifeDays: number;
  vaseLifeDaysMax?: number;
  bloomsPerPlant?: string;

  // Plant details
  plantType: string;
  usdaZones: string;
  whenToPlant: string;
  specialNotes: string;

  // Additional details
  colors?: string[];
  harvestTips?: string;
  commonPests?: string[];
  companionPlants?: string[];
}

export const FLOWER_DATABASE: FlowerData[] = [
  {
    id: 'zinnias',
    name: 'Zinnias',
    scientificName: 'Zinnia elegans',
    category: 'annual',
    propagationMethod: 'seed',
    daysToGermination: 3,
    daysToGerminationMax: 7,
    germinationTempMin: 70,
    germinationTempMax: 85,
    germinationNotes: 'Very fast and reliable germination; warm soil essential',
    daysToHarvest: 60,
    daysToHarvestMax: 75,
    heightMin: 24,
    heightMax: 50,
    spacingMin: 9,
    spacingMax: 12,
    lightRequirements: 'Full sun (8+ hours)',
    wateringNeeds: 'Regular; 1-2" dry between watering; drought-tolerant once established',
    humidity: 'Low-moderate; prone to powdery mildew in high humidity',
    soilPH: '6.3-6.8',
    soilType: 'Fertile, well-drained, rich in organic matter',
    fertilizer: 'General purpose at planting; monthly with phosphorus boost',
    cutAndComeAgain: true,
    cutAndComeAgainNotes: 'Excellent producer: 8-15+ stems per plant',
    vaseLifeDays: 7,
    vaseLifeDaysMax: 12,
    bloomsPerPlant: '20-40 blooms',
    plantType: 'Annual',
    usdaZones: 'Frost-sensitive (all zones as annual)',
    whenToPlant: 'After last frost; soil temperature 70°F+',
    specialNotes: 'Pinch at 8-12" for bushier growth; frost-sensitive; avoid wet foliage; deadhead spent blooms. One of the best cut flowers for beginners.',
    colors: ['pink', 'red', 'orange', 'yellow', 'white', 'purple', 'lime'],
    harvestTips: 'Cut when flowers fully open; perform wiggle test for stem firmness',
    commonPests: ['Japanese beetles', 'aphids', 'spider mites'],
    companionPlants: ['Marigolds', 'Nasturtiums', 'Tomatoes']
  },
  {
    id: 'snapdragons',
    name: 'Snapdragons',
    scientificName: 'Antirrhinum majus',
    category: 'cool-season-annual',
    propagationMethod: 'seed',
    daysToGermination: 7,
    daysToGerminationMax: 14,
    germinationTempMin: 70,
    germinationTempMax: 75,
    germinationNotes: 'Surface sow - needs light to germinate',
    daysToHarvest: 100,
    daysToHarvestMax: 120,
    heightMin: 24,
    heightMax: 36,
    spacingMin: 6,
    spacingMax: 12,
    lightRequirements: 'Full sun preferred',
    wateringNeeds: '1" per week; keep evenly moist',
    humidity: 'Moderate; requires good air circulation',
    soilPH: '5.5-5.8 (seedling); neutral for mature plants',
    soilType: 'Rich, well-drained, consistently moist',
    fertilizer: 'Half-strength 10-10-10 every other watering',
    cutAndComeAgain: true,
    cutAndComeAgainNotes: 'Excellent: produces multiple flushes throughout season',
    vaseLifeDays: 14,
    bloomsPerPlant: '15-30 stems',
    plantType: 'Cool-season annual',
    usdaZones: '7-11 (can overwinter)',
    whenToPlant: 'Start indoors 8-12 weeks before last frost',
    specialNotes: 'Surface sow (needs light to germinate); reblooms in fall; phototropic (turns toward light). Pinch when 4-6" tall for branching.',
    colors: ['pink', 'red', 'orange', 'yellow', 'white', 'purple', 'bronze'],
    harvestTips: 'Cut when 1/4 to 1/3 of florets are open on spike',
    commonPests: ['Aphids', 'rust disease'],
    companionPlants: ['Pansies', 'Violas', 'Sweet Peas']
  },
  {
    id: 'anemones',
    name: 'Anemones',
    scientificName: 'Anemone coronaria',
    category: 'tender-perennial',
    propagationMethod: 'corm',
    daysToGermination: 0, // Grown from corms
    germinationTempMin: 0,
    germinationTempMax: 0,
    germinationNotes: 'Grown from corms, not seed',
    daysToHarvest: 84, // 12 weeks minimum
    daysToHarvestMax: 140, // 20 weeks
    heightMin: 8,
    heightMax: 12,
    spacingMin: 6,
    spacingMax: 6,
    lightRequirements: 'Full sun',
    wateringNeeds: '0.5-2" per week; allow proper drainage',
    humidity: 'Low; not suitable for humid climates',
    soilPH: 'Avoid high-salt soils',
    soilType: 'Well-drained, moist, rich in organic matter',
    fertilizer: '0.34 lbs nitrogen per 100 sq ft per year; slow-release preferred',
    cutAndComeAgain: true,
    cutAndComeAgainNotes: 'Modified: 3-30 blooms per corm over season',
    vaseLifeDays: 10,
    bloomsPerPlant: '5-15 blooms per corm',
    plantType: 'Cool-season corm',
    usdaZones: '7+ (can overwinter)',
    whenToPlant: 'Fall (zones 7+) or late winter/early spring',
    specialNotes: 'Soak corms 3-4 hours before planting; plant 2" deep, pointy side down; stops blooming above 80°F. Excellent for early spring blooms.',
    colors: ['pink', 'red', 'white', 'purple', 'blue'],
    harvestTips: 'Cut when buds show color but before fully open',
    commonPests: ['Aphids', 'slugs'],
    companionPlants: ['Ranunculus', 'Spring bulbs', 'Sweet Peas']
  },
  {
    id: 'poppies',
    name: 'Poppies',
    scientificName: 'Papaver somniferum',
    category: 'hardy-annual',
    propagationMethod: 'seed',
    daysToGermination: 7,
    daysToGerminationMax: 28,
    germinationTempMin: 55,
    germinationTempMax: 65,
    germinationNotes: 'Seeds need light to germinate; surface sow',
    daysToHarvest: 80,
    daysToHarvestMax: 90,
    heightMin: 24,
    heightMax: 36,
    spacingMin: 6,
    spacingMax: 8,
    lightRequirements: 'Full sun (6+ hours)',
    wateringNeeds: '1" per week; drought-tolerant once established',
    humidity: 'Low; prefers dry conditions',
    soilPH: 'Neutral to alkaline',
    soilType: 'Well-drained, fertile',
    fertilizer: 'Light: 1-2 tbsp 21-0-0 per 10 ft after thinning',
    cutAndComeAgain: false,
    cutAndComeAgainNotes: 'Single cut only',
    vaseLifeDays: 5,
    vaseLifeDaysMax: 7,
    bloomsPerPlant: '3-8 blooms',
    plantType: 'Hardy annual',
    usdaZones: 'Hardy annual (all zones)',
    whenToPlant: 'Early spring or late fall direct sow',
    specialNotes: 'Tiny seeds (mix with sand); surface sow; self-sows readily; Iceland poppies are 15-20" tall. Do not transplant - direct sow only.',
    colors: ['pink', 'red', 'white', 'purple', 'lavender'],
    harvestTips: 'Cut when buds are upright and showing color (cracked tepals); sear stem ends immediately',
    commonPests: ['Few pest issues'],
    companionPlants: ['Calendula', 'Bachelor Buttons', 'Larkspur']
  },
  {
    id: 'calendulas',
    name: 'Calendulas',
    scientificName: 'Calendula officinalis',
    category: 'annual',
    propagationMethod: 'seed',
    daysToGermination: 7,
    daysToGerminationMax: 15,
    germinationTempMin: 70,
    germinationTempMax: 70,
    germinationNotes: 'Easy and reliable germination',
    daysToHarvest: 30,
    daysToHarvestMax: 50,
    heightMin: 8,
    heightMax: 24,
    spacingMin: 6,
    spacingMax: 12,
    lightRequirements: 'Full sun to partial shade',
    wateringNeeds: '1-1.5" per week; drought-tolerant',
    humidity: 'Moderate; can be prone to mildew',
    soilPH: '5.5-7.0',
    soilType: 'Well-drained, moderate fertility',
    fertilizer: 'Little needed; monthly soluble if desired',
    cutAndComeAgain: true,
    cutAndComeAgainNotes: 'Excellent: reblooms in 2 weeks after cutting',
    vaseLifeDays: 5,
    vaseLifeDaysMax: 7,
    bloomsPerPlant: '30-60 blooms',
    plantType: 'Annual',
    usdaZones: '9-10 (year-round); annual elsewhere',
    whenToPlant: 'Direct sow in spring when soil reaches 60°F',
    specialNotes: 'Edible flowers; stops blooming above 85°F; self-seeds; survives light frost to 25°F. Excellent for beginners and attracts beneficial insects.',
    colors: ['orange', 'yellow', 'apricot'],
    harvestTips: 'Harvest when flowers fully open; deadhead regularly',
    commonPests: ['Aphids', 'whiteflies', 'powdery mildew'],
    companionPlants: ['Tomatoes', 'Lettuce', 'Peas', 'Carrots']
  },
  {
    id: 'cosmos',
    name: 'Cosmos',
    scientificName: 'Cosmos bipinnatus',
    category: 'annual',
    propagationMethod: 'seed',
    daysToGermination: 7,
    daysToGerminationMax: 14,
    germinationTempMin: 65,
    germinationTempMax: 75,
    germinationNotes: 'Very easy germination; warm soil preferred',
    daysToHarvest: 70,
    daysToHarvestMax: 90,
    heightMin: 36,
    heightMax: 72,
    spacingMin: 9,
    spacingMax: 12,
    lightRequirements: 'Full sun (8+ hours)',
    wateringNeeds: 'Weekly deep watering; very drought-tolerant',
    humidity: 'Tolerates humidity but prefers dry',
    soilPH: 'Neutral to alkaline',
    soilType: 'Average to POOR fertility (important!)',
    fertilizer: 'DO NOT FERTILIZE - thrives in poor soil',
    cutAndComeAgain: true,
    cutAndComeAgainNotes: 'Excellent: continuous blooms all season',
    vaseLifeDays: 7,
    vaseLifeDaysMax: 10,
    bloomsPerPlant: '40-80 blooms',
    plantType: 'Annual',
    usdaZones: 'Frost-tender (all zones as annual)',
    whenToPlant: 'After last frost; soil temperature 65-75°F',
    specialNotes: 'CRITICAL: No fertilizer needed! Thrives in poor soil; one of the easiest flowers to grow. Rich soil causes excessive foliage and reduces flowering.',
    colors: ['pink', 'white', 'red', 'orange', 'yellow'],
    harvestTips: 'Cut when flowers fully open; pinch when 12" tall for bushier plants',
    commonPests: ['Very few - highly resistant'],
    companionPlants: ['Zinnias', 'Sunflowers', 'Marigolds']
  },
  {
    id: 'belle-of-ireland',
    name: 'Belle of Ireland',
    scientificName: 'Moluccella laevis',
    category: 'hardy-annual',
    propagationMethod: 'seed',
    daysToGermination: 7,
    daysToGerminationMax: 21,
    germinationTempMin: 65,
    germinationTempMax: 68,
    germinationNotes: 'Cold stratify seeds 1-2 weeks for best germination; can be tricky',
    daysToHarvest: 90,
    daysToHarvestMax: 120,
    heightMin: 24,
    heightMax: 48,
    spacingMin: 9,
    spacingMax: 12,
    lightRequirements: 'Full sun (6-8 hours)',
    wateringNeeds: '1-2" per week; regular watering essential',
    humidity: 'LOW required; not suitable for humid climates',
    soilPH: '6.5-7.5',
    soilType: 'Loamy, well-drained',
    fertilizer: '0.20 lbs nitrogen per 100 sq ft per year; monthly feeding',
    cutAndComeAgain: false,
    cutAndComeAgainNotes: '1-2 harvests only',
    vaseLifeDays: 8,
    vaseLifeDaysMax: 10,
    bloomsPerPlant: '3-6 stems',
    plantType: 'Hardy annual',
    usdaZones: '2-11',
    whenToPlant: 'Start indoors 6-10 weeks before last frost',
    specialNotes: 'Cold stratify seeds 1-2 weeks; has taproot (dislikes transplanting); may need trellis; phototropic. Unique lime-green bell-shaped flowers excellent for fresh or dried arrangements.',
    colors: ['green', 'lime-green'],
    harvestTips: 'Cut when most bells are mature; remove leaves for better vase life; hang upside down to dry',
    commonPests: ['Few issues'],
    companionPlants: ['Other cool-season flowers']
  },
  {
    id: 'eucalyptus',
    name: 'Eucalyptus',
    scientificName: 'Eucalyptus gunnii',
    category: 'perennial',
    propagationMethod: 'seed',
    daysToGermination: 7,
    daysToGerminationMax: 21,
    germinationTempMin: 65,
    germinationTempMax: 80,
    germinationNotes: 'Can be slow to germinate; needs warmth',
    daysToHarvest: 90,
    daysToHarvestMax: 120,
    heightMin: 24,
    heightMax: 48,
    spacingMin: 12,
    spacingMax: 24,
    lightRequirements: 'Full sun (6+ hours)',
    wateringNeeds: 'Deep watering if no rain for 1 week; drought-tolerant',
    humidity: 'Low-moderate (40-50% ideal)',
    soilPH: '5.5-6.5',
    soilType: 'Well-drained, fertile',
    fertilizer: 'LOW: none in field; half-rate for containers',
    cutAndComeAgain: true,
    cutAndComeAgainNotes: 'Continuous harvest once established',
    vaseLifeDays: 14,
    vaseLifeDaysMax: 21,
    bloomsPerPlant: 'Continuous foliage harvest',
    plantType: 'Perennial (zones 9-11); grown as annual elsewhere',
    usdaZones: '9-11 (perennial)',
    whenToPlant: 'Start indoors 10-12 weeks before last frost',
    specialNotes: 'Has taproot; slow initial growth; minimum 5-gallon pots; low phosphorus needs; excellent for drying. Aromatic foliage. Hardy to 5-10°F when established.',
    colors: ['silver-blue', 'gray-green'],
    harvestTips: 'Pinch regularly to encourage branching; remove lower leaves before arranging',
    commonPests: ['Generally pest-free'],
    companionPlants: ['Works with most flowers as foliage accent']
  },
  {
    id: 'persian-cress',
    name: 'Persian Cress',
    scientificName: 'Lepidium sativum',
    category: 'hardy-annual',
    propagationMethod: 'seed',
    daysToGermination: 2,
    daysToGerminationMax: 5,
    germinationTempMin: 55,
    germinationTempMax: 65,
    germinationNotes: 'Fastest germinating flower on this list',
    daysToHarvest: 50,
    daysToHarvestMax: 60,
    heightMin: 36,
    heightMax: 40,
    spacingMin: 2,
    spacingMax: 6,
    lightRequirements: 'Full sun',
    wateringNeeds: 'Consistently moist; poor drought tolerance',
    humidity: 'Standard',
    soilPH: '6.0-6.7',
    soilType: 'Average, well-drained',
    fertilizer: 'Minimal; liquid fertilizer for containers',
    cutAndComeAgain: false,
    cutAndComeAgainNotes: 'Limited; succession planting recommended',
    vaseLifeDays: 7,
    vaseLifeDaysMax: 10,
    bloomsPerPlant: '10-20 stems',
    plantType: 'Hardy annual',
    usdaZones: 'Hardy (overwinter in zones 7+)',
    whenToPlant: 'Direct sow as soon as soil is workable',
    specialNotes: 'Fastest grower; edible leaves; prized for silvery seed pods; may need support; excellent dried. Cool season crop - succession plant every 2-3 weeks.',
    colors: ['white', 'pink'],
    harvestTips: 'Good filler flower; delicate white flowers in clusters',
    commonPests: ['Few issues'],
    companionPlants: ['Other cool-season crops']
  },
  {
    id: 'hollyhocks',
    name: 'Hollyhocks',
    scientificName: 'Alcea rosea',
    category: 'biennial',
    propagationMethod: 'seed',
    daysToGermination: 10,
    daysToGerminationMax: 14,
    germinationTempMin: 60,
    germinationTempMax: 70,
    germinationNotes: 'Needs light to germinate',
    daysToHarvest: 365, // Year 2 only - biennial
    heightMin: 72,
    heightMax: 96,
    spacingMin: 18,
    spacingMax: 24,
    lightRequirements: 'Full sun (6-8 hours)',
    wateringNeeds: 'Deep weekly watering; drought-tolerant once established',
    humidity: 'Needs good air circulation to prevent rust',
    soilPH: '6.0-8.0',
    soilType: 'Well-drained; tolerates most soil types',
    fertilizer: 'Slow-release at planting; 10-10-10 1-2 times per season',
    cutAndComeAgain: false,
    cutAndComeAgainNotes: 'Biennial - blooms in year 2 only; but produces many blooms',
    vaseLifeDays: 7,
    vaseLifeDaysMax: 10,
    bloomsPerPlant: '20-50 blooms per spike',
    plantType: 'Biennial/Short-lived perennial',
    usdaZones: '3-9',
    whenToPlant: 'Spring after last frost',
    specialNotes: 'Biennial cycle - grows foliage first year, flowers second year. Can bloom first year if started very early indoors. Prone to rust disease; self-seeds readily; flowers are edible; attracts pollinators; needs light to germinate.',
    colors: ['pink', 'red', 'yellow', 'white', 'purple', 'black'],
    harvestTips: 'Cut when bottom flowers are opening on tall spikes; may need staking',
    commonPests: ['Rust disease', 'Japanese beetles', 'slugs'],
    companionPlants: ['Cottage garden flowers', 'Roses', 'Delphiniums']
  },
  {
    id: 'pink-pokers',
    name: 'Pink Pokers (Kniphofia)',
    scientificName: 'Kniphofia uvaria',
    category: 'perennial',
    propagationMethod: 'division',
    daysToGermination: 0, // Grown from division
    germinationTempMin: 0,
    germinationTempMax: 0,
    germinationNotes: 'Start from divisions or transplants, not seed',
    daysToHarvest: 60, // Year 1 if transplants used
    heightMin: 24,
    heightMax: 48,
    spacingMin: 18,
    spacingMax: 24,
    lightRequirements: 'Full sun (6-8 hours)',
    wateringNeeds: 'Moderate; drought-tolerant once established',
    humidity: 'Standard; tolerates salt and wind',
    soilPH: 'Acidic to neutral',
    soilType: 'Well-drained with organic matter',
    fertilizer: 'Little if soil amended; spring slow-release if needed',
    cutAndComeAgain: true,
    cutAndComeAgainNotes: 'Perennial; deadhead for repeat blooms',
    vaseLifeDays: 7,
    vaseLifeDaysMax: 10,
    bloomsPerPlant: '5-15 dramatic spikes',
    plantType: 'Herbaceous perennial',
    usdaZones: '5-9',
    whenToPlant: 'Spring after last frost',
    specialNotes: 'Also known as Red Hot Poker or Torch Lily. Rhizomatous; mulch in winter (zones 5-6); deer and rabbit resistant; excellent for xeriscaping. Dramatic poker-shaped flower spikes.',
    colors: ['pink', 'coral', 'orange', 'yellow', 'red'],
    harvestTips: 'Cut when lower florets are opening; excellent architectural element in arrangements',
    commonPests: ['Very few - deer resistant'],
    companionPlants: ['Ornamental grasses', 'Rudbeckia', 'Echinacea']
  },
  {
    id: 'big-smile-sunflower',
    name: 'Big Smile Sunflower',
    scientificName: 'Helianthus annuus "Big Smile"',
    category: 'annual',
    propagationMethod: 'seed',
    daysToGermination: 7,
    daysToGerminationMax: 14,
    germinationTempMin: 70,
    germinationTempMax: 75,
    germinationNotes: 'Easy and reliable germination',
    daysToHarvest: 50,
    daysToHarvestMax: 60,
    heightMin: 12,
    heightMax: 24,
    spacingMin: 8,
    spacingMax: 12,
    lightRequirements: 'Full sun (6+ hours)',
    wateringNeeds: 'Regular; keep consistently moist',
    humidity: 'Standard',
    soilPH: 'Not specific (average)',
    soilType: 'Light, well-drained, low to moderate fertility',
    fertilizer: 'Minimal; 2 cups organic per 10 ft if desired',
    cutAndComeAgain: true,
    cutAndComeAgainNotes: '4-6 blooms per plant',
    vaseLifeDays: 7,
    vaseLifeDaysMax: 10,
    bloomsPerPlant: '4-6 golden blooms',
    plantType: 'Annual',
    usdaZones: 'All zones',
    whenToPlant: 'After last frost or start indoors 3-4 weeks prior',
    specialNotes: 'Day neutral; branching habit; bears pollen; compact size; excellent for containers. Dwarf variety perfect for small spaces. Early blooming - one of fastest sunflowers.',
    colors: ['yellow', 'golden-yellow'],
    harvestTips: 'Cut when petals are fully open but before pollen sheds; succession plant every 2 weeks',
    commonPests: ['Few issues in this dwarf variety'],
    companionPlants: ['Zinnias', 'Cosmos', 'Nasturtiums']
  },
  {
    id: 'lacy-lavender-blue',
    name: 'Lacy Lavender Blue (Didiscus)',
    scientificName: 'Trachymene coerulea',
    category: 'annual',
    propagationMethod: 'seed',
    daysToGermination: 14,
    daysToGerminationMax: 21,
    germinationTempMin: 70,
    germinationTempMax: 72,
    germinationNotes: 'Slower to germinate; needs consistent warmth',
    daysToHarvest: 100,
    daysToHarvestMax: 110,
    heightMin: 24,
    heightMax: 36,
    spacingMin: 6,
    spacingMax: 12,
    lightRequirements: 'Sun to partial shade',
    wateringNeeds: '1" per week; consistent moisture',
    humidity: 'Moderate; struggles in extreme heat',
    soilPH: 'Neutral preferred',
    soilType: 'Well-drained, sandy preferred',
    fertilizer: '2-4" compost prior to planting; avoid heavy feeding',
    cutAndComeAgain: true,
    cutAndComeAgainNotes: 'Blooms continuously up to 2 months',
    vaseLifeDays: 8,
    vaseLifeDaysMax: 10,
    bloomsPerPlant: '15-30 delicate umbels',
    plantType: 'Annual',
    usdaZones: 'All zones',
    whenToPlant: 'Direct seed after last frost (preferred method)',
    specialNotes: 'Also known as Blue Lace Flower. Pinch at 6" for bushier growth; dislikes root disturbance; prone to wilt; best in moderate climates. Delicate lacy umbel flowers. Resembles Queen Anne\'s Lace but blue.',
    colors: ['lavender-blue', 'pink', 'white'],
    harvestTips: 'Cut when most florets in cluster are open; may need support as stems can be delicate',
    commonPests: ['Generally pest-free'],
    companionPlants: ['Snapdragons', 'Sweet Peas', 'Other cool-season flowers']
  }
];

/**
 * Get a flower by its ID
 */
export function getFlowerById(id: string): FlowerData | undefined {
  return FLOWER_DATABASE.find(flower => flower.id === id);
}

/**
 * Get all flowers in the database
 */
export function getAllFlowers(): FlowerData[] {
  return [...FLOWER_DATABASE];
}

/**
 * Get flowers by category
 */
export function getFlowersByCategory(
  category: 'annual' | 'perennial' | 'biennial' | 'tender-perennial' | 'hardy-annual' | 'cool-season-annual'
): FlowerData[] {
  return FLOWER_DATABASE.filter(flower => flower.category === category);
}

/**
 * Search flowers by name, scientific name, or special notes
 */
export function searchFlowers(query: string): FlowerData[] {
  const lowerQuery = query.toLowerCase();

  return FLOWER_DATABASE.filter(flower => {
    // Search in name
    if (flower.name.toLowerCase().includes(lowerQuery)) {
      return true;
    }

    // Search in scientific name
    if (flower.scientificName.toLowerCase().includes(lowerQuery)) {
      return true;
    }

    // Search in special notes
    if (flower.specialNotes.toLowerCase().includes(lowerQuery)) {
      return true;
    }

    // Search in colors (if present)
    if (flower.colors && flower.colors.some(color => color.toLowerCase().includes(lowerQuery))) {
      return true;
    }

    return false;
  });
}

/**
 * Get flowers by propagation method
 */
export function getFlowersByPropagationMethod(
  method: 'seed' | 'corm' | 'division' | 'transplant'
): FlowerData[] {
  return FLOWER_DATABASE.filter(flower => flower.propagationMethod === method);
}

/**
 * Get cut-and-come-again flowers
 */
export function getCutAndComeAgainFlowers(): FlowerData[] {
  return FLOWER_DATABASE.filter(flower => flower.cutAndComeAgain);
}

/**
 * Get flowers suitable for beginners (fast germination, easy care)
 */
export function getBeginnerFriendlyFlowers(): FlowerData[] {
  return FLOWER_DATABASE.filter(flower => {
    const hasFastGermination = flower.daysToGermination > 0 && flower.daysToGermination <= 7;
    const isEasy = flower.specialNotes.toLowerCase().includes('easy') ||
                   flower.specialNotes.toLowerCase().includes('beginner');
    return hasFastGermination || isEasy;
  });
}

/**
 * Get flowers by minimum vase life (in days)
 */
export function getFlowersByVaseLife(minDays: number): FlowerData[] {
  return FLOWER_DATABASE.filter(flower => flower.vaseLifeDays >= minDays);
}

/**
 * Get quick harvest flowers (ready in 60 days or less from seed)
 */
export function getQuickHarvestFlowers(): FlowerData[] {
  return FLOWER_DATABASE.filter(flower =>
    flower.daysToHarvest > 0 && flower.daysToHarvest <= 60
  );
}

/**
 * Get flowers by color
 */
export function getFlowersByColor(color: string): FlowerData[] {
  const lowerColor = color.toLowerCase();
  return FLOWER_DATABASE.filter(flower =>
    flower.colors && flower.colors.some(c => c.toLowerCase().includes(lowerColor))
  );
}

/**
 * Get cool-season flowers
 */
export function getCoolSeasonFlowers(): FlowerData[] {
  return FLOWER_DATABASE.filter(flower =>
    flower.category === 'cool-season-annual' ||
    flower.category === 'hardy-annual' ||
    flower.specialNotes.toLowerCase().includes('cool season')
  );
}

/**
 * Get flowers that don't require fertilizer or need minimal feeding
 */
export function getLowFertilizerFlowers(): FlowerData[] {
  return FLOWER_DATABASE.filter(flower =>
    flower.fertilizer.toLowerCase().includes('do not fertilize') ||
    flower.fertilizer.toLowerCase().includes('minimal') ||
    flower.fertilizer.toLowerCase().includes('little needed') ||
    flower.fertilizer.toLowerCase().includes('low')
  );
}

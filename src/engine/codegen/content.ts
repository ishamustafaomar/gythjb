/**
 * Topic system — detects the content domain a prompt is about and provides
 * per-domain content pools so generated copy actually matches the brief
 * (a plant shop sells Monsteras, a tech blog writes about shipping).
 *
 * Pure and deterministic: detection is keyword scoring, all variety comes
 * from the caller-provided Rng.
 */
import type { Rng } from '@/lib/seeded';
import type { TopicDomain } from '../types';

/* ------------------------------------------------------------------ */
/* Detection                                                           */
/* ------------------------------------------------------------------ */

interface TopicMatcher {
  topic: TopicDomain;
  pattern: RegExp;
  weight: number;
}

const TOPIC_MATCHERS: readonly TopicMatcher[] = [
  { topic: 'food', pattern: /\bcoffee\b|\bbaker(?:y|ies)\b|\bcaf(?:e|é)s?\b|\brestaurants?\b|\bpizza\b|\brecipes?\b|\bfood\b|\bkitchens?\b/, weight: 2 },
  { topic: 'food', pattern: /\bbrunch\b|\bespresso\b|\bmenu\b|\bbaking\b|\bmeals?\b|\bcooking\b|\bdiner\b/, weight: 1 },
  { topic: 'plants', pattern: /\bplants?\b|\bgardens?\b|\bflowers?\b|\bbotanic\w*\b|\bsucculents?\b/, weight: 2 },
  { topic: 'plants', pattern: /\bgreenhouse\b|\bnursery\b|\bhouseplants?\b|\bfloral\b|\bflorists?\b/, weight: 1 },
  { topic: 'tech', pattern: /\bsaas\b|\bsoftware\b|\bdev(?:s|elopers?)?\b|\bstartups?\b|\bai\b|\banalytics\b|\bapis?\b/, weight: 2 },
  { topic: 'tech', pattern: /\bapps?\b|\bcode\b|\bcoding\b|\bengineering\b|\bcloud\b|\bdata\b/, weight: 1 },
  { topic: 'fitness', pattern: /\bgyms?\b|\bfitness\b|\byoga\b|\brun(?:ning|ner|s)?\b|\bworkouts?\b/, weight: 2 },
  { topic: 'fitness', pattern: /\btraining\b|\bcrossfit\b|\bpilates\b|\blifting\b|\bmarathons?\b/, weight: 1 },
  { topic: 'fashion', pattern: /\bclothing\b|\bfashion\b|\bboutiques?\b|\bapparel\b|\bjewelr?y\b|\bjewellery\b/, weight: 2 },
  { topic: 'fashion', pattern: /\bwardrobe\b|\bdenim\b|\bstreetwear\b|\btailor\w*\b|\bvintage\s+clothes\b/, weight: 1 },
  { topic: 'photography', pattern: /\bphotos?\b|\bphotograph\w*\b|\bportraits?\b/, weight: 2 },
  { topic: 'photography', pattern: /\bstudios?\b|\bweddings?\b|\bcamera\b|\bdarkroom\b/, weight: 1 },
  { topic: 'travel', pattern: /\btravel\w*\b|\btrips?\b|\bhotels?\b|\btours?\b|\badventures?\b/, weight: 2 },
  { topic: 'travel', pattern: /\bitinerar\w+\b|\bbackpack\w*\b|\bdestinations?\b|\bhostels?\b/, weight: 1 },
  { topic: 'music', pattern: /\bmusic\b|\bbands?\b|\bpodcasts?\b|\bdjs?\b/, weight: 2 },
  { topic: 'music', pattern: /\brecord\s+label\b|\bvinyl\b|\balbums?\b|\bconcerts?\b|\bsongs?\b/, weight: 1 },
  { topic: 'wellness', pattern: /\bspas?\b|\bwellness\b|\bmeditat\w+\b|\bskincare\b|\btherap\w+\b/, weight: 2 },
  { topic: 'wellness', pattern: /\bmindful\w*\b|\bself[-\s]care\b|\bmassage\b|\baromatherapy\b/, weight: 1 },
];

/** Tie-break order when two domains score equally. */
const TOPIC_PRIORITY: readonly TopicDomain[] = [
  'food', 'plants', 'fitness', 'fashion', 'photography',
  'travel', 'music', 'wellness', 'tech',
];

/** Infers the content domain of a prompt (case-insensitive). */
export function detectTopic(prompt: string): TopicDomain {
  const lower = prompt.toLowerCase();
  const scores = new Map<TopicDomain, number>();
  for (const matcher of TOPIC_MATCHERS) {
    if (matcher.pattern.test(lower)) {
      scores.set(matcher.topic, (scores.get(matcher.topic) ?? 0) + matcher.weight);
    }
  }
  let best: TopicDomain = 'generic';
  let bestScore = 0;
  for (const topic of TOPIC_PRIORITY) {
    const score = scores.get(topic) ?? 0;
    if (score > bestScore) {
      best = topic;
      bestScore = score;
    }
  }
  return bestScore > 0 ? best : 'generic';
}

/* ------------------------------------------------------------------ */
/* Content model                                                       */
/* ------------------------------------------------------------------ */

export interface TopicProduct {
  name: string;
  price: number;
  category: string;
}

export interface TopicPost {
  title: string;
  excerpt: string;
}

export interface TopicRecipe {
  name: string;
  tags: readonly string[];
  minutes: number;
  /**
   * The checklist for THIS entry (4–6 lines) — real ingredients for food
   * recipes, matching "what you'll need" items for guide-style entries.
   */
  items: readonly string[];
  /** The ordered method for THIS entry (3–4 steps). */
  steps: readonly string[];
}

export interface TopicPersona {
  name: string;
  role: string;
}

export interface TopicStat {
  value: string;
  label: string;
}

export interface TopicFeature {
  title: string;
  text: string;
}

export interface TopicContent {
  /** Human label for the domain, e.g. "plants & greenery". */
  label: string;
  /** Decorative glyph used in mosaics and marks. */
  glyph: string;
  products: readonly TopicProduct[];
  posts: readonly TopicPost[];
  /** Recipe/guide entries, each carrying its own coherent items and steps. */
  recipes: readonly TopicRecipe[];
  galleryProjects: readonly string[];
  personas: readonly TopicPersona[];
  stats: readonly TopicStat[];
  featureIdeas: readonly TopicFeature[];
  habitIdeas: readonly string[];
  todoIdeas: readonly string[];
  kanbanCards: readonly string[];
  noteTitles: readonly string[];
  chatContacts: readonly string[];
}

/* ------------------------------------------------------------------ */
/* Pools                                                               */
/* ------------------------------------------------------------------ */

const FOOD: TopicContent = {
  label: 'food & drink',
  glyph: '☕',
  products: [
    { name: 'Single-origin espresso beans', price: 18.5, category: 'Coffee' },
    { name: 'Sourdough country loaf', price: 8, category: 'Bakery' },
    { name: 'Cold brew concentrate', price: 14, category: 'Coffee' },
    { name: 'Cinnamon morning buns (4)', price: 12, category: 'Bakery' },
    { name: 'Ceramic pour-over dripper', price: 24, category: 'Brewing' },
    { name: 'Seasonal fruit galette', price: 22, category: 'Bakery' },
    { name: 'House-blend drip bags (10)', price: 16, category: 'Coffee' },
    { name: 'Small-batch raspberry jam', price: 9.5, category: 'Pantry' },
    { name: 'Hand-burr coffee grinder', price: 89, category: 'Brewing' },
  ],
  posts: [
    { title: 'Behind the roast: cupping notes from this week', excerpt: 'Every batch gets tasted before it ships. Here is what we found in the new Huila lot — and why we roast it lighter.' },
    { title: 'Why our croissants take three days', excerpt: 'Lamination cannot be rushed. A walk through the folds, the rests, and the butter that makes the difference.' },
    { title: 'A field trip to the growers cooperative', excerpt: 'We spent a week at origin meeting the families behind our best-selling beans. Notes from the wet mill.' },
    { title: 'Winter menu preview: five dishes we kept tasting', excerpt: 'Braises, brown butter and one surprising citrus dessert. What is landing on the chalkboard next month.' },
    { title: 'The quiet craft of a proper crema', excerpt: 'Grind, dose, tamp, time. The four variables that separate a flat shot from a glossy one.' },
    { title: 'Feeding a sourdough starter that survives weekends', excerpt: 'A schedule for bakers with lives. Your starter can wait — here is how to let it.' },
  ],
  recipes: [
    {
      name: 'Smoky chickpea skillet', tags: ['Dinner', 'Vegetarian'], minutes: 25,
      items: [
        '2 tins chickpeas, drained', '1 tbsp smoked paprika', '1 red onion, sliced',
        '2 cloves garlic, crushed', '1 tin chopped tomatoes', 'A handful of parsley, chopped',
      ],
      steps: [
        'Soften the onion and garlic in olive oil over medium heat.',
        'Stir in the smoked paprika, then the chickpeas and tomatoes.',
        'Simmer for ten minutes until thick and glossy.',
        'Scatter with parsley and serve straight from the pan.',
      ],
    },
    {
      name: 'One-bowl banana bread', tags: ['Baking'], minutes: 60,
      items: [
        '3 very ripe bananas', '120 g melted butter', '150 g brown sugar',
        '2 eggs', '200 g plain flour', '1 tsp baking soda',
      ],
      steps: [
        'Mash the bananas in a big bowl, then whisk in the butter, sugar and eggs.',
        'Fold in the flour and baking soda until just combined — lumps are fine.',
        'Scrape into a lined loaf tin and bake at 175°C for about 55 minutes.',
        'Cool in the tin before slicing, if you can wait.',
      ],
    },
    {
      name: 'Lemon-herb sheet-pan chicken', tags: ['Dinner'], minutes: 40,
      items: [
        '6 bone-in chicken thighs', '2 lemons, one juiced and one sliced',
        '500 g baby potatoes, halved', '3 sprigs fresh rosemary', '3 tbsp olive oil',
      ],
      steps: [
        'Toss the chicken and potatoes with the oil, lemon juice and rosemary.',
        'Spread over a sheet pan with the lemon slices tucked between.',
        'Roast at 200°C for 35 minutes until the skin crisps.',
        'Rest five minutes, then spoon the pan juices over everything.',
      ],
    },
    {
      name: 'Overnight oats, three ways', tags: ['Breakfast'], minutes: 10,
      items: [
        '80 g rolled oats', '200 ml milk of choice', '2 tbsp Greek yogurt',
        '1 tbsp chia seeds', 'Honey, berries or peanut butter to top',
      ],
      steps: [
        'Stir the oats, milk, yogurt and chia together in a jar.',
        'Seal and refrigerate overnight — no cooking, no stirring.',
        'Top each jar differently: honey, berries, or a swirl of peanut butter.',
      ],
    },
    {
      name: 'Charred corn and feta salad', tags: ['Salad', 'Summer'], minutes: 15,
      items: [
        '4 ears sweetcorn, shucked', '100 g feta, crumbled', '1 lime, juiced',
        'A handful of cilantro, torn', '1 small red chili, minced',
      ],
      steps: [
        'Char the corn in a dry cast-iron pan until blistered all over.',
        'Slice the kernels off and toss with the lime juice and chili.',
        'Fold in the feta and cilantro just before serving.',
      ],
    },
    {
      name: 'Midweek miso noodle soup', tags: ['Soup'], minutes: 20,
      items: [
        '3 tbsp white miso paste', '200 g udon noodles', '150 g shiitake mushrooms, sliced',
        '2 heads baby bok choy', '2 spring onions, sliced', '1 litre vegetable stock',
      ],
      steps: [
        'Simmer the mushrooms in the stock for five minutes.',
        'Add the noodles and bok choy and cook until just tender.',
        'Off the heat, whisk the miso with a ladle of broth and stir it back in.',
        'Finish with the spring onions.',
      ],
    },
    {
      name: 'Crispy gnocchi with sage butter', tags: ['Dinner', 'Fast'], minutes: 20,
      items: [
        '500 g shelf-stable gnocchi', '80 g butter', '12 fresh sage leaves',
        '30 g parmesan, grated', 'Plenty of black pepper',
      ],
      steps: [
        'Fry the gnocchi in half the butter until golden and crisp — no boiling.',
        'Add the rest of the butter and the sage; let it foam and turn nutty.',
        'Toss off the heat with the parmesan and black pepper.',
      ],
    },
    {
      name: 'Iced ginger-peach tea', tags: ['Drinks'], minutes: 10,
      items: [
        '4 black tea bags', '2 ripe peaches, sliced', 'A thumb of ginger, thinly sliced',
        '2 tbsp honey', 'Plenty of ice',
      ],
      steps: [
        'Steep the tea and ginger in a litre of just-boiled water for five minutes.',
        'Stir in the honey and let it cool completely.',
        'Pour over ice and the sliced peaches.',
      ],
    },
  ],
  galleryProjects: [
    'Espresso bar rebuild', 'Harvest dinner series', 'Roastery open day',
    'Pastry case, Saturday 7am', 'Latte art throwdown', 'Farmers market stall',
  ],
  personas: [
    { name: 'Marta Oliveira', role: 'Head roaster' },
    { name: 'Ben Castellano', role: 'Pastry chef' },
    { name: 'Yuki Hara', role: 'Café manager' },
    { name: 'Dre Wilson', role: 'Green-bean buyer' },
    { name: 'Colette Marchand', role: 'Front of house' },
  ],
  stats: [
    { value: '4,200', label: 'cups poured every week' },
    { value: '14', label: 'single-origin lots this season' },
    { value: '3 days', label: 'from roast to shelf' },
    { value: '5:45', label: 'first bake out of the oven' },
    { value: '92%', label: 'regulars who order "the usual"' },
  ],
  featureIdeas: [
    { title: 'Roasted weekly', text: 'Beans ship within 48 hours of the roast, never from a warehouse shelf.' },
    { title: 'Seasonal menu', text: 'The chalkboard changes with the market — what is good now is what we serve.' },
    { title: 'Direct trade', text: 'We buy from growers we have met, at prices we would say out loud.' },
    { title: 'Brew guides', text: 'Dial in every bag with ratios and timings written by our baristas.' },
    { title: 'Subscriptions', text: 'Fresh beans on your doorstep on your schedule — pause or swap anytime.' },
    { title: 'Wholesale program', text: 'Training, gear and beans for cafés that care as much as we do.' },
  ],
  habitIdeas: [
    'Morning pour-over ritual', 'Feed the sourdough starter', 'Prep tomorrow’s mise en place',
    'Taste one new origin', 'Wipe down the espresso machine', 'Plan the weekend bake',
    'Sharpen the knives',
  ],
  todoIdeas: [
    'Order next week’s green beans', 'Descale the espresso machine', 'Test the new oat milk',
    'Update the chalkboard menu', 'Book the supplier tasting', 'Photograph the pastry case',
    'Refresh the sourdough starter',
  ],
  kanbanCards: [
    'Finalize the winter drink menu', 'Fix the grinder hopper', 'Print new loyalty cards',
    'Trial the rye croissant', 'Schedule barista training', 'Photograph the brunch plates',
    'Negotiate the berry supplier price', 'Plan the public cupping night', 'Rewrite the catering page',
  ],
  noteTitles: [
    'Cupping notes — Huila lot 4', 'Croissant lamination timings', 'Holiday pie pre-orders',
    'Supplier contacts', 'Menu ideas parking lot', 'Weekend bake schedule',
  ],
  chatContacts: ['Marta', 'Ben', 'Yuki', 'Dre'],
};

const PLANTS: TopicContent = {
  label: 'plants & greenery',
  glyph: '❦',
  products: [
    { name: 'Monstera deliciosa', price: 34, category: 'Foliage' },
    { name: 'Snake plant (Sansevieria)', price: 22, category: 'Foliage' },
    { name: 'Fiddle-leaf fig', price: 48, category: 'Statement' },
    { name: 'String of pearls', price: 18, category: 'Trailing' },
    { name: 'Golden pothos', price: 16, category: 'Trailing' },
    { name: 'Calathea orbifolia', price: 29, category: 'Foliage' },
    { name: 'Echeveria succulent trio', price: 21, category: 'Succulents' },
    { name: 'Terracotta pot set', price: 26, category: 'Pots & care' },
    { name: 'Organic potting mix, 5 L', price: 12, category: 'Pots & care' },
    { name: 'Brass watering can', price: 32, category: 'Pots & care' },
  ],
  posts: [
    { title: 'Why your monstera leaves are not splitting', excerpt: 'Fenestration is about light and maturity, not fertilizer. What to change — and what to stop worrying about.' },
    { title: 'A beginner’s guide to propagation stations', excerpt: 'One shelf, a few jars, endless free plants. How to root cuttings in water without the rot.' },
    { title: 'Low-light heroes: five plants for dim corners', excerpt: 'North-facing window? No problem. The species that genuinely thrive away from the sun.' },
    { title: 'Repotting season: when, why and how', excerpt: 'Roots circling the pot are a request, not an emergency. A calm walkthrough of the spring repot.' },
    { title: 'The case for terracotta', excerpt: 'It wicks, it breathes, it forgives overwatering. Why the oldest pot material is still the best one.' },
    { title: 'Watering myths that quietly kill houseplants', excerpt: 'Ice cubes, schedules, misting — most watering advice is folklore. Here is what roots actually want.' },
  ],
  recipes: [
    {
      name: 'Propagate pothos in water', tags: ['Propagation'], minutes: 15,
      items: [
        'A healthy pothos vine', 'Clean, sharp secateurs',
        'A glass jar of room-temperature water', 'A bright spot out of direct sun',
      ],
      steps: [
        'Cut just below a node, keeping two leaves on each cutting.',
        'Stand the cuttings in the jar with the node underwater.',
        'Swap the water weekly; roots appear in two to three weeks.',
        'Pot up once the longest roots pass five centimeters.',
      ],
    },
    {
      name: 'Repot a rootbound monstera', tags: ['Care'], minutes: 30,
      items: [
        'A pot one size up, with drainage', 'Fresh chunky potting mix',
        'Chopsticks for loosening roots', 'Newspaper for the mess', 'A watering can',
      ],
      steps: [
        'Ease the plant out and tease the circling roots loose with the chopsticks.',
        'Set it at the same depth in the new pot and backfill with fresh mix.',
        'Firm gently and water until it runs from the drainage holes.',
      ],
    },
    {
      name: 'Mix a chunky aroid soil', tags: ['Soil'], minutes: 20,
      items: [
        'Orchid bark', 'Perlite', 'Coco coir', 'A scoop of worm castings',
        'A bucket for blending',
      ],
      steps: [
        'Combine the bark, perlite and coir in roughly equal parts.',
        'Stir the worm castings through until evenly flecked.',
        'Moisten lightly until it clumps loosely, then pot straight away.',
      ],
    },
    {
      name: 'Revive an overwatered succulent', tags: ['Rescue'], minutes: 25,
      items: [
        'Dry, gritty cactus mix', 'A terracotta pot with drainage',
        'Sterilized scissors', 'Paper towels',
      ],
      steps: [
        'Unpot the plant and let the roots air-dry on paper towels for a day.',
        'Trim off any brown, mushy roots with the sterilized scissors.',
        'Repot in the dry cactus mix and hold off watering for a week.',
      ],
    },
    {
      name: 'Build a simple moss pole', tags: ['DIY'], minutes: 40,
      items: [
        'A wooden stake or PVC pipe', 'Sphagnum moss, soaked',
        'Plastic mesh or garden twine', 'Soft plant ties',
      ],
      steps: [
        'Wrap the soaked moss around the stake and bind it on with mesh.',
        'Anchor the pole deep in the pot, right beside the main stem.',
        'Tie the vines loosely to the pole and mist the moss weekly.',
      ],
    },
    {
      name: 'Divide a crowded snake plant', tags: ['Propagation'], minutes: 25,
      items: [
        'A sharp, clean knife', 'Two pots with drainage',
        'Fresh free-draining mix', 'Gloves for grip',
      ],
      steps: [
        'Unpot the plant and shake the soil off the rhizomes.',
        'Slice through the rhizome so each division keeps roots and leaves.',
        'Pot the divisions separately and wait a few days before watering.',
      ],
    },
  ],
  galleryProjects: [
    'Greenhouse corner makeover', 'The propagation wall', 'Office jungle install',
    'Balcony herb garden', 'Terrarium workshop night', 'Rare aroid collection',
  ],
  personas: [
    { name: 'Ivy Chen', role: 'Plant stylist' },
    { name: 'Marcus Webb', role: 'Greenhouse manager' },
    { name: 'Sana Qureshi', role: 'Botanist' },
    { name: 'Elena Petrova', role: 'Landscape designer' },
    { name: 'Theo Brandt', role: 'Nursery owner' },
  ],
  stats: [
    { value: '340+', label: 'species in the greenhouse' },
    { value: '98%', label: 'plants thriving after one year' },
    { value: '12k', label: 'cuttings propagated' },
    { value: '4.9/5', label: 'plant-parent rating' },
  ],
  featureIdeas: [
    { title: 'Potted and ready', text: 'Every plant arrives in its forever pot with the right mix already in it.' },
    { title: 'Care cards included', text: 'Light, water and feeding notes written for your plant, not the species average.' },
    { title: 'Local delivery', text: 'Hand-delivered in the van, never boxed and shipped upside down.' },
    { title: 'Plant rehab clinic', text: 'Bring us the struggling one. We diagnose, treat and send it home stronger.' },
    { title: '30-day leaf guarantee', text: 'If it sulks in its first month, we replace it — no questions, no receipts.' },
    { title: 'Seasonal drops', text: 'Small batches of rare finds announced to the list first.' },
  ],
  habitIdeas: [
    'Morning misting round', 'Check soil moisture before watering', 'Rotate pots toward the light',
    'Wipe dust off the big leaves', 'Log new growth in the journal', 'Top up the propagation jars',
    'Feed the ferns',
  ],
  todoIdeas: [
    'Repot the monstera', 'Order spring bulbs', 'Treat the ficus for gnats',
    'Build the succulent shelf', 'Label the propagation jars', 'Refresh the potting bench soil',
    'Photograph the calathea for the shop',
  ],
  kanbanCards: [
    'Pot up the new pothos cuttings', 'Design the spring window display', 'Restock terracotta pots',
    'Write the monstera care card', 'Fix the greenhouse drip line', 'Plan the propagation workshop',
    'Price the rare aroid drop', 'Update the watering rota', 'Photograph new arrivals',
  ],
  noteTitles: [
    'Watering schedule — week 30', 'Propagation log', 'Pest watch list',
    'Repotting queue', 'Wishlist: rare aroids', 'Fertilizer ratios',
  ],
  chatContacts: ['Ivy', 'Marcus', 'Sana', 'Theo'],
};

const TECH: TopicContent = {
  label: 'software & product',
  glyph: '⌘',
  products: [
    { name: 'Mechanical keyboard, 75%', price: 129, category: 'Desk' },
    { name: 'USB-C dock, 8-in-1', price: 79, category: 'Desk' },
    { name: '4K conference webcam', price: 149, category: 'Video' },
    { name: 'Aluminum laptop stand', price: 59, category: 'Desk' },
    { name: 'Noise-canceling headset', price: 199, category: 'Audio' },
    { name: 'Split ergonomic keyboard', price: 189, category: 'Desk' },
    { name: 'Stitched-edge desk mat', price: 29, category: 'Desk' },
    { name: 'Cable organizer kit', price: 19, category: 'Desk' },
    { name: 'Portable SSD, 2 TB', price: 159, category: 'Storage' },
  ],
  posts: [
    { title: 'How we cut our build times by 80%', excerpt: 'Caching, sharding and one embarrassing misconfiguration. A postmortem on the slowest hour of our day.' },
    { title: 'Shipping on Fridays without fear', excerpt: 'Feature flags, canary deploys and a culture that treats rollback as a feature, not a failure.' },
    { title: 'From monolith to modules without the rewrite', excerpt: 'We never did the big-bang migration. Instead we drew better boundaries inside the code we had.' },
    { title: 'What on-call taught us about alert fatigue', excerpt: 'We deleted two thirds of our alerts and reliability went up. Every page must be actionable, or it goes.' },
    { title: 'Feature flags are a product decision', excerpt: 'Who sees what, and when, is strategy. Engineering just holds the switch.' },
    { title: 'The boring stack manifesto', excerpt: 'Choose technology like you choose plumbing. Exciting infrastructure is a cost center.' },
  ],
  recipes: [
    {
      name: 'Set up zero-downtime deploys', tags: ['DevOps'], minutes: 45,
      items: [
        'A load balancer you control', 'Two identical app instances',
        'A health-check endpoint', 'A rollback script, rehearsed',
      ],
      steps: [
        'Route traffic through the balancer and mark one instance as standby.',
        'Deploy to the standby, then flip traffic once health checks pass.',
        'Keep the old instance warm until the graphs stay flat for a cycle.',
      ],
    },
    {
      name: 'Wire up end-to-end tracing', tags: ['Observability'], minutes: 60,
      items: [
        'A tracing SDK for your stack', 'A collector endpoint',
        'A service with known slow paths', 'Dashboard access',
      ],
      steps: [
        'Instrument the entry point so every request starts a trace.',
        'Propagate the trace ID through queues and downstream calls.',
        'Find one slow span and fix it — that alone pays for the setup.',
      ],
    },
    {
      name: 'Ship a CLI in an afternoon', tags: ['Tooling'], minutes: 90,
      items: [
        'An argument-parsing library', 'One well-defined task to automate',
        'A README with a single usage example', 'A package registry account',
      ],
      steps: [
        'Hard-code the happy path first and run it end to end.',
        'Add flags only for the options you actually reached for.',
        'Write the usage example, then publish before you polish.',
      ],
    },
    {
      name: 'Harden your API rate limits', tags: ['Backend'], minutes: 40,
      items: [
        'A shared counter store', 'Per-key quotas from real traffic',
        'A 429 response with a Retry-After header', 'A load-testing script',
      ],
      steps: [
        'Pick limits from traffic percentiles, not guesses.',
        'Return 429 with Retry-After the moment a bucket empties.',
        'Load-test past the limit and confirm legitimate traffic survives.',
      ],
    },
    {
      name: 'Automate changelog generation', tags: ['DX'], minutes: 30,
      items: [
        'A commit message convention', 'A generator script or CI action',
        'A CHANGELOG.md seeded with history', 'CI permissions to tag releases',
      ],
      steps: [
        'Agree the commit prefix convention with the team first.',
        'Run the generator on merge so it drafts the next entry.',
        'Review the draft at release time — automation drafts, humans edit.',
      ],
    },
    {
      name: 'Migrate a database without downtime', tags: ['Data'], minutes: 75,
      items: [
        'A reversible migration plan', 'Dual-write code behind a flag',
        'A backfill script with progress logging', 'Row-count and checksum queries',
      ],
      steps: [
        'Ship dual writes behind the flag and verify parity on a sample.',
        'Backfill old rows in batches while watching replication lag.',
        'Switch reads to the new table, then retire the old one a week later.',
      ],
    },
  ],
  galleryProjects: [
    'Realtime analytics pipeline', 'Design system v2', 'Mobile app relaunch',
    'Internal developer portal', 'Billing engine rewrite', 'Search relevance overhaul',
  ],
  personas: [
    { name: 'Amara Diallo', role: 'Staff engineer' },
    { name: 'Chris Novak', role: 'Product manager' },
    { name: 'Lena Fischer', role: 'SRE lead' },
    { name: 'Raj Patel', role: 'CTO, Fielder' },
    { name: 'Nina Kowalski', role: 'Developer advocate' },
  ],
  stats: [
    { value: '99.99%', label: 'uptime last quarter' },
    { value: '<50ms', label: 'median API response' },
    { value: '2,400+', label: 'teams shipping with us' },
    { value: '38', label: 'releases last month' },
  ],
  featureIdeas: [
    { title: 'Instant deploys', text: 'Push to main and watch it go live — previews for every branch, rollbacks in one click.' },
    { title: 'Realtime metrics', text: 'Latency, errors and throughput on one screen, streamed as they happen.' },
    { title: 'Role-based access', text: 'Fine-grained permissions your security team will actually sign off on.' },
    { title: 'API-first', text: 'Everything the UI does, the API does too — documented, versioned, stable.' },
    { title: 'Audit logs', text: 'Every change, by whom, from where. Exportable and tamper-evident.' },
    { title: 'SOC 2 ready', text: 'Compliance evidence collected as you work, not scrambled for at renewal.' },
  ],
  habitIdeas: [
    'Review one PR before standup', 'Clear the error-tracker inbox', 'Write tomorrow’s top task',
    'Thirty minutes of deep work before chat', 'Update the changelog', 'Log what shipped today',
    'Close one stale ticket',
  ],
  todoIdeas: [
    'Fix the flaky auth test', 'Review the pagination RFC', 'Upgrade the staging database',
    'Write the release notes', 'Profile the slow dashboard query', 'Close stale issues',
    'Pair on the onboarding flow',
  ],
  kanbanCards: [
    'Ship dark mode', 'Fix the login redirect loop', 'Add webhook retries',
    'Write the SDK quickstart', 'Migrate CI to the new runners', 'Design usage-based billing',
    'Refactor the feature-flag service', 'Instrument the checkout funnel', 'Draft the Q3 roadmap',
  ],
  noteTitles: [
    'Standup notes', 'Incident 2041 retro', 'API design scratchpad',
    'Onboarding friction log', 'Ideas: developer newsletter', 'Interview debrief — SRE role',
  ],
  chatContacts: ['Amara', 'Chris', 'Lena', 'Raj'],
};

const FITNESS: TopicContent = {
  label: 'fitness & training',
  glyph: '⚑',
  products: [
    { name: 'Cork yoga mat', price: 49, category: 'Studio' },
    { name: 'Adjustable dumbbell pair', price: 189, category: 'Strength' },
    { name: 'Resistance band set', price: 24, category: 'Strength' },
    { name: 'High-density foam roller', price: 32, category: 'Recovery' },
    { name: 'Weighted skipping rope', price: 21, category: 'Conditioning' },
    { name: 'Gym duffel bag', price: 59, category: 'Gear' },
    { name: 'Grip chalk block', price: 9, category: 'Strength' },
    { name: 'Insulated bottle, 1 L', price: 18, category: 'Gear' },
    { name: 'Lifting straps', price: 15, category: 'Strength' },
  ],
  posts: [
    { title: 'Zone 2: the boring cardio that changes everything', excerpt: 'Slow enough to hold a conversation, consistent enough to rebuild your engine. Why easy miles win.' },
    { title: 'A beginner’s guide to progressive overload', excerpt: 'Strength is a savings account. Small weekly deposits — a rep here, a kilo there — compound fast.' },
    { title: 'Mobility work you can do at your desk', excerpt: 'Five two-minute drills for hips and shoulders that survive an office job.' },
    { title: 'What five years of morning runs taught me', excerpt: 'Motivation shows up after you start, not before. Notes from 1,800 slow kilometers.' },
    { title: 'Protein myths, debunked by the numbers', excerpt: 'You need more than you think and less than the internet says. The evidence, minus the shouting.' },
    { title: 'Rest days are training days', excerpt: 'Adaptation happens between sessions. How to rest on purpose instead of by collapse.' },
  ],
  recipes: [
    {
      name: 'Master the goblet squat', tags: ['Strength'], minutes: 15,
      items: [
        'One kettlebell or dumbbell', 'A cleared patch of floor',
        'Flat, stable shoes — or bare feet', 'A mirror or a phone to film with',
      ],
      steps: [
        'Hold the weight at your chest with the elbows tucked in.',
        'Sit straight down between your heels, chest tall.',
        'Drive up through the mid-foot; film a set to check your depth.',
      ],
    },
    {
      name: 'Build a 20-minute morning routine', tags: ['Routine'], minutes: 20,
      items: [
        'A timer you can see', 'A mat or thick towel',
        'A filled water bottle', 'A note of today’s plan, written last night',
      ],
      steps: [
        'Start with two minutes of easy movement before anything hard.',
        'Alternate one strength move and one stretch for fifteen minutes.',
        'Finish with water, and write tomorrow’s plan while you cool down.',
      ],
    },
    {
      name: 'Warm up for heavy deadlifts', tags: ['Strength'], minutes: 12,
      items: [
        'An empty barbell', 'Light plates for ramp-up sets',
        'A foam roller', 'Chalk, if your grip slips',
      ],
      steps: [
        'Roll your hamstrings and upper back for two minutes.',
        'Do a few empty-bar hinges, then add weight in modest jumps.',
        'Stop ramping two sets before your working weight.',
      ],
    },
    {
      name: 'Program your first 5k plan', tags: ['Running'], minutes: 30,
      items: [
        'A calendar with three free slots a week', 'Comfortable running shoes',
        'A watch or phone with GPS', 'A route you actually enjoy',
      ],
      steps: [
        'Alternate run and walk intervals in two of the weekly slots.',
        'Keep the third session an easy, conversational jog.',
        'Add a little distance each week — and rest when your legs vote no.',
      ],
    },
    {
      name: 'Stretch out desk-job hips', tags: ['Mobility'], minutes: 15,
      items: [
        'A chair or low bench', 'A mat', 'A cushion for your knees',
        'Two quiet songs’ worth of time',
      ],
      steps: [
        'Open with ninety seconds of couch stretch on each side.',
        'Move into deep lunges, breathing slowly at the bottom.',
        'Finish seated, folding forward over crossed legs.',
      ],
    },
    {
      name: 'Dial in pre-workout fuel', tags: ['Nutrition'], minutes: 10,
      items: [
        'A banana or a slice of toast', 'A pinch of salt',
        'Water or diluted juice', 'A training log to note what worked',
      ],
      steps: [
        'Eat the light carb about an hour before training.',
        'Sip fluids on the way in — thirst always arrives late.',
        'Note how the session felt and adjust the portion, not the menu.',
      ],
    },
  ],
  galleryProjects: [
    'Summer bootcamp series', 'Marathon training camp', 'Home gym makeover',
    'Sunrise yoga sessions', 'First pull-up wall of fame', 'Trail run weekend',
  ],
  personas: [
    { name: 'Dana Reyes', role: 'Strength coach' },
    { name: 'Mike O’Brien', role: 'Running coach' },
    { name: 'Aisha Bello', role: 'Yoga instructor' },
    { name: 'Tom Keller', role: 'Physiotherapist' },
    { name: 'Grace Lin', role: 'Nutrition coach' },
  ],
  stats: [
    { value: '1,150', label: 'workouts logged this week' },
    { value: '87%', label: 'members hitting weekly goals' },
    { value: '24', label: 'classes on the timetable' },
    { value: '312', label: 'personal records this month' },
  ],
  featureIdeas: [
    { title: 'Coach-built programs', text: 'Every block written by a human coach, adjusted to your equipment and week.' },
    { title: 'Progress you can see', text: 'PRs, photos and volume charts that make slow progress visible.' },
    { title: 'Form check videos', text: 'Upload a set, get frame-by-frame feedback from a coach within a day.' },
    { title: 'Community challenges', text: 'Monthly team goals that make showing up the easy choice.' },
    { title: 'Recovery tracking', text: 'Sleep, soreness and readiness — so hard days land on the right days.' },
    { title: 'Nutrition templates', text: 'Plate-method meal guides that survive real kitchens and real schedules.' },
  ],
  habitIdeas: [
    'Morning stretch', '10k steps', 'Two liters of water',
    'Protein with every meal', 'Mobility before bed', 'Log the workout',
    'Lights out by 10:30',
  ],
  todoIdeas: [
    'Book Thursday’s spin class', 'Plan the deload week', 'Replace worn lifting shoes',
    'Meal prep for the week', 'Test the new warm-up circuit', 'Sign up for the autumn 10k',
    'Foam roll after tonight’s run',
  ],
  kanbanCards: [
    'Program the next strength block', 'Film the squat form video', 'Plan the member challenge',
    'Order new kettlebells', 'Update the class timetable', 'Write the mobility guide',
    'Onboard new PT clients', 'Service the rowers', 'Design the summer bootcamp',
  ],
  noteTitles: [
    'PR log', 'Week 6 training notes', 'Meal prep ideas',
    'Left knee watch list', 'Class feedback', 'Race-day checklist',
  ],
  chatContacts: ['Coach Dana', 'Mike', 'Aisha', 'Tom'],
};

const FASHION: TopicContent = {
  label: 'fashion & apparel',
  glyph: '✂',
  products: [
    { name: 'Linen wrap dress', price: 128, category: 'Dresses' },
    { name: 'Selvedge denim jacket', price: 189, category: 'Outerwear' },
    { name: 'Silk twill scarf', price: 65, category: 'Accessories' },
    { name: 'Gold-fill hoop earrings', price: 48, category: 'Jewelry' },
    { name: 'Merino crewneck', price: 95, category: 'Knitwear' },
    { name: 'Leather crossbody bag', price: 210, category: 'Bags' },
    { name: 'Canvas high-tops', price: 78, category: 'Shoes' },
    { name: 'Wide-brim wool hat', price: 89, category: 'Accessories' },
    { name: 'Brushed signet ring', price: 56, category: 'Jewelry' },
  ],
  posts: [
    { title: 'The capsule wardrobe, honestly reviewed', excerpt: 'Thirty-three pieces, three months, zero shopping. What worked, what bored us, what we quietly re-bought.' },
    { title: 'Why we switched to deadstock fabrics', excerpt: 'The best material for a new garment already exists. Inside our hunt through mill archives.' },
    { title: 'Fit notes: how our denim should feel', excerpt: 'Snug at the waist, easy in the thigh, and always one wash from perfect. A sizing letter from the studio.' },
    { title: 'A studio visit with our pattern maker', excerpt: 'Forty years of chalk lines and muslin. Jae walks us through the pattern that took eleven drafts.' },
    { title: 'Care guide: making linen last a decade', excerpt: 'Cold wash, line dry, embrace the wrinkle. Linen rewards neglect of exactly the right kind.' },
    { title: 'Behind the lookbook: shooting the new collection', excerpt: 'One roll of film, two city blocks, six looks. Why we kept the crew small on purpose.' },
  ],
  recipes: [
    {
      name: 'Style one blazer five ways', tags: ['Styling'], minutes: 10,
      items: [
        'One well-fitting blazer', 'A white tee and a crisp shirt',
        'Denim and tailored trousers', 'A full-length mirror', 'A phone for outfit photos',
      ],
      steps: [
        'Start casual: blazer, tee, denim, clean sneakers.',
        'Swap one piece at a time toward dressier, photographing each look.',
        'Pin the two best photos inside your wardrobe door.',
      ],
    },
    {
      name: 'Hem jeans with the original stitch', tags: ['Alterations'], minutes: 45,
      items: [
        'Sharp fabric scissors', 'Matching heavy-duty thread', 'Pins or clips',
        'A machine with a denim needle', 'A hot iron',
      ],
      steps: [
        'Pin the new length with the original hem still attached.',
        'Sew just above the old hem line, then trim the excess.',
        'Fold the original hem back down and press it flat.',
      ],
    },
    {
      name: 'Build a capsule wardrobe', tags: ['Wardrobe'], minutes: 60,
      items: [
        'Everything you own, out on the bed', 'Three piles: keep, mend, release',
        'A notebook for the gaps list', 'Good daylight',
      ],
      steps: [
        'Sort every piece into keep, mend or release — no maybe pile.',
        'Build outfits from the keepers and note what is genuinely missing.',
        'Buy only from the gaps list, one piece at a time.',
      ],
    },
    {
      name: 'Care for raw denim', tags: ['Care'], minutes: 15,
      items: [
        'A basin of cold water', 'A capful of gentle detergent',
        'A shower rail or line for drying', 'Patience — months of it',
      ],
      steps: [
        'Wear them for months before the first wash; spot-clean instead.',
        'When wash day finally comes, soak inside-out in cold water.',
        'Hang to dry away from direct sun — never tumble.',
      ],
    },
    {
      name: 'Layer for shoulder season', tags: ['Styling'], minutes: 10,
      items: [
        'A breathable base layer', 'A light knit',
        'A packable outer shell', 'A scarf that earns its place',
      ],
      steps: [
        'Dress for the afternoon and carry for the morning.',
        'Keep every layer removable without ruining the outfit.',
        'Let the scarf do the color work.',
      ],
    },
    {
      name: 'Spot quality in a seam', tags: ['Know-how'], minutes: 12,
      items: [
        'A garment to inspect', 'Good daylight',
        'Two gentle hands for a tug test', 'A magnifier, if your eyes argue',
      ],
      steps: [
        'Check stitch density — more, even stitches signal care.',
        'Tug the seam gently; a good one closes without gaping.',
        'Look inside: finished raw edges separate keepers from fillers.',
      ],
    },
  ],
  galleryProjects: [
    'Spring lookbook', 'Atelier portrait series', 'Denim archive restoration',
    'Runway backstage diary', 'Editorial: city linen', 'Jewelry still-life study',
  ],
  personas: [
    { name: 'Camille Fontaine', role: 'Creative director' },
    { name: 'Jae Park', role: 'Pattern maker' },
    { name: 'Sofia Ricci', role: 'Stylist' },
    { name: 'Omar Haddad', role: 'Textile buyer' },
    { name: 'Isla Murray', role: 'Studio photographer' },
  ],
  stats: [
    { value: '100%', label: 'traceable fabrics' },
    { value: '48', label: 'pieces in the new collection' },
    { value: '3,900+', label: 'five-star fit reviews' },
    { value: '0', label: 'unsold stock destroyed — ever' },
  ],
  featureIdeas: [
    { title: 'Made to last', text: 'Reinforced seams, natural fibers and construction meant for a decade of wear.' },
    { title: 'True-to-you sizing', text: 'Real measurements on every product page, taken from the actual garment.' },
    { title: 'Deadstock fabrics', text: 'Limited runs cut from rescued mill fabric — when it is gone, it is gone.' },
    { title: 'Free alterations', text: 'First hem, nip or tuck on us at any of our studios.' },
    { title: 'Repair for life', text: 'Send it back tired and we will mend it, forever, for free.' },
    { title: 'Small-batch drops', text: 'New pieces land monthly in numbers we can sew well.' },
  ],
  habitIdeas: [
    'Steam tomorrow’s outfit', 'Sketch one silhouette', 'Pin three references',
    'Polish the good shoes', 'Log outfit of the day', 'Mend one small thing',
    'Declutter a drawer',
  ],
  todoIdeas: [
    'Send the lookbook to print', 'Fit session with the pattern maker', 'Source the brass hardware',
    'Photograph the scarf drop', 'Update the size guide', 'Pack orders before noon',
    'Book the pop-up venue',
  ],
  kanbanCards: [
    'Grade the wrap dress pattern', 'Approve the linen swatches', 'Shoot the spring lookbook',
    'Rework the denim wash', 'Price the jewelry line', 'Plan the sample sale',
    'Brief the web campaign', 'Fix the atelier lighting', 'Draft the wholesale linesheet',
  ],
  noteTitles: [
    'Collection moodboard', 'Fabric supplier shortlist', 'Fit notes — denim v3',
    'Lookbook shot list', 'Pop-up checklist', 'Alteration queue',
  ],
  chatContacts: ['Camille', 'Jae', 'Sofia', 'Omar'],
};

const PHOTOGRAPHY: TopicContent = {
  label: 'photography',
  glyph: '◉',
  products: [
    { name: 'Fine-art print, A2', price: 120, category: 'Prints' },
    { name: '50mm f/1.8 prime lens', price: 349, category: 'Gear' },
    { name: 'Portrait session (90 min)', price: 280, category: 'Sessions' },
    { name: 'Leather camera strap', price: 58, category: 'Gear' },
    { name: 'Editing preset pack', price: 39, category: 'Digital' },
    { name: 'Photo book: City in Fog', price: 65, category: 'Prints' },
    { name: 'Carbon travel tripod', price: 219, category: 'Gear' },
    { name: 'Film scanning service', price: 45, category: 'Services' },
    { name: 'Gift card — mini shoot', price: 150, category: 'Sessions' },
  ],
  posts: [
    { title: 'Shooting portraits with one window', excerpt: 'No strobes, no reflectors — just a north-facing window and patience. The setup behind our studio look.' },
    { title: 'Why I still carry a film camera', excerpt: 'Thirty-six frames force decisions that ten thousand never will. On slowness as a technique.' },
    { title: 'The edit: from 800 frames to 12', excerpt: 'Culling is where the story gets written. A pass-by-pass look at how a gallery takes shape.' },
    { title: 'Location scouting like a documentarian', excerpt: 'Arrive early, walk the block, watch the light move. Finding backdrops that do half the work.' },
    { title: 'Printing your work changes how you shoot', excerpt: 'A photograph is not finished on a screen. What the darkroom — or the lab — teaches the camera.' },
    { title: 'Golden hour is overrated', excerpt: 'Hard noon light, open shade, neon at midnight — a defense of every other hour of the day.' },
  ],
  recipes: [
    {
      name: 'Nail focus in low light', tags: ['Technique'], minutes: 15,
      items: [
        'A fast prime lens', 'A steady stance or a tripod',
        'Focus peaking or the magnifier turned on', 'One patient subject',
      ],
      steps: [
        'Open the aperture wide and find any edge of light on the subject.',
        'Magnify, focus on the nearest eye, then recompose gently.',
        'Shoot a short burst — one frame will be tack sharp.',
      ],
    },
    {
      name: 'Pose people who hate posing', tags: ['Portraits'], minutes: 20,
      items: [
        'A camera you can work without looking', 'A location with a short walk in it',
        'A pocketful of small talk', 'A stool or a wall to lean on',
      ],
      steps: [
        'Start walking and talking; shoot during, not after.',
        'Give tasks, not poses — fix a cuff, glance toward the corner.',
        'Show them one great frame early; the rest of the shoot relaxes.',
      ],
    },
    {
      name: 'Build a one-light studio', tags: ['Lighting'], minutes: 45,
      items: [
        'One strobe or speedlight', 'A large umbrella or softbox',
        'A light stand and trigger', 'A plain wall or paper roll',
      ],
      steps: [
        'Set the light at forty-five degrees, just above eye level.',
        'Adjust power until the shadow side still holds detail.',
        'Move the subject, not the light, for variety.',
      ],
    },
    {
      name: 'Cull a shoot in 30 minutes', tags: ['Workflow'], minutes: 30,
      items: [
        'Culling software with flag shortcuts', 'The client brief open beside you',
        'A calibrated monitor', 'A hard deadline and fresh coffee',
      ],
      steps: [
        'First pass: flag anything with a pulse — one second per frame.',
        'Second pass: keep the best of each duplicate cluster.',
        'Stop at the brief’s target count and export before you second-guess.',
      ],
    },
    {
      name: 'Scan and archive family negatives', tags: ['Film'], minutes: 60,
      items: [
        'A flatbed scanner with a film holder', 'Cotton gloves',
        'A blower brush for dust', 'Labeled archival sleeves', 'An external backup drive',
      ],
      steps: [
        'Dust each strip with the blower before it touches the glass.',
        'Scan at high resolution, one family batch at a time.',
        'File the negatives into labeled sleeves and back up the scans twice.',
      ],
    },
    {
      name: 'Export print-ready files', tags: ['Editing'], minutes: 15,
      items: [
        'The final selects, edited', 'The lab’s print specs',
        'A soft-proofing profile', 'A calibrated monitor',
      ],
      steps: [
        'Soft-proof against the paper profile and lift the shadows to match.',
        'Convert to the lab’s color space and sharpen for the print size.',
        'Export at the exact pixel dimensions the lab asks for.',
      ],
    },
  ],
  galleryProjects: [
    'Harbor fog series', 'Backstage at the ballet', 'Portraits of makers',
    'Neon nights, Osaka', 'Wedding, Lake Como', 'Silver gelatin darkroom set',
  ],
  personas: [
    { name: 'Elias Vance', role: 'Portrait photographer' },
    { name: 'Mara Silva', role: 'Photo editor' },
    { name: 'Ken Watanabe', role: 'Studio assistant' },
    { name: 'Ruth Adler', role: 'Gallery curator' },
    { name: 'Diego Fuentes', role: 'Retoucher' },
  ],
  stats: [
    { value: '120+', label: 'weddings photographed' },
    { value: '14', label: 'gallery exhibitions' },
    { value: '250k', label: 'frames in the archive' },
    { value: '48h', label: 'average gallery delivery' },
  ],
  featureIdeas: [
    { title: 'All-day coverage', text: 'From getting ready to the last dance — no hourly clock-watching.' },
    { title: 'Online proofing galleries', text: 'Private, password-protected galleries your family can actually use.' },
    { title: 'Archival prints', text: 'Museum-grade paper and pigment inks rated for a century.' },
    { title: 'Fast turnaround', text: 'Sneak peeks in 48 hours, full galleries inside two weeks.' },
    { title: 'Second shooter included', text: 'Two angles on every moment that matters.' },
    { title: 'Print-release licensing', text: 'Your photos are yours — print them anywhere, forever.' },
  ],
  habitIdeas: [
    'Shoot one frame daily', 'Back up the cards', 'Edit for 25 minutes',
    'Study one photographer’s work', 'Clean the lenses', 'Post a portfolio update',
    'Journal the best shot of the day',
  ],
  todoIdeas: [
    'Cull Saturday’s wedding', 'Order test prints', 'Reorder the portfolio page',
    'Invoice the Tanaka family', 'Scout the pier location', 'Renew the gear insurance',
    'Back up the 2025 archive',
  ],
  kanbanCards: [
    'Edit the harbor series', 'Book the studio for Thursday', 'Design the exhibition layout',
    'Retouch the cover selects', 'Update the pricing guide', 'Calibrate the monitor',
    'Reply to the gallery inquiry', 'Prep the client questionnaire', 'Sequence the photo book',
  ],
  noteTitles: [
    'Shot list — Riverside wedding', 'Exhibition ideas', 'Client call notes',
    'Gear wishlist', 'Editing recipes', 'Location scouting log',
  ],
  chatContacts: ['Elias', 'Mara', 'Ken', 'Ruth'],
};

const TRAVEL: TopicContent = {
  label: 'travel & places',
  glyph: '✈',
  products: [
    { name: 'Carry-on backpack, 35 L', price: 145, category: 'Bags' },
    { name: 'Packing cube set', price: 34, category: 'Packing' },
    { name: 'Merino travel tee', price: 55, category: 'Clothing' },
    { name: 'Universal power adapter', price: 25, category: 'Gear' },
    { name: 'City field guide: Lisbon', price: 18, category: 'Guides' },
    { name: 'Travel journal, A5', price: 22, category: 'Guides' },
    { name: 'Compression socks', price: 16, category: 'Clothing' },
    { name: 'Roll-top dry bag, 10 L', price: 28, category: 'Gear' },
    { name: 'Titanium spork', price: 12, category: 'Gear' },
  ],
  posts: [
    { title: 'Three slow days in Kyoto’s quieter wards', excerpt: 'Skip the queue at the golden temple. The mossy lanes, tofu lunches and sento baths locals keep to themselves.' },
    { title: 'How to pack for three climates in one bag', excerpt: 'Layers, merino and the discipline to leave the third pair of shoes at home.' },
    { title: 'Night trains are back — and better', excerpt: 'Falling asleep in one country and waking in another. A review of Europe’s new sleeper routes.' },
    { title: 'Eating through Oaxaca on $30 a day', excerpt: 'Markets over menus, tlayudas over tasting courses. Where the money goes further and tastes better.' },
    { title: 'The case for shoulder-season everything', excerpt: 'Half the crowds, softer light, kinder prices. Why May and October are the only months we book.' },
    { title: 'Lost luggage, found perspective', excerpt: 'The airline lost the bag for nine days. Here is everything I actually needed.' },
  ],
  recipes: [
    {
      name: 'Plan a two-week rail loop', tags: ['Planning'], minutes: 60,
      items: [
        'A rail map of the region', 'A shortlist of must-see stops',
        'A rail pass or fare comparison', 'A notebook for the route sketch',
      ],
      steps: [
        'Anchor the loop with the two cities you refuse to miss.',
        'Fill the middle with stops under three hours apart.',
        'Book only the first two nights; let the rest of the route breathe.',
      ],
    },
    {
      name: 'Pack carry-on only', tags: ['Packing'], minutes: 30,
      items: [
        'A carry-on bag, 40 litres or less', 'Packing cubes',
        'Merino layers that rewear well', 'A toiletry kit in travel sizes',
        'One pair of shoes you can walk all day in',
      ],
      steps: [
        'Lay out everything you want to bring, then remove a third.',
        'Roll clothes into the cubes by category.',
        'Wear the heaviest layer on the plane and keep documents on top.',
      ],
    },
    {
      name: 'Find honest street food', tags: ['Food'], minutes: 15,
      items: [
        'A market at its busy hour', 'Small bills in local currency',
        'An appetite and no fixed plan', 'Hand sanitizer for afterwards',
      ],
      steps: [
        'Follow the longest queue of locals, not the biggest sign.',
        'Order whatever the person ahead of you ordered.',
        'Eat standing where the vendor can watch your face light up.',
      ],
    },
    {
      name: 'Photograph markets respectfully', tags: ['Culture'], minutes: 20,
      items: [
        'A small, quiet camera or phone', 'A few phrases of the local language',
        'Coins for small purchases', 'A smile you actually mean',
      ],
      steps: [
        'Buy something first; be a customer before a photographer.',
        'Ask before portraits — a gesture at the camera works everywhere.',
        'Shoot the stalls, hands and produce; faces only after a yes.',
      ],
    },
    {
      name: 'Beat jet lag in 48 hours', tags: ['Health'], minutes: 10,
      items: [
        'A water bottle, refilled often', 'Sunglasses for the wrong-time light',
        'An eye mask and earplugs', 'A strict no-nap rule for day one',
      ],
      steps: [
        'Switch your watch to destination time at takeoff.',
        'Chase daylight in the new morning; hide from it at the new night.',
        'Stay up until a local bedtime, however heroic that feels.',
      ],
    },
    {
      name: 'Book multi-stop flights cheaply', tags: ['Flights'], minutes: 40,
      items: [
        'A flexible date range', 'A flight search with multi-city mode',
        'A spreadsheet for fare notes', 'Patience across a few evenings',
      ],
      steps: [
        'Price the loop as one multi-city ticket, then as separate legs.',
        'Try swapping the order of the middle cities.',
        'Book the longest leg first and position with short hops.',
      ],
    },
  ],
  galleryProjects: [
    'Patagonia trek diary', 'Marrakech market mornings', 'Islands of the Adriatic',
    'Night trains of Europe', 'Sahara star camp', 'Kyoto in the rain',
  ],
  personas: [
    { name: 'Nadia Rahman', role: 'Trip designer' },
    { name: 'Paolo Greco', role: 'Local guide' },
    { name: 'June Park', role: 'Travel writer' },
    { name: 'Felix Braun', role: 'Expedition lead' },
    { name: 'Carmen Ortiz', role: 'Concierge' },
  ],
  stats: [
    { value: '62', label: 'countries covered' },
    { value: '4.9/5', label: 'traveler rating' },
    { value: '180+', label: 'hand-tested stays' },
    { value: '0', label: 'tourist traps recommended' },
  ],
  featureIdeas: [
    { title: 'Locals-first itineraries', text: 'Routes built by people who live there, not by an algorithm scraping reviews.' },
    { title: 'Small groups only', text: 'Never more than eight travelers — the whole point is to fit in the taxi.' },
    { title: 'Flexible rebooking', text: 'Plans change. Move any trip up to a week before departure, free.' },
    { title: 'Offline everything', text: 'Maps, tickets and phrase sheets that work in airplane mode.' },
    { title: 'Carbon-aware routing', text: 'Trains over flights where the map allows, with honest trade-off notes.' },
    { title: '24/7 trip support', text: 'A human on the line in your time zone, not a chatbot in ours.' },
  ],
  habitIdeas: [
    'Learn five local words', 'Journal one page', 'Walk a street you haven’t',
    'Photograph breakfast', 'Back up the day’s photos', 'Check tomorrow’s route',
    'Send someone a postcard',
  ],
  todoIdeas: [
    'Renew the passport', 'Book the Kyoto ryokan', 'Print the train reservations',
    'Pack the first-aid kit', 'Download offline maps', 'Confirm the airport pickup',
    'Exchange for local currency',
  ],
  kanbanCards: [
    'Draft the Lisbon itinerary', 'Confirm the riad booking', 'Research rail passes',
    'Write the packing checklist', 'Plan the food tour stops', 'Scout the hiking routes',
    'Update the visa notes', 'Reserve the stargazing camp', 'Map the café stops',
  ],
  noteTitles: [
    'Kyoto day-by-day', 'Packing list — spring', 'Places locals mentioned',
    'Budget tracker notes', 'Train timetable clippings', 'Next trip ideas',
  ],
  chatContacts: ['Nadia', 'Paolo', 'June', 'Felix'],
};

const MUSIC: TopicContent = {
  label: 'music & sound',
  glyph: '♫',
  products: [
    { name: 'Closed-back studio headphones', price: 179, category: 'Studio' },
    { name: 'Dynamic vocal microphone', price: 99, category: 'Studio' },
    { name: 'Vinyl: Midnight Sessions LP', price: 28, category: 'Records' },
    { name: 'Organic cotton band tee', price: 25, category: 'Merch' },
    { name: 'MIDI keyboard, 49-key', price: 139, category: 'Studio' },
    { name: 'Guitar strings, 3-pack', price: 18, category: 'Accessories' },
    { name: 'Acoustic foam panel kit', price: 45, category: 'Studio' },
    { name: 'Signed tour poster', price: 20, category: 'Merch' },
    { name: 'Cassette: Live at the Owl', price: 12, category: 'Records' },
  ],
  posts: [
    { title: 'Tracking drums in a living room', excerpt: 'Rugs, duvets and one good overhead. How the EP’s drum sound came out of a rented flat.' },
    { title: 'Our first tour: what we’d do differently', excerpt: 'Nine cities, one van, several lessons about sleep, merch tables and free parking.' },
    { title: 'Mixing on headphones: a survival guide', excerpt: 'No treated room? No problem — mostly. Reference tracks, crossfeed and knowing your cans.' },
    { title: 'The pedalboard, explained', excerpt: 'Signal chain, gain staging and why the tuner goes first. A guided tour of the board.' },
    { title: 'How the new EP came together in nine days', excerpt: 'A cabin, a tape machine and a rule: no phones until sundown. The fastest we have ever worked.' },
    { title: 'Vinyl test pressings: what to listen for', excerpt: 'Surface noise, inner-groove distortion and the low-end reality check. Approving your first lacquer.' },
  ],
  recipes: [
    {
      name: 'Warm up your voice in 10 minutes', tags: ['Vocals'], minutes: 10,
      items: [
        'A quiet room', 'Warm water, not iced',
        'A piano app or a drone note', 'A straw for gentle sirens',
      ],
      steps: [
        'Hum lightly up and down a five-note scale.',
        'Siren through the straw from low to high without pushing.',
        'Finish with a verse of something easy, sung soft.',
      ],
    },
    {
      name: 'Record a demo at home', tags: ['Recording'], minutes: 90,
      items: [
        'One microphone that works', 'Headphones you know well',
        'A DAW with a click track', 'A duvet for the echoey corner', 'A quiet hour',
      ],
      steps: [
        'Hang the duvet, set the click, and get levels safely below clipping.',
        'Track a scratch take top to bottom, mistakes and all.',
        'Replace only the parts of the scratch take that bother you.',
        'Bounce a rough mix and live with it for a day before judging.',
      ],
    },
    {
      name: 'Tune drums by ear', tags: ['Drums'], minutes: 25,
      items: [
        'A drum key', 'A room you can be loud in',
        'A reference song with drums you love', 'Fresh heads, if the old ones are dented',
      ],
      steps: [
        'Seat the head and take each lug to finger-tight.',
        'Work in small, opposite-lug turns until the pitch evens out.',
        'Tap near each lug and match the tones around the drum.',
      ],
    },
    {
      name: 'Build a daily practice routine', tags: ['Practice'], minutes: 20,
      items: [
        'A metronome', 'A practice log',
        'One piece you love and one that scares you', 'A timer set to twenty minutes',
      ],
      steps: [
        'Warm up slowly for five minutes on fundamentals.',
        'Spend ten on the scary piece at a tempo you can play cleanly.',
        'End on the piece you love, and log the tempo you earned.',
      ],
    },
    {
      name: 'Master a track for streaming', tags: ['Mixing'], minutes: 60,
      items: [
        'The final mix at full resolution', 'Reference tracks in the same genre',
        'A limiter and a loudness meter', 'Fresh ears — take the break first',
      ],
      steps: [
        'Match your references at equal loudness before judging anything.',
        'Ride the limiter to streaming spec on the meter, not past it.',
        'Check on small speakers and in the car before calling it done.',
      ],
    },
    {
      name: 'Write a chorus that sticks', tags: ['Songwriting'], minutes: 30,
      items: [
        'A voice memo app', 'An instrument or a beat loop',
        'A title phrase you keep saying', 'Twenty minutes without your inbox',
      ],
      steps: [
        'Sing the title phrase over the loop until a shape appears.',
        'Keep the melody inside one octave; save the leap for the last line.',
        'Record every pass — the keeper hides in take three or four.',
      ],
    },
  ],
  galleryProjects: [
    'EP cover shoot', 'Live at the Owl Room', 'Studio session diaries',
    'Tour poster series', 'Music video stills', 'Rehearsal space build',
  ],
  personas: [
    { name: 'Remy Laurent', role: 'Producer' },
    { name: 'Tasha Green', role: 'Vocalist' },
    { name: 'Oli Sandoval', role: 'Drummer' },
    { name: 'Mia Torres', role: 'Booking agent' },
    { name: 'Gus Meyer', role: 'Sound engineer' },
  ],
  stats: [
    { value: '120+', label: 'shows played' },
    { value: '1.2M', label: 'streams this year' },
    { value: '9', label: 'cities on the tour' },
    { value: '3', label: 'EPs released' },
  ],
  featureIdeas: [
    { title: 'Live session videos', text: 'One take, one room, no edits — the songs as they actually sound.' },
    { title: 'Lossless downloads', text: 'Every release in full resolution, yours to keep offline.' },
    { title: 'Early ticket access', text: 'Members hear about shows before the posters go up.' },
    { title: 'Behind-the-scenes feed', text: 'Demos, voice memos and studio arguments, unfiltered.' },
    { title: 'Vinyl-first releases', text: 'Pressings land two weeks before streaming, numbered and signed.' },
    { title: 'Sample pack library', text: 'Stems and loops from our sessions, cleared for your tracks.' },
  ],
  habitIdeas: [
    'Practice scales for 15 minutes', 'Write eight bars', 'One ear-training drill',
    'Log the practice tempo', 'Back up the session files', 'Listen to one classic album',
    'Stretch before drumming',
  ],
  todoIdeas: [
    'Book the rehearsal room', 'Mix the bridge section', 'Order the merch restock',
    'Send stems to the engineer', 'Post the tour dates', 'Restring the Telecaster',
    'Master the new single',
  ],
  kanbanCards: [
    'Track vocals for "Undertow"', 'Design the tour poster', 'Book the Owl Room',
    'Edit the live video', 'Approve the vinyl test pressing', 'Draft the setlist',
    'Pitch the playlist editors', 'Fix the bass amp hum', 'Plan the album teaser',
  ],
  noteTitles: [
    'Lyrics — Undertow', 'Setlist drafts', 'Mix notes v3',
    'Tour budget', 'Gear repair list', 'Song ideas from voice memos',
  ],
  chatContacts: ['Remy', 'Tasha', 'Oli', 'Mia'],
};

const WELLNESS: TopicContent = {
  label: 'wellness & calm',
  glyph: '❊',
  products: [
    { name: 'Lavender sleep balm', price: 24, category: 'Sleep' },
    { name: 'Buckwheat meditation cushion', price: 58, category: 'Studio' },
    { name: 'Jade facial roller', price: 26, category: 'Skincare' },
    { name: 'Herbal tea sampler', price: 19, category: 'Pantry' },
    { name: 'Weighted blanket, 7 kg', price: 129, category: 'Sleep' },
    { name: 'Essential oil trio', price: 42, category: 'Aromatherapy' },
    { name: 'Silk sleep mask', price: 35, category: 'Sleep' },
    { name: 'Gua sha stone', price: 22, category: 'Skincare' },
    { name: 'Ceramic aroma diffuser', price: 49, category: 'Aromatherapy' },
  ],
  posts: [
    { title: 'A realistic guide to meditating badly', excerpt: 'Your mind will wander four hundred times. That is the practice, not the failure.' },
    { title: 'What your skin barrier actually needs', excerpt: 'Less acid, more patience. A dermatologist-reviewed reset for over-exfoliated skin.' },
    { title: 'The science of winding down', excerpt: 'Light, temperature and the ninety minutes before bed. Small levers with outsized effects.' },
    { title: 'Breathwork for deadline weeks', excerpt: 'Four counts in, six counts out. The physiology of staying calm on purpose.' },
    { title: 'Our therapists on saying no kindly', excerpt: 'Boundaries are a wellness practice. Scripts for declining without the guilt spiral.' },
    { title: 'Small rituals that anchor a week', excerpt: 'Sunday tea, Wednesday walk, Friday phone sunset. Structure disguised as treats.' },
  ],
  recipes: [
    {
      name: 'Build a 10-minute evening ritual', tags: ['Ritual'], minutes: 10,
      items: [
        'A candle or soft lamp', 'Something warm to drink',
        'A journal and a pen', 'Phone in another room',
      ],
      steps: [
        'Lower the lights and pour the warm drink.',
        'Write three unhurried lines about the day.',
        'Sit quietly until the cup is finished — that is the whole ritual.',
      ],
    },
    {
      name: 'Give yourself a proper facial massage', tags: ['Skincare'], minutes: 15,
      items: [
        'A clean face and clean hands', 'A facial oil or rich moisturizer',
        'A gua sha stone or jade roller, if you have one', 'A mirror in good light',
      ],
      steps: [
        'Warm the oil between your fingertips and press it on.',
        'Sweep upward from jaw to temples in slow strokes.',
        'Finish with light circles at the temples and one long exhale.',
      ],
    },
    {
      name: 'Box-breathe through stress', tags: ['Breathwork'], minutes: 5,
      items: [
        'A chair with a straight back', 'A quiet-ish corner',
        'One hand resting on your belly', 'Four slow counts',
      ],
      steps: [
        'Inhale for four counts, feeling the hand rise.',
        'Hold for four, exhale for four, hold for four.',
        'Repeat the square for five rounds and notice the room again.',
      ],
    },
    {
      name: 'Set up a sleep-first bedroom', tags: ['Sleep'], minutes: 30,
      items: [
        'Blackout curtains or an eye mask', 'A cooler thermostat setting',
        'A charger that lives outside the bedroom', 'A pleasantly dull paper book',
      ],
      steps: [
        'Darken the room properly — cover the standby lights too.',
        'Drop the temperature a couple of degrees below daytime.',
        'Banish the phone charger and leave the book on the pillow.',
      ],
    },
    {
      name: 'Stretch out desk shoulders', tags: ['Movement'], minutes: 12,
      items: [
        'A doorway', 'A rolled-up towel',
        'A floor you can lie on', 'Twelve unhurried minutes',
      ],
      steps: [
        'Stretch your chest in the doorway, one forearm on each side.',
        'Lie back over the rolled towel along your spine, arms wide.',
        'Finish with slow shoulder rolls, dropping them on each exhale.',
      ],
    },
    {
      name: 'Brew a calming herbal infusion', tags: ['Herbal'], minutes: 8,
      items: [
        'Chamomile or lemon balm, loose or bagged', 'Just-off-the-boil water',
        'A teapot with a lid', 'Honey to taste',
      ],
      steps: [
        'Warm the pot, add the herbs and pour the water over.',
        'Lid on, steep for five full minutes — longer than regular tea.',
        'Strain, add honey, and drink it somewhere without a screen.',
      ],
    },
  ],
  galleryProjects: [
    'The calm corner refresh', 'Retreat weekend, Big Sur', 'Morning ritual series',
    'Treatment room redesign', 'Botanical apothecary shelf', 'Sunrise meditation deck',
  ],
  personas: [
    { name: 'Dr. Amina Yusuf', role: 'Dermatologist' },
    { name: 'Claire Dubois', role: 'Spa director' },
    { name: 'Ravi Menon', role: 'Meditation teacher' },
    { name: 'Hana Sato', role: 'Esthetician' },
    { name: 'Lucia Vega', role: 'Massage therapist' },
  ],
  stats: [
    { value: '96%', label: 'guests who rebook' },
    { value: '15+', label: 'treatments on the menu' },
    { value: '8 min', label: 'average time to unwind' },
    { value: '12k', label: 'minutes meditated by members' },
  ],
  featureIdeas: [
    { title: 'Therapist-designed', text: 'Every ritual and treatment written with licensed practitioners.' },
    { title: 'Clean ingredients only', text: 'Full ingredient lists, no fragrance mysteries, nothing we would not use ourselves.' },
    { title: 'Book in two taps', text: 'See real availability and reserve without a phone call.' },
    { title: 'Personal ritual plans', text: 'A routine sized to your actual week, not an influencer’s.' },
    { title: 'Quiet hours', text: 'Phone-free rooms and unhurried appointments — we never double-book.' },
    { title: 'Gift-ready packaging', text: 'Everything arrives wrapped, with a handwritten note if you like.' },
  ],
  habitIdeas: [
    'Morning pages', 'Ten deep breaths before email', 'SPF every morning',
    'Screen sunset at nine', 'One gratitude line before bed', 'Stretch at midday',
    'Water first, coffee second',
  ],
  todoIdeas: [
    'Book the monthly massage', 'Restock the chamomile tea', 'Prep the Sunday bath ritual',
    'Update the wind-down playlist', 'Journal three pages', 'Plan a screen-free evening',
    'Refill the diffuser',
  ],
  kanbanCards: [
    'Design the new facial menu', 'Order the massage oils', 'Train the team on gua sha',
    'Refresh the relaxation room', 'Write the sleep guide', 'Plan the spring retreat',
    'Photograph the product line', 'Simplify the booking flow', 'Launch the gift cards',
  ],
  noteTitles: [
    'Morning ritual v2', 'Retreat packing list', 'Skincare routine notes',
    'Practitioner recommendations', 'Breathwork scripts', 'Sleep log observations',
  ],
  chatContacts: ['Claire', 'Ravi', 'Hana', 'Lucia'],
};

const GENERIC: TopicContent = {
  label: 'everyday essentials',
  glyph: '✺',
  products: [
    { name: 'Juniper candle', price: 24, category: 'Home' },
    { name: 'Linen tote bag', price: 32, category: 'Everyday' },
    { name: 'Walnut desk tray', price: 45, category: 'Desk' },
    { name: 'Stoneware mug pair', price: 38, category: 'Kitchen' },
    { name: 'Wool throw blanket', price: 89, category: 'Home' },
    { name: 'Brass page marker', price: 14, category: 'Desk' },
    { name: 'Field notebook trio', price: 18, category: 'Desk' },
    { name: 'Botanical wall print', price: 28, category: 'Walls' },
    { name: 'Cedar soap bar', price: 9, category: 'Bath' },
  ],
  posts: [
    { title: 'What a slow morning taught me about shipping', excerpt: 'I missed a deadline, made porridge, and accidentally learned the difference between urgency and momentum.' },
    { title: 'A week without notifications', excerpt: 'Seven days with every badge and banner switched off. Some findings were predictable. One was not.' },
    { title: 'The quiet power of good defaults', excerpt: 'Most users never open the settings page. What you choose for them is the product.' },
    { title: 'Keeping a paper logbook in a digital job', excerpt: 'Three years of one-line entries in a cheap notebook, and why I keep doing it.' },
    { title: 'A gentle case for fewer features', excerpt: 'Deleting the roadmap’s bottom half was the most productive afternoon of the quarter.' },
    { title: 'Small tools, sharp edges', excerpt: 'On preferring the utility knife to the multitool, in software and elsewhere.' },
  ],
  recipes: [
    {
      name: 'Plan a focused week', tags: ['Planning'], minutes: 20,
      items: [
        'A calendar you actually check', 'A shortlist of three priorities',
        'A pen and one sheet of paper', 'Twenty quiet minutes on Sunday',
      ],
      steps: [
        'Write the three things that would make the week a win.',
        'Block time for each before anything else lands on the calendar.',
        'Leave one afternoon unplanned as a shock absorber.',
      ],
    },
    {
      name: 'Declutter one drawer properly', tags: ['Home'], minutes: 15,
      items: [
        'One drawer — just one', 'A bin bag and a donate box',
        'A damp cloth', 'A timer set to fifteen minutes',
      ],
      steps: [
        'Empty the drawer completely and wipe it clean.',
        'Return only what you have actually used this year.',
        'Bag the rest for the bin or the donate box before doubt sets in.',
      ],
    },
    {
      name: 'Run a useful retrospective', tags: ['Teams'], minutes: 30,
      items: [
        'A shared doc or whiteboard', 'Three columns: keep, drop, try',
        'A timebox everyone can see', 'One volunteer to write things down',
      ],
      steps: [
        'Fill the columns in silence first, then discuss the most-voted notes.',
        'Agree on at most two changes to actually try.',
        'Give each change an owner and a check-in date.',
      ],
    },
    {
      name: 'Write a clear one-pager', tags: ['Writing'], minutes: 25,
      items: [
        'The single decision the page must serve', 'A blank document',
        'Your three strongest facts', 'A reader to test it on',
      ],
      steps: [
        'State the recommendation in the first sentence.',
        'Support it with the three facts, one short paragraph each.',
        'Cut everything the test reader skims.',
      ],
    },
    {
      name: 'Set up a weekly review', tags: ['Planning'], minutes: 20,
      items: [
        'A recurring calendar slot', 'Last week’s list and notes',
        'An empty page for next week', 'A drink that makes it pleasant',
      ],
      steps: [
        'Sweep the week’s loose ends into one list.',
        'Mark each item: do next week, delegate, or drop.',
        'Sketch next week’s three priorities while it is all fresh.',
      ],
    },
    {
      name: 'Archive a finished project', tags: ['Order'], minutes: 15,
      items: [
        'The project’s scattered files, gathered up', 'A dated archive folder',
        'A short closing note to your future self', 'Ten honest minutes',
      ],
      steps: [
        'Move everything into one dated folder — resist reorganizing it.',
        'Write three lines: what worked, what did not, what to reuse.',
        'Close the tabs, the tickets and the mental loop.',
      ],
    },
  ],
  galleryProjects: [
    'Wayfarer identity', 'Lumen app redesign', 'Harbor editorial',
    'Atlas packaging', 'Field-guide microsite', 'Cobalt exhibition',
  ],
  personas: [
    { name: 'Maya Linden', role: 'Founder, Fieldnote Labs' },
    { name: 'Tomas Reyes', role: 'Product designer' },
    { name: 'Priya Nair', role: 'Studio owner' },
    { name: 'Jonah Beck', role: 'Operations lead' },
    { name: 'Ruth Okafor', role: 'Marketing director' },
  ],
  stats: [
    { value: '12k+', label: 'people on board' },
    { value: '99.2%', label: 'uptime last year' },
    { value: '4.8/5', label: 'average rating' },
    { value: '36h', label: 'saved per member, monthly' },
  ],
  featureIdeas: [
    { title: 'Quick to start', text: 'Be productive before your coffee cools — nothing to install, nothing to configure.' },
    { title: 'Thoughtful defaults', text: 'Sensible settings out of the box, with room to tune everything later.' },
    { title: 'Works everywhere', text: 'A responsive layout that feels at home on phones, tablets and widescreens.' },
    { title: 'Private by design', text: 'Your data stays yours. No trackers, no surprise sharing, no fine print.' },
    { title: 'Keyboard friendly', text: 'Every common action has a shortcut, so your hands never leave the keys.' },
    { title: 'Built to last', text: 'Fast pages, honest engineering and updates that never break your flow.' },
  ],
  habitIdeas: [
    'Morning stretch', 'Read 20 pages', 'Drink two liters of water',
    'Walk outside', 'Write three journal lines', 'Lights out by eleven',
    'Tidy one surface',
  ],
  todoIdeas: [
    'Sketch tomorrow’s plan', 'Clear the inbox to zero', 'Book the dentist appointment',
    'Stretch for ten minutes', 'Refill the coffee jar', 'Return the library books',
    'Update the budget sheet',
  ],
  kanbanCards: [
    'Draft the onboarding email', 'Fix the header overlap on mobile', 'Collect beta feedback',
    'Write the changelog entry', 'Design the empty states', 'Refactor the settings panel',
    'Plan the next sprint', 'Update the pricing copy', 'Tidy the component library',
  ],
  noteTitles: [
    'Reading list', 'Kickoff meeting notes', 'Ideas parking lot',
    'Grocery staples', 'Trip sketch', 'Weekly review',
  ],
  chatContacts: ['Sam', 'Noor', 'Kit', 'Ada'],
};

const CONTENT: Record<TopicDomain, TopicContent> = {
  food: FOOD,
  plants: PLANTS,
  tech: TECH,
  fitness: FITNESS,
  fashion: FASHION,
  photography: PHOTOGRAPHY,
  travel: TRAVEL,
  music: MUSIC,
  wellness: WELLNESS,
  generic: GENERIC,
};

/** Rotates a pool by a seeded offset so different seeds surface different items first. */
function rotated<T>(pool: readonly T[], rng: Rng): readonly T[] {
  if (pool.length === 0) return pool;
  const offset = rng.int(0, pool.length - 1);
  return [...pool.slice(offset), ...pool.slice(0, offset)];
}

/**
 * Returns the content pools for a domain, each rotated by a seeded offset —
 * membership is stable, ordering varies between seeds.
 */
export function contentFor(topic: TopicDomain, rng: Rng): TopicContent {
  const base = CONTENT[topic];
  return {
    label: base.label,
    glyph: base.glyph,
    products: rotated(base.products, rng),
    posts: rotated(base.posts, rng),
    recipes: rotated(base.recipes, rng), // each entry keeps its own items/steps
    galleryProjects: rotated(base.galleryProjects, rng),
    personas: rotated(base.personas, rng),
    stats: rotated(base.stats, rng),
    featureIdeas: rotated(base.featureIdeas, rng),
    habitIdeas: rotated(base.habitIdeas, rng),
    todoIdeas: rotated(base.todoIdeas, rng),
    kanbanCards: rotated(base.kanbanCards, rng),
    noteTitles: rotated(base.noteTitles, rng),
    chatContacts: rotated(base.chatContacts, rng),
  };
}

/* ------------------------------------------------------------------ */
/* Naming support (used by parse)                                      */
/* ------------------------------------------------------------------ */

/** Brandable nouns per domain for generated project names. */
export const TOPIC_NAME_NOUNS: Record<TopicDomain, readonly string[]> = {
  food: ['Crumb', 'Roast', 'Pantry', 'Ember', 'Skillet', 'Grove'],
  plants: ['Fern', 'Sprout', 'Bloom', 'Canopy', 'Tendril', 'Moss'],
  tech: ['Stack', 'Vector', 'Signal', 'Query', 'Kernel', 'Shipyard'],
  fitness: ['Stride', 'Rep', 'Summit', 'Pulse', 'Form', 'Circuit'],
  fashion: ['Thread', 'Hem', 'Atelier', 'Weave', 'Drape', 'Seam'],
  photography: ['Aperture', 'Frame', 'Darkroom', 'Exposure', 'Lens', 'Contact'],
  travel: ['Compass', 'Waypoint', 'Meridian', 'Harbor', 'Passage', 'Atlas'],
  music: ['Chord', 'Reverb', 'Tempo', 'Octave', 'Analog', 'Encore'],
  wellness: ['Haven', 'Stillness', 'Balm', 'Ritual', 'Repose', 'Aura'],
  generic: [],
};

/** Ready-made taglines per domain, used when the prompt names no topic phrase. */
export const TOPIC_TAGLINES: Record<TopicDomain, readonly string[]> = {
  food: [
    'Good things, made from scratch daily.',
    'From our kitchen to your table.',
    'Seasonal, honest and always fresh.',
  ],
  plants: [
    'Bring something green home.',
    'Grown with patience, sold with care.',
    'More leaves, less stress.',
  ],
  tech: [
    'Ship faster. Sleep better.',
    'The tools your team actually wants.',
    'Built for the way you work.',
  ],
  fitness: [
    'Show up. Get stronger.',
    'Train smart, recover well.',
    'Every rep counts here.',
  ],
  fashion: [
    'Made well, worn often.',
    'Fewer, better pieces.',
    'Style that outlasts the season.',
  ],
  photography: [
    'Moments, kept beautifully.',
    'Light, caught and printed.',
    'Your story, frame by frame.',
  ],
  travel: [
    'Go further, pack lighter.',
    'The world, thoughtfully routed.',
    'Trips worth the jet lag.',
  ],
  music: [
    'Turn it up, keep it honest.',
    'Songs first, everything else after.',
    'Loud where it matters.',
  ],
  wellness: [
    'Slow down, on purpose.',
    'Care you can feel.',
    'Calm, bottled and bookable.',
  ],
  generic: [],
};

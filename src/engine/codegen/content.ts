/**
 * Topic system — detects the content domain a prompt is about and provides
 * per-domain content pools so generated copy actually matches the brief
 * (a plant shop sells Monsteras, a tech blog writes about shipping).
 *
 * Pure and deterministic: detection is keyword scoring, all variety comes
 * from the caller-provided Rng.
 */
import { createRng, type Rng } from '@/lib/seeded';
import type { ProjectSpec, TopicDomain } from '../types';

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

export interface TopicFaq {
  q: string;
  a: string;
}

/**
 * A quote for the testimonials section. `{name}` is replaced with the
 * project's brand name at render time; `by` optionally names the persona
 * role the quote reads most naturally from.
 */
export interface TopicTestimonial {
  quote: string;
  by?: string;
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
  /** Plausible partner/press wordmarks for logo strips (6 per domain). */
  logoNames: readonly string[];
  /** Specific 2–3 sentence origin blurb for about/split sections. */
  longAbout: string;
  /** Street-address flavor line for contact blocks and footers. */
  contactLine: string;
  /** Opening-hours flavor line for contact blocks and footers. */
  hoursLine: string;
  /** Short hero kicker/eyebrow lines (4+). */
  heroKickers: readonly string[];
  /** Tagline grammar: evocative imagery fragments (≥8, lowercase). */
  taglineImagery: readonly string[];
  /** Tagline grammar: promise fragments that follow a comma/dash (≥6, lowercase). */
  taglinePromises: readonly string[];
  /** Domain-concrete FAQ entries (≥6 per domain via contentFor). */
  faq: readonly TopicFaq[];
  /** Domain-concrete testimonial quotes (≥6 per domain via contentFor). */
  testimonials: readonly TopicTestimonial[];
}

/* ------------------------------------------------------------------ */
/* Sub-topic flavors (voices)                                          */
/* ------------------------------------------------------------------ */

/**
 * Some domains cover several distinct businesses. A "flavor" is one
 * coherent voice inside such a domain — a coffee roastery and a bakery are
 * both `food`, but must never share a page. Non-split domains use
 * 'general'.
 */
export type FoodFlavor = 'coffee' | 'bakery' | 'restaurant';
export type MusicFlavor = 'podcast' | 'band' | 'studio';
export type FitnessFlavor = 'gym' | 'yoga' | 'run';
export type TopicFlavor = FoodFlavor | MusicFlavor | FitnessFlavor | 'general';

/**
 * One coherent sub-voice of a split domain. Pools listed here replace or
 * lead the domain's general pools; optional pools fall back to the general
 * ones. Tagline pools are voice-exclusive so every composed tagline carries
 * a keyword the flavor detector can recover at regeneration time.
 */
export interface TopicVoice {
  nameNouns: readonly string[];
  personas: readonly TopicPersona[];
  stats: readonly TopicStat[];
  featureIdeas: readonly TopicFeature[];
  heroKickers: readonly string[];
  taglineImagery: readonly string[];
  taglinePromises: readonly string[];
  faq: readonly TopicFaq[];
  testimonials: readonly TopicTestimonial[];
  longAbout: string;
  products?: readonly TopicProduct[];
  posts?: readonly TopicPost[];
  galleryProjects?: readonly string[];
  logoNames?: readonly string[];
  contactLine?: string;
  hoursLine?: string;
}

/* ------------------------------------------------------------------ */
/* Pools                                                               */
/* ------------------------------------------------------------------ */

/**
 * FOOD base pools hold only voice-neutral entries; the coffee, bakery and
 * restaurant voices below carry everything sub-topic-specific. contentFor
 * merges them: flavored views get voice + general, unflavored views get all.
 */
const FOOD: TopicContent = {
  label: 'food & drink',
  glyph: '☕',
  products: [
    { name: 'Small-batch raspberry jam', price: 9.5, category: 'Pantry' },
    { name: 'Wildflower honey jar', price: 11, category: 'Pantry' },
    { name: 'First-press olive oil', price: 19, category: 'Pantry' },
    { name: 'Waxed-canvas market tote', price: 24, category: 'Goods' },
  ],
  posts: [
    { title: 'What the market had this morning', excerpt: 'Six crates, one impulse buy and a rhubarb negotiation. A diary of the 6am produce run.' },
    { title: 'The suppliers we call first', excerpt: 'Eleven names on a chalkboard, each one visited in person. How the sourcing list earns its places.' },
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
    'Farmers market stall', 'Summer preserving weekend', 'The new counter build',
  ],
  personas: [
    { name: 'Sam Whitfield', role: 'Weekend regular' },
    { name: 'Priya Patel', role: 'Market neighbor' },
  ],
  stats: [
    { value: '92%', label: 'regulars who order "the usual"' },
    { value: '11', label: 'local suppliers on speed dial' },
  ],
  featureIdeas: [
    { title: 'Gift boxes', text: 'Build a box from anything on the shelves and we wrap it properly. Add a note and a person with a real pen writes it out.' },
    { title: 'Local delivery', text: 'Orders in by noon ride out on the cargo bike the same day. Delivery stays free inside the river quarter.' },
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
  logoNames: ['Morning Standard', 'City Larder', 'The Slow Fork'],
  longAbout:
    'What began as a single market stall is now a small food business with eleven people who argue happily about seasonality. We buy from growers we can call by first name and taste everything before it earns a place on the shelf.',
  contactLine: '14 Millstone Lane, river quarter',
  hoursLine: 'Tue–Sun 8:00–17:00 · market stall Saturdays',
  heroKickers: ['Small batches, big mornings', 'Open since first light', 'Seasonal and seriously fresh', 'Made nearby, sold fresh'],
  taglineImagery: ['slow mornings', 'the good stuff, in season', 'shelves stocked by hand', 'the first taste of the day', 'seasonal and unhurried', 'food with a first name'],
  taglinePromises: ['made from scratch daily', 'worth getting up early for', 'served without ceremony', 'sourced from people we know', 'honest about what is in season', 'better than it needs to be'],
  faq: [
    { q: 'Where do your ingredients come from?', a: 'Named farms and small importers we visit ourselves. The chalkboard lists every supplier, and the list changes with the seasons — never with the invoice.' },
    { q: 'Can you work around allergies?', a: 'Tell us what to avoid and we will walk you through every ingredient — nothing here comes out of an unlabeled bucket. Nuts and dairy get their own prep space.' },
    { q: 'Do you deliver?', a: 'Inside the river quarter, yes — same day by cargo bike for anything ordered before noon. Farther out, pantry goods ship twice a week.' },
  ],
  testimonials: [
    { quote: 'The {name} gift box converted my whole office — three colleagues asked for the order link before lunch.', by: 'Market neighbor' },
    { quote: 'Two years a Saturday regular and {name} has never once coasted. The standards are quietly ferocious.', by: 'Weekend regular' },
  ],
};

/* ---------------------------- food voices -------------------------- */

const FOOD_COFFEE: TopicVoice = {
  nameNouns: ['Roast', 'Crema', 'Kettle', 'Cortado', 'Filter', 'Ember'],
  products: [
    { name: 'Single-origin espresso beans', price: 18.5, category: 'Coffee' },
    { name: 'Cold brew concentrate', price: 14, category: 'Coffee' },
    { name: 'House-blend drip bags (10)', price: 16, category: 'Coffee' },
    { name: 'Ceramic pour-over dripper', price: 24, category: 'Brewing' },
    { name: 'Hand-burr coffee grinder', price: 89, category: 'Brewing' },
  ],
  posts: [
    { title: 'Behind the roast: cupping notes from this week', excerpt: 'Every batch gets tasted before it ships. Here is what we found in the new Huila lot — and why we roast it lighter.' },
    { title: 'The quiet craft of a proper crema', excerpt: 'Grind, dose, tamp, time. The four variables that separate a flat shot from a glossy one.' },
    { title: 'A field trip to the growers cooperative', excerpt: 'We spent a week at origin meeting the families behind our best-selling beans. Notes from the wet mill.' },
  ],
  galleryProjects: ['Espresso bar rebuild', 'Roastery open day', 'Latte art throwdown'],
  personas: [
    { name: 'Marta Oliveira', role: 'Head roaster' },
    { name: 'Yuki Hara', role: 'Café manager' },
    { name: 'Dre Wilson', role: 'Green-bean buyer' },
  ],
  stats: [
    { value: '4,200', label: 'cups poured every week' },
    { value: '14', label: 'single-origin lots this season' },
    { value: '3 days', label: 'from roast to shelf' },
  ],
  featureIdeas: [
    { title: 'Roasted weekly', text: 'Beans ship within 48 hours of the roast, never from a warehouse shelf. Every bag carries its roast date and a one-line cupping note.' },
    { title: 'Direct trade', text: 'We buy from growers we have met, at prices we would say out loud. Fourteen farms, three origins, zero brokers in between.' },
    { title: 'Brew guides', text: 'Dial in every bag with ratios and timings written by our baristas. Start at 1:16 and 94 degrees, then move one variable at a time.' },
    { title: 'Subscriptions', text: 'Fresh beans on your doorstep on your schedule — pause or swap anytime. Most members settle on a 250 g bag every second Friday.' },
    { title: 'Wholesale program', text: 'Training, gear and beans for cafés that care as much as we do. Onboarding includes two full days behind our own bar.' },
  ],
  logoNames: ['Roast Quarterly', 'Brew District', 'The Daily Pull'],
  longAbout:
    'What began as a two-group espresso cart outside the farmers market is now a roastery with a rebuilt 1978 drum roaster and a bar that queues before seven. Every lot is cupped twice before it ships, and the roast date goes on the bag where the slogan usually sits.',
  contactLine: '14 Millstone Lane, river quarter',
  hoursLine: 'Tue–Sun 7:00–15:00 · roastery tours Saturdays',
  heroKickers: ['Roasted this week', 'From the cupping table', 'Single origins, short queues', 'Fresh off the drum roaster'],
  taglineImagery: [
    'small-batch roasts with the date on the bag',
    'espresso pulled with intent',
    'the first pour-over of the morning',
    'coffee that tastes like where it grew',
    'a glossy shot of crema',
    'beans still warm from the drum',
    'brews worth slowing down for',
    'your corner café, taken seriously',
  ],
  taglinePromises: [
    'roasted closer than you think',
    'ground for how you actually brew',
    'delivered within days of the roast',
    'strong enough to skip the second cup',
    'sourced from fourteen farms we can name',
    'dialed in one variable at a time',
  ],
  faq: [
    { q: 'How fresh is the coffee when it ships?', a: 'Every bag leaves within 48 hours of the roast, with the roast date printed on the label. Anything that sits longer than a week goes to the staff shelf, not the post.' },
    { q: 'Do you grind to order?', a: 'Whole bean by default — or tell us your brewer and we match the grind. Espresso, moka, filter and press are all on the list.' },
    { q: 'How does the subscription work?', a: 'Pick a bag size and a rhythm; most people settle on 250 g every second Friday. Pause, swap origins or move the date any time with one click.' },
    { q: 'Can I visit the roastery?', a: 'Saturday tours run at ten and end with a cupping. It is free, it is loud, and you will leave smelling like coffee.' },
  ],
  testimonials: [
    { quote: 'We put the {name} house blend on our own bar and guests started asking what changed. Shot timing is consistent bag after bag.', by: 'Café manager' },
    { quote: 'The crema on their espresso lot is glossy enough to be smug about. {name} cups everything twice and you can taste the second pass.', by: 'Head roaster' },
    { quote: 'I have bought from a dozen roasters and {name} is the only one whose roast date I stopped checking — it is always this week.', by: 'Green-bean buyer' },
    { quote: 'My pour-over went from routine to the best ten minutes of the day. {name} even wrote the ratio on the bag for my grinder.', by: 'Weekend regular' },
  ],
};

const FOOD_BAKERY: TopicVoice = {
  nameNouns: ['Crumb', 'Loaf', 'Prove', 'Rye', 'Flour', 'Hearth'],
  products: [
    { name: 'Sourdough country loaf', price: 8, category: 'Bakery' },
    { name: 'Cinnamon morning buns (4)', price: 12, category: 'Bakery' },
    { name: 'Seasonal fruit galette', price: 22, category: 'Bakery' },
    { name: 'Rye sandwich loaf', price: 9, category: 'Bakery' },
    { name: 'Almond croissant', price: 5.5, category: 'Bakery' },
  ],
  posts: [
    { title: 'Why our croissants take three days', excerpt: 'Lamination cannot be rushed. A walk through the folds, the rests, and the butter that makes the difference.' },
    { title: 'Feeding a sourdough starter that survives weekends', excerpt: 'A schedule for bakers with lives. Your starter can wait — here is how to let it.' },
  ],
  galleryProjects: ['Pastry case, Saturday 7am', 'The lamination room', 'Bread for the winter fair'],
  personas: [
    { name: 'Ben Castellano', role: 'Pastry chef' },
    { name: 'Rosa Lindqvist', role: 'Head baker' },
    { name: 'Amos Berger', role: 'Mill partner' },
  ],
  stats: [
    { value: '5:45', label: 'first loaves out of the oven' },
    { value: '400', label: 'loaves out the door on Saturdays' },
    { value: '3 days', label: 'for every single croissant' },
  ],
  featureIdeas: [
    { title: 'Up before dawn', text: 'The ovens light at four so the case is full by seven. Whatever is left at closing rides the shelter van, never the bin.' },
    { title: 'Real sourdough', text: 'Every loaf rises on a starter older than the shop, over a slow two-day prove. No commercial yeast, no shortcuts, no apologies.' },
    { title: 'Pre-order the weekend', text: 'Reserve loaves and pastries by Thursday night and skip the Saturday queue. Your name goes on the bag and the bag goes behind the counter.' },
    { title: 'Milled in-house', text: 'Heritage grain is milled the day before it is baked, one sack at a time. Flavor peaks inside a week, so the schedule bends around the mill.' },
  ],
  logoNames: ['The Crumb Report', 'Field & Flour', 'Prove & Press'],
  longAbout:
    'The bakehouse runs on a three-day rhythm: mill, prove, bake. Eleven people share one oven schedule taped to the wall, and the sourdough starter — Gertrude — is older than the business and treated accordingly.',
  contactLine: '2 Ovenhouse Row, off the market square',
  hoursLine: 'Wed–Sun from 6:30 · sold out means sold out',
  heroKickers: ['From the bakehouse', 'Out of the oven at 5:45', 'Real bread, slow proved', 'The pastry case is full'],
  taglineImagery: [
    'bread with a real crust',
    'a crumb worth tearing slowly',
    'sourdough on a three-day clock',
    'the pastry case at seven sharp',
    'loaves with heritage grain in them',
    'butter folded until it laminates',
    'the bakehouse before sunrise',
    'croissants that shatter properly',
  ],
  taglinePromises: [
    'baked before the city wakes',
    'proved slow, sold warm',
    'milled in-house the day before',
    'gone by noon most Saturdays',
    'made with flour you can trace',
    'worth the early alarm',
  ],
  faq: [
    { q: 'When is the bread ready?', a: 'The first loaves land at 5:45 and the full case is stocked by seven. Baguettes come out again at noon — locals set alarms.' },
    { q: 'Do you take pre-orders?', a: 'Order by Thursday night for weekend pickup and your bag waits behind the counter. Whole-loaf orders for cafés close on Wednesdays.' },
    { q: 'Is everything really sourdough?', a: 'The breads, yes — every loaf rises on our own starter over two days. The laminated pastries use butter and patience instead.' },
    { q: 'What happens to unsold bread?', a: 'The shelter van collects whatever is left at closing, every single day. Day-old loaves also become tomorrow’s crackers and croutons.' },
  ],
  testimonials: [
    { quote: 'The crust on the {name} country loaf crackles as it cools — my kitchen sounds like rain at noon.', by: 'Head baker' },
    { quote: '{name} laminates like a watchmaker. Twenty-seven layers, and on a good morning you can count them.', by: 'Pastry chef' },
    { quote: 'Their rye took our flour and made it sing. {name} schedules the bake around mill day, which nobody else bothers to do.', by: 'Mill partner' },
    { quote: 'I build my Saturdays around the seven o’clock pastry case. {name} sells out by noon and honestly it deserves to.', by: 'Weekend regular' },
  ],
};

const FOOD_RESTAURANT: TopicVoice = {
  nameNouns: ['Table', 'Hearth', 'Skillet', 'Harvest', 'Plate', 'Fig'],
  products: [
    { name: 'Chef’s tasting voucher (2)', price: 120, category: 'Dining' },
    { name: 'House chili oil', price: 12, category: 'Pantry' },
    { name: 'Sunday supper kit (serves 4)', price: 58, category: 'Kits' },
    { name: 'The house cookbook', price: 35, category: 'Books' },
    { name: 'Linen kitchen apron', price: 42, category: 'Goods' },
  ],
  posts: [
    { title: 'Winter menu preview: five dishes we kept tasting', excerpt: 'Braises, brown butter and one surprising citrus dessert. What is landing on the chalkboard next month.' },
    { title: 'A night on the pass, hour by hour', excerpt: 'Thirty-two seats, ninety minutes of fire. What service actually looks like from the kitchen side.' },
  ],
  galleryProjects: ['Harvest dinner series', 'The open kitchen rebuild', 'Sunday supper club'],
  personas: [
    { name: 'Elio Moretti', role: 'Head chef' },
    { name: 'Colette Marchand', role: 'Front of house' },
    { name: 'Nadia Boulos', role: 'Sommelier' },
  ],
  stats: [
    { value: '32', label: 'seats, plus six at the counter' },
    { value: '5', label: 'courses on the tasting' },
    { value: '9', label: 'growers named on the menu' },
  ],
  featureIdeas: [
    { title: 'Seasonal menu', text: 'The chalkboard changes with the market — what is good now is what we serve. Last month that meant rhubarb; this month it is blood orange.' },
    { title: 'Chef’s counter', text: 'Six seats face the pass, close enough to hear the pans. The chef narrates when asked and stays quiet when not.' },
    { title: 'Private dining', text: 'The back room seats fourteen under the wine wall, with its own shortened menu. One booking a night, never two.' },
    { title: 'Named growers', text: 'Every menu lists the nine farms behind it, down to the butter. When a supplier changes, the menu says so in print.' },
  ],
  logoNames: ['The Standing Table', 'Course Notes', 'Supper Review'],
  longAbout:
    'The dining room seats thirty-two and the kitchen refuses to whisper — the pass is open, the menu is rewritten each morning, and the nine growers who feed the room are printed on it by name. Service runs long on purpose.',
  contactLine: '31 Garland Street, corner of the arcade',
  hoursLine: 'Dinner Wed–Sun from 18:00 · walk-ins at the counter',
  heroKickers: ['Tonight at the pass', 'The menu changed this morning', 'Thirty-two seats, one kitchen', 'Now taking spring bookings'],
  taglineImagery: [
    'a table you will want to keep',
    'plates that follow the market',
    'dinner cooked within earshot',
    'a menu written that morning',
    'the kitchen at full song',
    'suppers that run long',
    'five courses, no ceremony',
    'the chef’s counter on a Tuesday',
  ],
  taglinePromises: [
    'seasonal down to the garnish',
    'served without white tablecloths',
    'cooked for the people in the room',
    'sourced from nine named farms',
    'open late enough to matter',
    'worth crossing the river for',
  ],
  faq: [
    { q: 'Do I need a reservation?', a: 'Weekends, yes — the book opens thirty days out and fills fast. Six counter seats are held for walk-ins every night.' },
    { q: 'Can the tasting flex for dietary needs?', a: 'Tell us when you book and the kitchen rewrites your courses, not just one of them. Vegetarian and gluten-free versions exist as full menus of their own.' },
    { q: 'Where does the food come from?', a: 'Nine growers, all named in print on the menu, most within an hour’s drive. When a supplier changes, the menu says so.' },
    { q: 'Is the counter different from the dining room?', a: 'Same courses, better view — you face the pass and can hear the pans. The chef narrates when asked and stays quiet when not.' },
  ],
  testimonials: [
    { quote: 'On my night off, {name} is where I eat. The pass runs quieter than mine and the plates land exactly when they should.', by: 'Head chef' },
    { quote: 'The menu changed between my two visits and both times it read like the market that morning. {name} cooks the season, not the greatest hits.', by: 'Weekend regular' },
    { quote: 'We sat at the {name} counter and watched five courses come together like choreography. Nobody raised their voice once.', by: 'Market neighbor' },
    { quote: 'The pairing at {name} was obscure and exactly right, twice in one dinner. That does not happen by accident.', by: 'Sommelier' },
  ],
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
    { title: 'Potted and ready', text: 'Every plant arrives in its forever pot with the right mix already in it. No repot shock, no bag of soil left on your doorstep.' },
    { title: 'Care cards included', text: 'Light, water and feeding notes written for your plant, not the species average. Each card is keyed to the exact pot size it ships in.' },
    { title: 'Local delivery', text: 'Hand-delivered in the van, never boxed and shipped upside down. Same-week slots across the city, evenings included.' },
    { title: 'Plant rehab clinic', text: 'Bring us the struggling one and we will diagnose, treat and send it home stronger. Most patients are back on the windowsill inside three weeks.' },
    { title: '30-day leaf guarantee', text: 'If it sulks in its first month, we replace it — no questions, no receipts. Barely one plant in fifty ever comes back.' },
    { title: 'Seasonal drops', text: 'Small batches of rare finds announced to the list first. The last variegated drop sold out in forty minutes.' },
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
  logoNames: ['Leaf & Loam', 'The Potting Post', 'Verdant Weekly', 'Greenhouse Review', 'Root Collective', 'Urban Canopy'],
  longAbout:
    'The greenhouse began with forty cuttings on a fire-escape shelf and now holds more than three hundred species under one glass roof. We propagate nearly everything ourselves, pot in our own chunky mix, and keep a rehab bench for the plants people bring in half-loved.',
  contactLine: '3 Glasshouse Row, by the canal',
  hoursLine: 'Wed–Sun 9:00–18:00 · repotting bar on weekends',
  heroKickers: ['Fresh from the greenhouse', 'New cuttings weekly', 'Grown here, not shipped', 'For brighter corners', 'Rooted locally'],
  taglineImagery: ['unruly shelves of green', 'a jungle for small rooms', 'leaves in every window', 'slow-growing good things', 'the greenhouse at golden hour', 'plants with histories', 'cuttings rooted on the sill', 'a calmer kind of collecting'],
  taglinePromises: ['grown with patience', 'happy in real apartments', 'delivered still humid from the glasshouse', 'hardier than they look', 'sold with honest care notes', 'ready to outlive the furniture'],
  faq: [
    { q: 'How do plants survive delivery?', a: 'They ride in the van, upright, hand-delivered — never boxed and couriered. If a leaf so much as creases in transit, we replace the plant.' },
    { q: 'I kill everything. Where do I start?', a: 'A pothos or a snake plant, honestly. Both forgive missed waterings, and the care card that comes in the pot is written for your light, not the species average.' },
    { q: 'How often should I actually water?', a: 'When the top few centimeters of soil are dry, not on a calendar. Push a finger in; the plant will not mind.' },
    { q: 'Do you repot plants I already own?', a: 'Bring it to the weekend repotting bar with any pot you like. We supply the chunky mix, the mess stays here.' },
    { q: 'What if my plant starts struggling?', a: 'Bring it to the rehab bench and we will diagnose it, usually on the spot. Most patients are back on their windowsill inside three weeks.' },
    { q: 'Are any of your plants pet-safe?', a: 'Plenty — calatheas, ferns and most palms among them. Every price tag carries a paw mark when the plant is safe for cats and dogs.' },
  ],
  testimonials: [
    { quote: 'The monstera I bought from {name} has thrown eleven new leaves in a year. The care card told me exactly which window it wanted.', by: 'Plant stylist' },
    { quote: '{name} potted everything in their chunky mix before delivery — no repot shock, no bag of soil in my hallway.', by: 'Landscape designer' },
    { quote: 'I brought in a half-dead calathea and the rehab bench sent it home thriving. {name} genuinely will not let a plant die of embarrassment.', by: 'Botanist' },
    { quote: 'Our office jungle came from {name}, delivered up three flights and styled on the spot. A year on, every single plant is alive.', by: 'Greenhouse manager' },
    { quote: 'The propagation workshop paid for itself in a month — my windowsill is a nursery now. {name} teaches the unglamorous parts too.', by: 'Nursery owner' },
    { quote: 'Their cuttings root faster than anything I have bought elsewhere. {name} ships them still humid from the glasshouse.', by: 'Plant stylist' },
  ],
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
    { title: 'Instant deploys', text: 'Push to main and watch it go live — previews for every branch, rollbacks in one click. Median build-to-live time is forty seconds.' },
    { title: 'Realtime metrics', text: 'Latency, errors and throughput on one screen, streamed as they happen. P50 and P99 sit side by side so regressions cannot hide.' },
    { title: 'Role-based access', text: 'Fine-grained permissions your security team will actually sign off on. Scope by project, environment or a single API key.' },
    { title: 'API-first', text: 'Everything the UI does, the API does too — documented, versioned, stable. Breaking changes get a twelve-month deprecation window.' },
    { title: 'Audit logs', text: 'Every change, by whom, from where — exportable and tamper-evident. Retention runs two full years on every plan.' },
    { title: 'SOC 2 ready', text: 'Compliance evidence collected as you work, not scrambled for at renewal. Auditors get a read-only portal instead of a zip file.' },
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
  logoNames: ['Fielder', 'Northbeam Labs', 'Relay & Co', 'Kitegrid', 'Standard Query', 'Opsline'],
  longAbout:
    'We started as three engineers tired of gluing the same five tools together at every job. Today the platform runs deploys, metrics and access control for more than two thousand teams — still built by people who carry the pager for their own code.',
  contactLine: 'Suite 400, 88 Foundry Street',
  hoursLine: 'Support around the clock · office hours Thursdays',
  heroKickers: ['Now in public beta', 'Built for shipping teams', 'From commit to customer', 'Trusted in production', 'Less setup, more shipping'],
  taglineImagery: ['the boring parts of shipping', 'deploys, metrics and access', 'your whole release path', 'infrastructure that behaves', 'the glue work', 'production at 2 a.m.', 'the pager that stays quiet', 'release day without the ritual'],
  taglinePromises: ['automated past the point of worry', 'handled before the standup', 'quiet enough to forget', 'wired together properly', 'shipped without the ceremony', 'boring in the best possible way'],
  faq: [
    { q: 'How does rollback work?', a: 'Every deploy keeps the previous build warm, so rollback is one click and about four seconds. The audit log records who rolled what, and why if they tell it.' },
    { q: 'Can we self-host?', a: 'Yes — the same binary we run, licensed per cluster, updated on your schedule. Air-gapped installs get a signed offline bundle.' },
    { q: 'What happens when you have an outage?', a: 'The status page updates within minutes, written by an engineer rather than a lawyer. Post-incident reviews are published in full, including the embarrassing parts.' },
    { q: 'How granular are permissions?', a: 'Down to a single environment or API key, grouped into roles your security team can actually review. Access changes land in the audit log as they happen.' },
    { q: 'Do you throttle API usage?', a: 'Limits are generous and published, with headers that tell you where you stand. Hit one and you get a 429 with honest Retry-After, never a silent drop.' },
    { q: 'How do we get our data out?', a: 'A documented export API and a one-click archive of everything you have ever stored, in open formats. Leaving should be easy — that is the point of staying.' },
  ],
  testimonials: [
    { quote: 'We cut our deploy script from 400 lines to a webhook. {name} made Friday releases something we stopped scheduling meetings about.', by: 'Staff engineer' },
    { quote: 'The P99 graph in {name} caught a regression our own dashboards missed for a week. It paid for the year in one afternoon.', by: 'SRE lead' },
    { quote: 'Our audit prep went from a quarter of scrambling to a read-only link. {name} collects the evidence while we ship.', by: 'CTO, Fielder' },
    { quote: 'I rolled back a bad canary from my phone, on a train. {name} treats rollback as a feature and it shows.', by: 'Staff engineer' },
    { quote: 'The API does everything the UI does, documented and versioned. We built our whole internal portal on {name} without one support ticket.', by: 'Developer advocate' },
    { quote: 'Onboarding a new service takes minutes, and the defaults are the ones we would have picked anyway. {name} feels engineered, not marketed.', by: 'Product manager' },
  ],
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
    { name: 'Tom Keller', role: 'Physiotherapist' },
    { name: 'Grace Lin', role: 'Nutrition coach' },
  ],
  stats: [
    { value: '1,150', label: 'workouts logged this week' },
    { value: '87%', label: 'members hitting weekly goals' },
  ],
  featureIdeas: [
    { title: 'Community challenges', text: 'Monthly team goals that make showing up the easy choice. Last month, 87 members logged 1,900 workouts between them.' },
    { title: 'Recovery tracking', text: 'Sleep, soreness and readiness — so hard days land on the right days. A red morning automatically softens the evening session.' },
    { title: 'Nutrition templates', text: 'Plate-method meal guides that survive real kitchens and real schedules. Each one builds from ten pantry staples, not thirty.' },
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
  logoNames: ['Stride Journal', 'The Rack Room', 'Tempo Club', 'Ironline', 'Coach Weekly', 'Trailhead Co'],
  longAbout:
    'It started as six people training in a rented unit with a stubborn belief that consistency beats intensity. Years on, the membership has grown but the idea has not: honest movement, unhurried progress and a community that notices when you skip a week.',
  contactLine: 'Unit 2, 41 Foundry Yard',
  hoursLine: 'Mon–Fri 6:00–21:00 · weekends 8:00–14:00',
  heroKickers: ['All levels, honestly', 'Earn the rest day', 'Show up, we handle the rest', 'Start where you are'],
  taglineImagery: ['small weekly wins', 'the long game', 'training you can keep', 'movement that fits your day', 'habits that hold', 'progress you can feel'],
  taglinePromises: ['built around your week', 'without the mirror culture', 'kinder than it sounds', 'consistent beats heroic', 'made for actual schedules', 'harder to quit than to keep'],
  faq: [
    { q: 'I have not trained in years. Will I keep up?', a: 'Yes — every session scales to the person doing it, and half our members started from a long break. The first two weeks are deliberately gentle.' },
    { q: 'What should I bring to my first session?', a: 'Water, flat shoes and clothes you can move in. Everything else is here, including the nerve — arrive ten minutes early and someone will show you around.' },
    { q: 'Can I pause my membership?', a: 'Any time, from the app, for up to three months a year. Injuries and new babies get longer, no questions asked.' },
  ],
  testimonials: [
    { quote: 'As a physio, I send patients to {name} because the progressions are honest. Nobody gets rushed back into anything.', by: 'Physiotherapist' },
    { quote: 'The nutrition templates from {name} survived a house move and a toddler. Ten pantry staples, zero heroics — that is why they work.', by: 'Nutrition coach' },
  ],
};

/* --------------------------- fitness voices ------------------------ */

const FITNESS_GYM: TopicVoice = {
  nameNouns: ['Rep', 'Forge', 'Iron', 'Rack', 'Circuit', 'Form'],
  personas: [
    { name: 'Dana Reyes', role: 'Strength coach' },
    { name: 'Bo Jensen', role: 'Six a.m. regular' },
    { name: 'Lena Brooks', role: 'Founding member' },
  ],
  stats: [
    { value: '312', label: 'personal records this month' },
    { value: '24', label: 'classes on the timetable' },
    { value: '4', label: 'coaches on the floor' },
  ],
  featureIdeas: [
    { title: 'Coach-built programs', text: 'Every block written by a human coach, adjusted to your equipment and week. Swap a barbell day for dumbbells and the volume rebalances itself.' },
    { title: 'Progress you can see', text: 'PRs, photos and volume charts that make slow progress visible. Most members add a plate to their squat inside two blocks.' },
    { title: 'Form check videos', text: 'Upload a set and get frame-by-frame feedback from a coach within a day. Average turnaround is under five hours.' },
  ],
  longAbout:
    'The gym opened with one squat rack, a rowing machine and a stubborn belief that coaching beats equipment. Six years on there are four coaches, a hundred-odd members and a whiteboard of personal records that gets photographed more than the skyline.',
  heroKickers: ['New block starts Monday', 'Coached, not templated', 'Strong is a habit', 'Chalk up, clock in'],
  taglineImagery: [
    'the last two reps',
    'a barbell that levels with you',
    'strength built in honest blocks',
    'the squat rack at six a.m.',
    'kettlebells and chalk dust',
    'weights that add up quietly',
    'deadlifts done properly',
    'a coach who knows your name',
  ],
  taglinePromises: [
    'programmed rep by honest rep',
    'heavier by small increments',
    'stronger by Friday',
    'spotted from day one',
    'no ego on the floor',
    'measured in personal records',
  ],
  faq: [
    { q: 'Do I need to know my way around a barbell?', a: 'No — your first three sessions are technique work with a coach, empty bar, zero audience. You load weight when your form says so, not the calendar.' },
    { q: 'Is coaching included or extra?', a: 'Included. Every class has a coach on the floor and every member gets a written block, reviewed monthly.' },
    { q: 'How busy does the floor get?', a: 'We cap every class at twelve, so there is always a free rack. The quiet gold is 13:00 to 16:00, if your day allows it.' },
  ],
  testimonials: [
    { quote: 'I added forty kilos to my deadlift in a year at {name} and nobody ever made it weird. The coaching is relentless in the kindest way.', by: 'Founding member' },
    { quote: 'The six a.m. crew at {name} is the reason I still train. Someone notices if your bar is missing.', by: 'Six a.m. regular' },
    { quote: 'I filmed one ugly squat and had frame-by-frame notes from {name} before lunch. That single fix outlasted every program I bought online.', by: 'Strength coach' },
  ],
};

const FITNESS_YOGA: TopicVoice = {
  nameNouns: ['Asana', 'Breath', 'Mat', 'Stillness', 'Lotus', 'Root'],
  personas: [
    { name: 'Aisha Bello', role: 'Yoga instructor' },
    { name: 'Ines Duarte', role: 'Breathwork teacher' },
    { name: 'Wren Kapoor', role: 'Studio member' },
  ],
  stats: [
    { value: '18', label: 'classes a week, two candlelit' },
    { value: '8', label: 'mats max per class' },
    { value: '96%', label: 'students back for a second class' },
  ],
  featureIdeas: [
    { title: 'Small classes', text: 'Eight mats, never more, so the teacher sees every shoulder. Adjustments are offered, asked for and never assumed.' },
    { title: 'Breath-first teaching', text: 'Every sequence is built on the breath count, not the clock. If the room is breathing fast, the flow slows down.' },
    { title: 'Beginner series', text: 'A standing four-week on-ramp that starts from zero, twice a season. You learn the vocabulary before anyone says vinyasa at speed.' },
  ],
  longAbout:
    'The studio holds eight mats, a shelf of blankets and no mirrors on purpose. Classes are built on breath counts rather than choreography, and the teachers still take each other’s classes every week.',
  heroKickers: ['The mat is waiting', 'Breathe first', 'Small classes, soft light', 'Beginners welcome, always'],
  taglineImagery: [
    'an hour on the mat',
    'breath before ambition',
    'flows that meet you where you are',
    'savasana worth staying for',
    'yoga without the performance',
    'a slow vinyasa at sunrise',
    'the quiet end of the mat',
    'stretching that undoes the desk',
  ],
  taglinePromises: [
    'led by breath, not playlists',
    'taught for real bodies',
    'softer than it sounds, stronger than it looks',
    'candlelit on Thursday nights',
    'beginner-proof by design',
    'calmer by the second class',
  ],
  faq: [
    { q: 'Do I need to bring a mat?', a: 'Bring yours if you love it; otherwise studio mats, blocks and blankets are included and cleaned between every class. Bare feet and loose clothes are the whole kit.' },
    { q: 'Which class should I start with?', a: 'Slow Flow or the beginner series — both assume nothing. Tell the teacher it is your first visit and they will keep an eye without hovering.' },
    { q: 'I cannot touch my toes. Is that a problem?', a: 'It is the least interesting fact about you, and half the room is the same. Flexibility is a side effect here, never an entry requirement.' },
  ],
  testimonials: [
    { quote: 'I came to {name} for my back and stayed for the breathing. It is the only hour of my week without a screen in it.', by: 'Studio member' },
    { quote: 'Eight mats means the teacher actually sees you. {name} corrected a habit in my practice that a decade of videos never caught.', by: 'Breathwork teacher' },
    { quote: 'The beginner series at {name} is the kindest on-ramp I have taught anywhere. People arrive terrified and leave with a practice.', by: 'Yoga instructor' },
  ],
};

const FITNESS_RUN: TopicVoice = {
  nameNouns: ['Stride', 'Tempo', 'Pace', 'Split', 'Trail', 'Mile'],
  personas: [
    { name: 'Mike O’Brien', role: 'Running coach' },
    { name: 'Sol Andersen', role: 'Marathon finisher' },
    { name: 'Ren Takahashi', role: 'Trail captain' },
  ],
  stats: [
    { value: '5', label: 'pace groups every Tuesday' },
    { value: '1,800', label: 'kilometers logged last season' },
    { value: '61', label: 'first-time finishers this year' },
  ],
  featureIdeas: [
    { title: 'Pace groups for every speed', text: 'Five groups from walk-run to sub-forty, each with a leader who holds the pace so you do not have to think. Nobody runs alone and nobody gets dropped.' },
    { title: 'The route library', text: 'Forty measured routes with surface notes, sunrise ratings and where the water fountains actually work. Every route was run by a leader within the month.' },
    { title: 'Race-day rehearsals', text: 'Six weeks out we rehearse the whole morning — fueling, pacing, even the queue for the portaloos. Race day should be the second time you do everything.' },
  ],
  longAbout:
    'The club began as four people meeting under the bridge on Tuesdays, rain included. Now five pace groups leave from the same spot, and the only rule has never changed: start together, finish together, brag modestly.',
  heroKickers: ['Lace up, log miles', 'The long run starts here', 'Every pace has a group', 'Race season is coming'],
  taglineImagery: [
    'the long run on Sunday',
    'miles that stack up quietly',
    'a pace you can hold',
    'trail dust and negative splits',
    'intervals with a finish line',
    'strides down the river path',
    'the 10k you keep chasing',
    'tempo days that earn easy ones',
  ],
  taglinePromises: [
    'run in groups of every speed',
    'built one easy mile at a time',
    'timed but never judged',
    'rain or shine, mostly rain',
    'paced by feel, proved by the watch',
    'from couch to start line',
  ],
  faq: [
    { q: 'What if I am the slowest one there?', a: 'Then you have a pace group and a leader whose whole job is you. Start together, finish together — it is the only club rule.' },
    { q: 'Do I need fancy gear?', a: 'Shoes with some life in them and clothes for the weather; the rest is marketing. When you are ready for a watch, borrow one from the club shelf first.' },
    { q: 'How long are the group runs?', a: 'Tuesdays are 5 to 8 km with intervals; Sundays stretch from 10 km to marathon pace work in season. Every distance has a shortcut home built in.' },
  ],
  testimonials: [
    { quote: 'I joined {name} unable to run to the corner and finished a marathon eighteen months later. The pace group never once left me behind.', by: 'Marathon finisher' },
    { quote: 'The Sunday long run with {name} is the best-planned two hours of my week. Water stops, surface notes, and someone always holds the pace.', by: 'Trail captain' },
    { quote: 'As a coach, what {name} gets right is patience — easy miles stay easy. That discipline is why their runners stay healthy.', by: 'Running coach' },
  ],
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
    { title: 'Made to last', text: 'Reinforced seams, natural fibers and construction meant for a decade of wear. Stress points are bar-tacked, never glued.' },
    { title: 'True-to-you sizing', text: 'Real measurements on every product page, taken from the actual garment. Pit to pit, sleeve and hem, down to the half centimeter.' },
    { title: 'Deadstock fabrics', text: 'Limited runs cut from rescued mill fabric — when it is gone, it is gone. The spring linen came off a roll woven in 1994.' },
    { title: 'Free alterations', text: 'First hem, nip or tuck on us at any of our studios. Most alterations are ready inside a week.' },
    { title: 'Repair for life', text: 'Send it back tired and we will mend it, forever, for free. The atelier repaired six hundred garments last year alone.' },
    { title: 'Small-batch drops', text: 'New pieces land monthly in numbers we can sew well. A typical run is sixty garments, numbered inside the collar.' },
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
  logoNames: ['Hemline Review', 'The Cutting Table', 'Cloth & Craft', 'Studio Notes', 'Warp Weekly', 'Atelier Index'],
  longAbout:
    'The studio cuts every pattern in-house and sews in runs small enough to check each seam by hand. Fabric comes from mill archives and deadstock rolls, which means a piece you buy here will quite literally never be reprinted.',
  contactLine: 'Atelier, 27 Ribbon Street, second floor',
  hoursLine: 'Fittings Tue–Sat 11:00–19:00 · by appointment',
  heroKickers: ['New drop: sixty pieces', 'Cut and sewn in-house', 'Deadstock, reborn', 'Fewer, better', 'The spring line is in'],
  taglineImagery: ['clothes with a spine', 'seams worth inspecting', 'a quieter wardrobe', 'fabric with a past life', 'pieces cut to be kept', 'the good linen', 'hems that fall exactly right', 'a numbered run of sixty'],
  taglinePromises: ['made well and worn often', 'sewn in runs of sixty', 'mended for life, free', 'sized to real bodies', 'built to outlast the trend cycle', 'finished by hand'],
  faq: [
    { q: 'How do I pick a size?', a: 'Every product page lists the garment’s real measurements — pit to pit, sleeve, hem — taken from the actual piece. Match them against something you own and love; it beats any letter on a label.' },
    { q: 'What is your returns window?', a: 'Thirty days, unworn, no interrogation — and the return label is in the parcel. Exchanges for another size jump the sewing queue.' },
    { q: 'What does “deadstock fabric” mean?', a: 'Cloth rescued from mill archives and cancelled orders — woven, paid for, then abandoned. When a roll runs out, that piece is never reprinted.' },
    { q: 'Do you really repair for life?', a: 'Send anything of ours back tired and the atelier mends it free, forever. Last year that was six hundred garments, including one jacket on its fourth zip.' },
    { q: 'How should I wash the linen?', a: 'Cold, gentle, line dry, and embrace the wrinkle — it is the fiber relaxing, not failing. An iron on damp linen works magic if you must.' },
    { q: 'Are alterations included?', a: 'Your first hem, nip or tuck is on us at any studio. Most alterations are ready inside a week, fitted by the people who cut the pattern.' },
  ],
  testimonials: [
    { quote: 'The {name} wrap dress is the only thing I own with real measurements on the page. It arrived fitting like the second fitting, not the first.', by: 'Stylist' },
    { quote: 'I sent a five-year-old jacket back and {name} rebuilt the cuffs for free. It came home better than I bought it.', by: 'Creative director' },
    { quote: 'You can read the construction from the inside — finished seams, bar-tacked stress points. {name} sews like someone will check.', by: 'Pattern maker' },
    { quote: 'The spring linen came off a 1994 roll and you can feel the difference. {name} treats fabric like the whole point, because it is.', by: 'Textile buyer' },
    { quote: 'Sixty pieces, numbered in the collar, gone in a week. My {name} coat is number eleven and I know its whole story.', by: 'Studio photographer' },
    { quote: 'Their denim broke in exactly the way the fit notes promised. {name} writes sizing copy like they expect to be quoted.', by: 'Stylist' },
  ],
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
    { title: 'All-day coverage', text: 'From getting ready to the last dance — no hourly clock-watching. A typical wedding gallery runs past six hundred finished frames.' },
    { title: 'Online proofing galleries', text: 'Private, password-protected galleries your family can actually use. Favorites sync straight into the print order.' },
    { title: 'Archival prints', text: 'Museum-grade paper and pigment inks rated for a century. Every print ships flat, signed and sleeved.' },
    { title: 'Fast turnaround', text: 'Sneak peeks in 48 hours, full galleries inside two weeks. The studio record is nine days for a fourteen-hour festival.' },
    { title: 'Second shooter included', text: 'Two angles on every moment that matters. While one lens holds the vows, the other watches the back row.' },
    { title: 'Print-release licensing', text: 'Your photos are yours — print them anywhere, forever. The release arrives with the gallery, written in plain language.' },
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
  logoNames: ['Aperture Daily', 'The Contact Sheet', 'Frame & Field', 'Darkroom Digest', 'Studio Light Co', 'Print Room Press'],
  longAbout:
    'The studio shoots portraits, weddings and the occasional harbor in fog, and prints nearly everything on paper heavy enough to feel. A quarter of a million frames sit in the archive, backed up twice and culled hard to the twelve that matter per job.',
  contactLine: 'Studio 5, 19 Salt Lane, harbor side',
  hoursLine: 'Sittings Wed–Sun · golden hour by booking',
  heroKickers: ['Now booking this season', 'Shot on real light', 'From the darkroom', 'Prints, not pixels', 'Twelve frames that matter'],
  taglineImagery: ['light doing its quiet work', 'the frames between poses', 'faces at ease', 'one honest window', 'moments at full resolution', 'the keeper frame', 'twelve frames that matter', 'portraits without the stiffness'],
  taglinePromises: ['caught and printed to last', 'kept beautifully', 'delivered inside two weeks', 'shot without the stiffness', 'framed like it happened', 'yours to print forever'],
  faq: [
    { q: 'How far ahead should we book?', a: 'Weddings run six to twelve months out — spring Saturdays go first. Portrait sittings can usually land within three weeks.' },
    { q: 'When do we see the photos?', a: 'A sneak peek of a dozen frames inside 48 hours, the full gallery within two weeks. The studio record is nine days for a fourteen-hour festival.' },
    { q: 'What does the print release cover?', a: 'Everything in your gallery, printable anywhere, forever — it arrives with the gallery in plain language. We only ask that publications credit the studio.' },
    { q: 'Do you travel for shoots?', a: 'Happily. Travel inside the region is included; farther afield we quote flights and a modest per diem, never a markup.' },
    { q: 'What if the weather turns?', a: 'We scout a covered fallback for every location in advance, and honestly, overcast light flatters faces. Rescheduling within the season is free.' },
    { q: 'Can we get the RAW files?', a: 'The gallery is the finished work, so no — but nothing meaningful is left out of it. A typical wedding delivers over six hundred edited frames.' },
  ],
  testimonials: [
    { quote: 'Our gallery from {name} arrived in nine days and made my mother cry twice. The frames between the poses are the ones we printed.', by: 'Gallery curator' },
    { quote: '{name} posed people who hate posing — half the shots happened mid-laugh on a walk. Nobody looks stiff in six hundred frames.', by: 'Photo editor' },
    { quote: 'The A2 print above our mantel is from a single window and no strobes. {name} does more with one pane of glass than most do with a truck of gear.', by: 'Portrait photographer' },
    { quote: 'They scanned forty years of family negatives, dust and all, and backed them up twice. {name} treats an archive like it matters.', by: 'Retoucher' },
    { quote: 'The second shooter caught the back row wiping tears while the vows were shot from the front. With {name} nothing important escapes.', by: 'Studio assistant' },
    { quote: 'Print release in plain language, favorites synced to the print order — {name} makes the after-part effortless too.', by: 'Gallery curator' },
  ],
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
    { title: 'Locals-first itineraries', text: 'Routes built by people who live there, not by an algorithm scraping reviews. Every stop was walked by a guide within the last year.' },
    { title: 'Small groups only', text: 'Never more than eight travelers — the whole point is to fit in the taxi. Most departures run at six.' },
    { title: 'Flexible rebooking', text: 'Plans change, so move any trip up to a week before departure, free. It takes one email, not a phone queue.' },
    { title: 'Offline everything', text: 'Maps, tickets and phrase sheets that work in airplane mode. A full city pack downloads in under 40 MB.' },
    { title: 'Carbon-aware routing', text: 'Trains over flights where the map allows, with honest trade-off notes. Lisbon to Madrid reads "nine hours, one long lunch."' },
    { title: '24/7 trip support', text: 'A human on the line in your time zone, not a chatbot in ours. Median overnight answer time is four minutes.' },
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
  logoNames: ['Waypoint Journal', 'The Slow Route', 'Meridian Post', 'Field Atlas', 'Departures Desk', 'Harbor & Rail'],
  longAbout:
    'We plan trips the way locals give directions — by café, corner and shortcut, not by star rating. Every itinerary is walked by a guide before it is sold, which is why the destination list grows slowly and the repeat-traveler list does not.',
  contactLine: '2nd floor, 8 Meridian Arcade',
  hoursLine: 'Trip desk Mon–Fri 9:00–18:00 · on call while you travel',
  heroKickers: ['Shoulder season is here', 'Walked before sold', 'Eight seats, no more', 'Pack lighter, go further', 'New routes for spring'],
  taglineImagery: ['night trains and slow mornings', 'the streets past the landmarks', 'two weeks, one bag', 'places locals point to', 'the long way round', 'maps with margin notes', 'shoulder season, every season', 'breakfast in a new alphabet'],
  taglinePromises: ['routed by people who live there', 'worth the jet lag', 'planned down to the café', 'booked without the hold music', 'paced for actual humans', 'guided in groups of eight'],
  faq: [
    { q: 'How big are the groups?', a: 'Never more than eight travelers — the whole point is to fit in one taxi. Most departures run at six.' },
    { q: 'Can I change my dates after booking?', a: 'Move any trip up to a week before departure, free, with one email. No phone queue, no change-fee roulette.' },
    { q: 'How much walking should I expect?', a: 'Most days cover six to ten relaxed kilometers with long café stops built in. Every itinerary marks the two genuinely steep days in advance.' },
    { q: 'Do the itineraries work offline?', a: 'Maps, tickets and phrase sheets all work in airplane mode; a full city pack downloads in under 40 MB. Wi-Fi is a bonus, never a dependency.' },
    { q: 'Is the trip guided the whole time?', a: 'Mornings are guided by someone who lives there; afternoons are yours, with a shortlist locals actually use. Support stays on call around the clock either way.' },
    { q: 'What about trains versus flights?', a: 'Where the map allows, we route by rail and say so honestly — Lisbon to Madrid reads "nine hours, one long lunch." Carbon notes appear next to every leg.' },
  ],
  testimonials: [
    { quote: 'Our {name} guide walked us past the queue and into a courtyard lunch no app knows about. Eight of us, one long table.', by: 'Travel writer' },
    { quote: 'The offline pack from {name} saved the whole Kyoto day when my roaming died. Tickets, maps, phrases — all still there.', by: 'Expedition lead' },
    { quote: 'I moved the departure twice — new baby — and {name} rebooked everything with one email. No hold music, no penalty.', by: 'Concierge' },
    { quote: 'The night-train leg read "fall asleep in one country, wake in another" and it delivered exactly that. {name} plans in sentences, not spreadsheets.', by: 'Trip designer' },
    { quote: 'Every stop on the Oaxaca route had been walked by our guide within the year — you could taste the difference. {name} sells nothing it has not eaten.', by: 'Local guide' },
    { quote: 'Six travelers, shoulder season, half the crowds and softer light. {name} talked us out of July and we owe them for it.', by: 'Travel writer' },
  ],
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
    { name: 'Priya Raman', role: 'Longtime fan' },
    { name: 'Cal Whitmore', role: 'Record shop owner' },
  ],
  stats: [
    { value: '1.2M', label: 'streams this year' },
    { value: '6', label: 'releases in the catalog' },
  ],
  featureIdeas: [
    { title: 'Lossless downloads', text: 'Every release in full resolution, yours to keep offline. The 24-bit files land the same day as streaming.' },
    { title: 'Behind-the-scenes feed', text: 'Demos, voice memos and honest arguments, unfiltered. The chorus of the new single first appeared here as a forty-second phone clip.' },
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
  logoNames: ['The Owl Room', 'Backline Weekly', 'Analog Heart', 'Pressing Matters', 'Soundcheck Post', 'Night Signal'],
  longAbout:
    'The catalog grew sideways — one release at a time, each made the stubborn way and paid for by the last. Everything comes from the same small crew and goes out when it is ready, not when the quarter ends.',
  contactLine: '12 Vine Alley, above the print shop',
  hoursLine: 'Doors usually 20:00 · mail answered by noon',
  heroKickers: ['New this season', 'Made loud, made honest', 'For headphones and kitchens', 'The next one is coming'],
  taglineImagery: ['three chords and intent', 'music you can stand next to', 'tape hiss and all', 'songs that survive the kitchen speaker', 'a catalog with no filler', 'the good kind of loud'],
  taglinePromises: ['recorded honest', 'kept analog on purpose', 'made for repeat listens', 'louder than the algorithm', 'released when it is ready', 'worth owning twice'],
  faq: [
    { q: 'Where can I buy the music directly?', a: 'The web store, where the money actually reaches the people who made it. Physical orders ship Mondays and Thursdays, wrapped by hand.' },
    { q: 'Can I use a track in my film or ad?', a: 'Write to us with the scene and the budget — licensing answers usually go out inside a week. Student films get a soft rate, always.' },
    { q: 'How do I best support the project?', a: 'Buy direct, come to things, tell one friend. That chain still outperforms every algorithm we have met.' },
  ],
  testimonials: [
    { quote: 'I stock everything {name} puts out and it never sits long. People come in asking for it by name.', by: 'Record shop owner' },
    { quote: 'Been following {name} since the first release and the quality bar has never dipped. They put it out when it is ready and you can hear that.', by: 'Longtime fan' },
  ],
};

/* ---------------------------- music voices ------------------------- */

const MUSIC_PODCAST: TopicVoice = {
  nameNouns: ['Signal', 'Episode', 'Airwave', 'Rewind', 'Transcript', 'Frequency'],
  personas: [
    { name: 'Ira Chen', role: 'Host' },
    { name: 'Bex Aluko', role: 'Audio editor' },
    { name: 'June Malek', role: 'Weekly listener' },
  ],
  stats: [
    { value: '120', label: 'episodes in the feed' },
    { value: '48k', label: 'listeners every week' },
    { value: '92%', label: 'average listen-through' },
  ],
  featureIdeas: [
    { title: 'Full transcripts', text: 'Every episode ships with a complete, searchable transcript the same day. Quote us accurately — we make it easy on purpose.' },
    { title: 'Listener mailbag', text: 'One episode a month is built from listener questions, credited by first name. The best question so far came from a nine-year-old.' },
    { title: 'Chaptered episodes', text: 'Skip straight to the segment you came for — every episode is chaptered by hand. The cold open is always worth it anyway.' },
  ],
  longAbout:
    'It started as two people and one microphone in a coat closet, published on a Tuesday because that felt polite. A hundred-plus episodes later the closet has better foam, the interviews run long on purpose, and every minute is still cut by hand.',
  heroKickers: ['New episode Tuesdays', 'Season three, now playing', 'Interviews, unhurried', 'For the long commute'],
  taglineImagery: [
    'conversations that outgrow the episode',
    'interviews past the press-tour answers',
    'two mics and no agenda',
    'episodes cut with care',
    'listeners who stay to the credits',
    'the question the host almost skipped',
    'a podcast that respects your commute',
    'voices close to the mic',
  ],
  taglinePromises: [
    'published every other Tuesday',
    'edited until it earns your hour',
    'transcribed in full, always',
    'no ads in the middle of a thought',
    'asked with genuine curiosity',
    'worth the whole commute',
  ],
  faq: [
    { q: 'How often do episodes come out?', a: 'Every other Tuesday, early enough for the morning commute. Seasons run ten episodes with a mailbag in the middle.' },
    { q: 'Do you publish transcripts?', a: 'Every episode, in full, the same day it airs — searchable and quotable. Corrections get footnoted rather than quietly patched.' },
    { q: 'Can I pitch a guest or a topic?', a: 'Please do — the mailbag address is read by the hosts, not an intern. Two of last season’s best episodes started as listener pitches.' },
  ],
  testimonials: [
    { quote: 'I plan my commute around {name}. The interviews go where the press tour never does, and the edit respects your time.', by: 'Weekly listener' },
    { quote: 'The transcripts alone put {name} ahead of shows twice its size. I have quoted episode forty in three different meetings.', by: 'Host' },
    { quote: 'You can hear the edit craft — no rambling middles, chapters where they should be. {name} cuts tape like it costs money.', by: 'Audio editor' },
  ],
};

const MUSIC_BAND: TopicVoice = {
  nameNouns: ['Chord', 'Reverb', 'Encore', 'Amplitude', 'Feedback', 'Anthem'],
  personas: [
    { name: 'Tasha Green', role: 'Vocalist' },
    { name: 'Mia Torres', role: 'Booking agent' },
    { name: 'Frankie Doyle', role: 'Venue owner' },
  ],
  stats: [
    { value: '120+', label: 'shows played' },
    { value: '9', label: 'cities on the tour' },
    { value: '300', label: 'vinyl copies, numbered by hand' },
  ],
  featureIdeas: [
    { title: 'Live session videos', text: 'One take, one room, no edits — the songs as they actually sound. Filmed on two cameras in the rehearsal space.' },
    { title: 'Early ticket access', text: 'Members hear about shows before the posters go up. The last two Owl Room dates sold out in the presale.' },
    { title: 'Vinyl-first releases', text: 'Pressings land two weeks before streaming, numbered and signed. The last run was three hundred copies on 180-gram black.' },
  ],
  longAbout:
    'Three EPs, one rented cabin and a tape machine that only mostly works — that is the discography so far. The songs get written in the rehearsal space above the print shop and road-tested on stage before anything is allowed near a studio.',
  contactLine: 'Bookings via the Owl Room, 12 Vine Alley',
  hoursLine: 'Rehearsals nightly · doors usually 20:00',
  heroKickers: ['New EP out now', 'On tour this spring', 'Pressed on vinyl first', 'From the rehearsal room'],
  taglineImagery: [
    'songs with the amps still warm',
    'riffs written upstairs',
    'the encore nobody planned',
    'vinyl pressed before it streams',
    'a setlist that risks something',
    'gigs close enough to feel',
    'the van, the stage, the song',
    'albums made the stubborn way',
  ],
  taglinePromises: [
    'played loud where it matters',
    'road-tested before it is released',
    'pressed in numbered runs',
    'written upstairs, tested downtown',
    'mixed for the back row',
    'louder in person',
  ],
  faq: [
    { q: 'When are you playing near me?', a: 'The tour page updates the moment a date is inked, members hear first. Nine cities this spring, two more pending a venue signature.' },
    { q: 'Is the vinyl still available?', a: 'The last pressing was three hundred numbered copies and it went in a weekend. A repress happens when two hundred names join the waitlist — it is at 161.' },
    { q: 'Can we book the band?', a: 'Through the Owl Room — festivals, basements and weddings with character all considered. Send a date and a room size; the rider is one page and mostly polite.' },
  ],
  testimonials: [
    { quote: '{name} sold out our room twice and the crowd sang the b-sides. Book them before their fee grows up.', by: 'Venue owner' },
    { quote: 'Number 114 of 300 sits on my shelf and the live set is somehow better. {name} in a small room is the whole argument for small rooms.', by: 'Longtime fan' },
    { quote: 'They road-test everything before it is recorded, and you can hear it — no studio polish hiding a weak chorus. {name} earns the encore.', by: 'Booking agent' },
  ],
};

const MUSIC_STUDIO: TopicVoice = {
  nameNouns: ['Analog', 'Console', 'Session', 'Octave', 'Preamp', 'Monitor'],
  personas: [
    { name: 'Remy Laurent', role: 'Producer' },
    { name: 'Gus Meyer', role: 'Sound engineer' },
    { name: 'Ada Winters', role: 'Session vocalist' },
  ],
  stats: [
    { value: '2', label: 'live rooms, one echo chamber' },
    { value: '48', label: 'channels on the analog desk' },
    { value: '9 days', label: 'median record turnaround' },
  ],
  featureIdeas: [
    { title: 'Treated rooms', text: 'Two live rooms tuned by ear and by math, plus a stairwell echo chamber we will not apologize for. Drums breathe here without eating the vocal.' },
    { title: 'Stems inside a week', text: 'Rough mixes leave with you the same night; labeled stems follow within seven days. Nobody chases an engineer for files here.' },
    { title: 'Sample pack library', text: 'Stems and loops from our sessions, cleared for your tracks. Every pack ships with tempo and key already tagged.' },
  ],
  longAbout:
    'The desk is a 48-channel analog veteran with initials scratched under the armrest by three decades of engineers. Two tuned rooms, a stairwell echo chamber and a strict rule: rough mixes go home with you the same night.',
  contactLine: 'Door B, 4 Pressing Plant Yard',
  hoursLine: 'Sessions daily from 10:00 · nights by arrangement',
  heroKickers: ['Now booking sessions', 'Two rooms, one echo chamber', 'Analog desk, digital patience', 'Mixed and mastered here'],
  taglineImagery: [
    'sessions that run past midnight',
    'a console with stories in it',
    'the red recording light on',
    'mixes you can stand inside',
    'tracking drums till they breathe',
    'the studio hush before a take',
    'mastering that respects the mix',
    'one more take in the booth',
  ],
  taglinePromises: [
    'engineered, never over-polished',
    'tuned rooms, honest rates',
    'stems delivered inside a week',
    'booked by the song or the day',
    'quiet enough to hear the felt',
    'printed to tape on request',
  ],
  faq: [
    { q: 'What does a day in the studio cost?', a: 'A flat day rate with an engineer included — no hidden hourly meter, no surprise gear charges. Book by the song if that fits your project better.' },
    { q: 'Can I bring my own engineer?', a: 'Of course — the desk manual is laminated and the house engineer stays on hand for the first hour. Our patchbay is documented, which they will appreciate.' },
    { q: 'Do you master records tracked elsewhere?', a: 'Yes — send references and the mix, and you will have a master and honest notes within the week. Loudness targets are a conversation, not a default.' },
  ],
  testimonials: [
    { quote: 'We tracked drums at {name} in one afternoon and the rooms did half the mixing. The stems arrived labeled better than our own sessions.', by: 'Producer' },
    { quote: 'The echo chamber at {name} is on every chorus of our record. You cannot plugin your way to that sound.', by: 'Session vocalist' },
    { quote: 'Their desk has survived three decades and it shows in the best way. {name} runs sessions like the tape is always rolling.', by: 'Sound engineer' },
  ],
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
    { title: 'Therapist-designed', text: 'Every ritual and treatment written with licensed practitioners. The sleep program alone went through three clinical reviewers.' },
    { title: 'Clean ingredients only', text: 'Full ingredient lists, no fragrance mysteries, nothing we would not use ourselves. Every formula stays under twenty ingredients.' },
    { title: 'Book in two taps', text: 'See real availability and reserve without a phone call. Rescheduling is self-serve up to four hours before.' },
    { title: 'Personal ritual plans', text: 'A routine sized to your actual week, not an influencer’s. Ten minutes on weekdays, twenty on Sundays.' },
    { title: 'Quiet hours', text: 'Phone-free rooms and unhurried appointments — we never double-book. Every treatment ends with ten unscheduled minutes.' },
    { title: 'Gift-ready packaging', text: 'Everything arrives wrapped, with a handwritten note if you like. The cards are written by a person with a real pen.' },
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
  logoNames: ['Stillpoint Review', 'The Calm Ledger', 'Ritual Daily', 'Restful Post', 'Balm & Breath', 'Quiet Hours Co'],
  longAbout:
    'The studio was designed backwards — quiet rooms first, reception desk last. Every treatment on the menu was written with the practitioners who give it, runs ten minutes longer than the industry standard, and ends without anyone rushing you out.',
  contactLine: '6 Linden Court, garden entrance',
  hoursLine: 'Daily 10:00–20:00 · silent hours before noon',
  heroKickers: ['Quiet hours daily', 'Designed by practitioners', 'Your unhurried hour', 'Softness, scheduled', 'Breathe first, scroll later'],
  taglineImagery: ['an hour that belongs to you', 'quiet rooms and warm light', 'the unclenched jaw', 'rituals small enough to keep', 'rest, taken seriously', 'a slower pulse', 'the exhale you kept postponing', 'ten unscheduled minutes'],
  taglinePromises: ['scheduled without the guilt', 'unhurried on purpose', 'designed by people who practice it', 'calmer by the second visit', 'kind to actual schedules', 'bookable in two taps'],
  faq: [
    { q: 'What should I expect on a first visit?', a: 'Ten quiet minutes with tea before anything begins, and a short conversation about what your week has been doing to you. No forms on clipboards, no upselling on the table.' },
    { q: 'How far ahead do treatments book out?', a: 'Weekday mornings are usually open within a few days; weekend slots go about two weeks out. Silent hours before noon are the quietest booking of all.' },
    { q: 'Can I reschedule without a fee?', a: 'Self-serve up to four hours before, straight from the confirmation message. Later than that, we simply ask you to call — a human will find you a slot.' },
    { q: 'What is actually in the products you use?', a: 'Full ingredient lists on every jar, none longer than twenty entries, no fragrance mysteries. If your skin has a history, bring it up and we patch-test first.' },
    { q: 'Do treatments really run longer here?', a: 'Every one ends with ten unscheduled minutes, and we never double-book a room. You will not be handed your shoes while still breathing slowly.' },
    { q: 'Is there somewhere to decompress after?', a: 'The garden room stays open an hour past your treatment, with tea and no conversation required. Phones sleep in little beds at the door.' },
  ],
  testimonials: [
    { quote: 'The sleep ritual {name} built me survived a product launch and a teething baby. Ten minutes, most nights — that is the genius of it.', by: 'Spa director' },
    { quote: 'Nobody has ever rushed me out of a room at {name}. The unscheduled ten minutes at the end is worth the whole booking.', by: 'Massage therapist' },
    { quote: 'As a dermatologist I read ingredient lists for sport, and {name} passes. Under twenty ingredients, nothing hiding behind “fragrance.”', by: 'Dermatologist' },
    { quote: 'I book the silent morning hours at {name} and my jaw unclenches in the hallway. The quiet is a treatment in itself.', by: 'Meditation teacher' },
    { quote: 'The facial came with homework I could actually do — three steps, not eleven. {name} designs for real bathrooms.', by: 'Esthetician' },
    { quote: 'They rescheduled me at 7am after a cancelled flight, no fee, no sigh. {name} treats calm as a service standard.', by: 'Spa director' },
  ],
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
    { title: 'Quick to start', text: 'Be productive before your coffee cools — nothing to install, nothing to configure. First visit to first result takes under two minutes.' },
    { title: 'Thoughtful defaults', text: 'Sensible settings out of the box, with room to tune everything later. Nine out of ten members never open the settings page.' },
    { title: 'Works everywhere', text: 'A responsive layout that feels at home on phones, tablets and widescreens. The same account follows you from the train to the desk.' },
    { title: 'Private by design', text: 'Your data stays yours — no trackers, no surprise sharing, no fine print. The whole privacy policy fits on a single page.' },
    { title: 'Keyboard friendly', text: 'Every common action has a shortcut, so your hands never leave the keys. Press the question mark anywhere for the full map.' },
    { title: 'Built to last', text: 'Fast pages, honest engineering and updates that never break your flow. The changelog goes back four years without one forced migration.' },
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
  logoNames: ['Fieldnote Labs', 'Standard Works', 'The Daily Method', 'Cobalt Press', 'Harbor & Main', 'Studio Ledger'],
  longAbout:
    'This started as an internal tool that guests kept asking to take home. It is still built the same way — small releases, careful defaults and a changelog written for humans — by a team that fits around one large table.',
  contactLine: 'Studio 12, 4 Ledger Street',
  hoursLine: 'Replies weekdays, usually before lunch',
  heroKickers: ['Quietly excellent', 'Small team, sharp tool', 'New this season', 'Considered by default', 'Made for the everyday'],
  taglineImagery: ['the everyday, upgraded', 'good defaults', 'one calm workspace', 'the small hours of the week', 'tools that stay out of the way', 'a tidier day', 'fewer tabs, better mornings', 'the considered version'],
  taglinePromises: ['working before the coffee cools', 'built with fewer, better features', 'private by design', 'quietly dependable', 'finished properly', 'considered down to the empty states'],
  faq: [
    { q: 'How long does shipping take?', a: 'Orders leave the studio within two working days, wrapped in paper rather than plastic. Tracking arrives by email the moment the courier scans it.' },
    { q: 'What if it arrives and I do not love it?', a: 'Thirty days to change your mind, return label included, refund on the day it lands back. We would rather have it back than have it resented.' },
    { q: 'Where are things actually made?', a: 'Each product page names the workshop and the town — no vague “designed in” hedging. Most of the range comes from within a day’s drive.' },
    { q: 'Do the materials hold up?', a: 'Everything is tested in our own homes for a season before it goes on the shelf. The walnut tray on the photo desk is the original prototype, four years in.' },
    { q: 'Can I order something as a gift?', a: 'Tick the gift box and we wrap it, hide the price and write your card by hand. Receipts go to you, never into the parcel.' },
    { q: 'Do you restock sold-out pieces?', a: 'Small batches return when the workshop is ready, not on a fixed calendar. Join the note-me list and you will hear first, once, without a campaign.' },
  ],
  testimonials: [
    { quote: 'The {name} desk tray outlasted three laptops and still looks deliberate. Quiet objects, loudly well made.', by: 'Product designer' },
    { quote: 'Every order from {name} arrives like a small occasion — paper, twine, a card in actual handwriting. My clients always ask where it came from.', by: 'Studio owner' },
    { quote: 'We furnished the whole studio kitchen from {name} in one order. A year of daily use and not one regret on the shelf.', by: 'Operations lead' },
    { quote: 'I bought one candle as a test and now the whole team gets them every winter. {name} makes gifting embarrassingly easy.', by: 'Marketing director' },
    { quote: 'The linen tote has carried groceries, laptops and one uncooperative cat. {name} understates and over-delivers.', by: 'Founder, Fieldnote Labs' },
    { quote: 'Their restock notes are one email, once — no countdown timers, no manufactured panic. {name} sells like it respects you.', by: 'Product designer' },
  ],
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

/* ------------------------------------------------------------------ */
/* Flavor registry + detection                                         */
/* ------------------------------------------------------------------ */

/** Flavor order per split domain — also the tie-break priority. */
export const DOMAIN_FLAVORS: Partial<Record<TopicDomain, readonly TopicFlavor[]>> = {
  food: ['coffee', 'bakery', 'restaurant'],
  music: ['podcast', 'band', 'studio'],
  fitness: ['gym', 'yoga', 'run'],
};

const VOICES: Partial<Record<TopicDomain, Readonly<Partial<Record<TopicFlavor, TopicVoice>>>>> = {
  food: { coffee: FOOD_COFFEE, bakery: FOOD_BAKERY, restaurant: FOOD_RESTAURANT },
  music: { podcast: MUSIC_PODCAST, band: MUSIC_BAND, studio: MUSIC_STUDIO },
  fitness: { gym: FITNESS_GYM, yoga: FITNESS_YOGA, run: FITNESS_RUN },
};

function voiceOf(topic: TopicDomain, flavor: TopicFlavor): TopicVoice | undefined {
  if (flavor === 'general') return undefined;
  return VOICES[topic]?.[flavor];
}

interface FlavorMatcher {
  flavor: TopicFlavor;
  pattern: RegExp;
}

/**
 * Keyword patterns per flavor. Every flavored tagline stem contains at
 * least one of its own flavor's keywords and none of its siblings', which
 * is what lets `flavorFor` recover the flavor from the spec alone.
 */
const FLAVOR_MATCHERS: Partial<Record<TopicDomain, readonly FlavorMatcher[]>> = {
  food: [
    // NB: "café" ends in a non-word char, so a trailing \b never matches
    // there — use (?!\w) instead so accented spellings are recovered too.
    { flavor: 'coffee', pattern: /\bcoffees?\b|\broast\w*\b|\bespressos?\b|\bcaf(?:e|é)s?(?!\w)|\bbrews?\b|\bbrewing\b|\bbarista\w*\b|\bcrema\b|\bpour[-\s]?overs?\b|\blattes?\b|\bbeans?\b|\bcortados?\b|\bgrinders?\b|\bcupping\b|\bdrum\b/ },
    { flavor: 'bakery', pattern: /\bbreads?\b|\bbaker(?:y|ies)\b|\bbake\w*\b|\bbaking\b|\bpastr(?:y|ies)\b|\bcrusts?\b|\bcrumbs?\b|\bsourdough\b|\bloaf\b|\bloaves\b|\bdough\b|\bcroissants?\b|\bovens?\b|\blaminat\w+\b|\bproved?\b|\bflour\b/ },
    { flavor: 'restaurant', pattern: /\brestaurants?\b|\bbistros?\b|\bdiners?\b|\bmenus?\b|\btables?\b|\bkitchens?\b|\bchef\w*\b|\bplates?\b|\bdinners?\b|\bbrunch\b|\bsuppers?\b|\bcourses?\b|\btasting\b|\bcook\w*\b|\beater(?:y|ies)\b/ },
  ],
  music: [
    { flavor: 'podcast', pattern: /\bpodcasts?\b|\bepisodes?\b|\binterviews?\b|\blisten\w*\b|\bhosts?\b|\bmics?\b|\bcommutes?\b|\btranscri\w+\b/ },
    { flavor: 'band', pattern: /\bbands?\b|\btour\w*\b|\bgigs?\b|\balbums?\b|\bvinyl\b|\bsetlists?\b|\bencores?\b|\briffs?\b|\bamps?\b|\bstages?\b|\bvenues?\b|\bpress(?:ed|ings?)\b|\broad-tested\b/ },
    { flavor: 'studio', pattern: /\bstudios?\b|\brecordings?\b|\bmix(?:es|ing)\b|\bmastering\b|\bproducers?\b|\bsessions?\b|\btracking\b|\bconsoles?\b|\bbooths?\b|\bstems\b|\btaped?\b/ },
  ],
  fitness: [
    { flavor: 'yoga', pattern: /\byoga\b|\bpilates\b|\bflows?\b|\bmats?\b|\basanas?\b|\bvinyasas?\b|\bsavasana\b|\bbreath\w*\b|\bstretch\w*\b|\bcandlelit\b|\bclass(?:es)?\b/ },
    { flavor: 'run', pattern: /\brun(?:s|ning|ner|ners)?\b|\bmarathons?\b|\b5k\b|\b10k\b|\btrails?\b|\bmiles?\b|\bpaces?\b|\bpaced\b|\bstrides?\b|\btempo\b|\bintervals?\b|\bsplits?\b|\bstart line\b|\bcouch\b/ },
    { flavor: 'gym', pattern: /\bgyms?\b|\bstrength\b|\blift\w*\b|\bweights?\b|\bcrossfit\b|\bbarbells?\b|\bkettlebells?\b|\bsquats?\b|\bdeadlifts?\b|\breps?\b|\bracks?\b|\bcoach\w*\b|\bchalk\b|\bspotted\b|\bincrements\b/ },
  ],
};

/**
 * Scores `primary` (weight 2) and `secondary` (weight 1) against a domain's
 * flavor keywords. Null when nothing matches or the domain has no flavors.
 */
export function detectFlavor(
  topic: TopicDomain,
  primary: string,
  secondary = '',
): TopicFlavor | null {
  const matchers = FLAVOR_MATCHERS[topic];
  if (!matchers) return null;
  const p = primary.toLowerCase();
  const s = secondary.toLowerCase();
  let best: TopicFlavor | null = null;
  let bestScore = 0;
  for (const matcher of matchers) {
    let score = 0;
    if (matcher.pattern.test(p)) score += 2;
    if (matcher.pattern.test(s)) score += 1;
    if (score > bestScore) {
      best = matcher.flavor;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Deterministic flavor for a split domain when keywords give nothing:
 * a seeded pick keyed only on (seed, topic), so parse time and every later
 * regeneration land on the same voice.
 */
export function fallbackFlavor(topic: TopicDomain, seed: string): TopicFlavor {
  const flavors = DOMAIN_FLAVORS[topic];
  if (!flavors || flavors.length === 0) return 'general';
  return createRng(`${seed}:flavor:${topic}`).pick(flavors);
}

/** Keyword detection first (primary outweighs secondary), seeded fallback second. */
export function resolveFlavor(
  topic: TopicDomain,
  primary: string,
  secondary: string,
  seed: string,
): TopicFlavor {
  return detectFlavor(topic, primary, secondary) ?? fallbackFlavor(topic, seed);
}

/**
 * The project's sub-topic voice, derived from spec fields alone —
 * `generateFiles(spec)` is called repeatedly for the same spec during
 * edits, so this must be (and is) recoverable from name + tagline + seed
 * identically every time. Taglines composed at parse time always carry a
 * keyword of their own flavor, which is what the detector finds again here.
 */
export function flavorFor(
  spec: Pick<ProjectSpec, 'topic' | 'name' | 'tagline' | 'seed'>,
): TopicFlavor {
  return resolveFlavor(spec.topic, spec.tagline, spec.name, spec.seed);
}

/** Brandable name nouns for a flavor; empty when the flavor has none. */
export function flavorNameNouns(topic: TopicDomain, flavor: TopicFlavor): readonly string[] {
  return voiceOf(topic, flavor)?.nameNouns ?? [];
}

/** Rotates a pool by a seeded offset so different seeds surface different items first. */
function rotated<T>(pool: readonly T[], rng: Rng): readonly T[] {
  if (pool.length === 0) return pool;
  const offset = rng.int(0, pool.length - 1);
  return [...pool.slice(offset), ...pool.slice(0, offset)];
}

/**
 * Returns the content pools for a domain, each rotated by a seeded offset —
 * membership is stable, ordering varies between seeds.
 *
 * With a concrete `flavor`, pools mix that voice's entries with the
 * domain's voice-neutral ('general') entries — never a sibling voice's, so
 * one project speaks with one voice. Without a flavor, pools merge
 * everything (legacy callers keep their full variety).
 */
export function contentFor(
  topic: TopicDomain,
  rng: Rng,
  flavor: TopicFlavor = 'general',
): TopicContent {
  const base = CONTENT[topic];
  const domainVoices = VOICES[topic];
  const order = DOMAIN_FLAVORS[topic] ?? [];
  const voice = voiceOf(topic, flavor);

  const pool = <T>(
    pick: (v: TopicVoice) => readonly T[] | undefined,
    basePool: readonly T[],
  ): readonly T[] => {
    if (voice) return [...(pick(voice) ?? []), ...basePool];
    if (!domainVoices) return basePool;
    const extras: T[] = [];
    for (const f of order) {
      const v = domainVoices[f];
      if (v) extras.push(...(pick(v) ?? []));
    }
    return [...basePool, ...extras];
  };

  return {
    label: base.label,
    glyph: base.glyph,
    products: rotated(pool((v) => v.products, base.products), rng),
    posts: rotated(pool((v) => v.posts, base.posts), rng),
    recipes: rotated(base.recipes, rng), // each entry keeps its own items/steps
    galleryProjects: rotated(pool((v) => v.galleryProjects, base.galleryProjects), rng),
    personas: rotated(pool((v) => v.personas, base.personas), rng),
    stats: rotated(pool((v) => v.stats, base.stats), rng),
    featureIdeas: rotated(pool((v) => v.featureIdeas, base.featureIdeas), rng),
    habitIdeas: rotated(base.habitIdeas, rng),
    todoIdeas: rotated(base.todoIdeas, rng),
    kanbanCards: rotated(base.kanbanCards, rng),
    noteTitles: rotated(base.noteTitles, rng),
    chatContacts: rotated(base.chatContacts, rng),
    logoNames: rotated(pool((v) => v.logoNames, base.logoNames), rng),
    longAbout: voice?.longAbout ?? base.longAbout,
    contactLine: voice?.contactLine ?? base.contactLine,
    hoursLine: voice?.hoursLine ?? base.hoursLine,
    heroKickers: rotated(pool((v) => v.heroKickers, base.heroKickers), rng),
    // Tagline pools are voice-exclusive in flavored views: every stem must
    // carry a recoverable flavor keyword (see flavorFor).
    taglineImagery: rotated(
      voice ? voice.taglineImagery : pool((v) => v.taglineImagery, base.taglineImagery),
      rng,
    ),
    taglinePromises: rotated(
      voice ? voice.taglinePromises : pool((v) => v.taglinePromises, base.taglinePromises),
      rng,
    ),
    faq: rotated(pool((v) => v.faq, base.faq), rng),
    testimonials: rotated(pool((v) => v.testimonials, base.testimonials), rng),
  };
}

/* ------------------------------------------------------------------ */
/* Universal FAQ entries                                               */
/* ------------------------------------------------------------------ */

/**
 * Domain-agnostic Q&As; the FAQ renderer mixes AT MOST ONE of these in
 * beside the domain pool. Deliberately free of SaaS phrasing.
 */
export const UNIVERSAL_FAQ: readonly TopicFaq[] = [
  { q: 'Do you offer gift cards?', a: 'Yes — digital ones by email in any amount, and printed ones over the counter. They never expire, because expiring gifts are rude.' },
  { q: 'How do I reach a real person?', a: 'Email us and a human answers, usually before lunch. No ticket numbers, no phone trees, no chatbot pretending otherwise.' },
  { q: 'Do you offer discounts?', a: 'Students, teachers and non-profits get a standing discount — write from your institution address and we will sort it out.' },
];

/* ------------------------------------------------------------------ */
/* Tagline grammar                                                     */
/* ------------------------------------------------------------------ */

function capFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Composes a tagline from imagery + promise fragment pools — the voice's
 * own pools for flavored domains, the domain pools otherwise. The raw
 * prompt is never echoed into a tagline, and every flavored stem carries a
 * keyword `flavorFor` can recover at regeneration time. Four structural
 * patterns × large pools keep sibling seeds from sharing an opening stem.
 */
export function composeTagline(
  topic: TopicDomain,
  rng: Rng,
  flavor: TopicFlavor = 'general',
): string {
  const voice = voiceOf(topic, flavor);
  const base = CONTENT[topic];
  const imagery = rng.pick(voice?.taglineImagery ?? base.taglineImagery);
  const promise = rng.pick(voice?.taglinePromises ?? base.taglinePromises);
  return rng.pick([
    `${capFirst(imagery)}, ${promise}.`,
    `${capFirst(imagery)} — ${promise}.`,
    `${capFirst(promise)}: ${imagery}.`,
    `${capFirst(imagery)}. ${capFirst(promise)}.`,
  ]);
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

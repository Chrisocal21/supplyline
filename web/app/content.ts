// Everything the site says, in one place. Each fact is said once.

/** Set these when the pages exist. A button with no address stays off. */
export const LINKS = {
  demo: 'https://github.com/Chrisocal21/supplyline/releases/download/demo/Supplyline-Demo-Setup.exe',
  steam: '',
  studio: 'https://www.probablyfinestudios.com',
};

export const BUILD = process.env.NEXT_PUBLIC_BUILD ?? '';

export const TAGLINE = 'Build farms, forests and factories on a 3D globe. Move the goods by truck, train, ship and plane. Watch the towns grow.';

/** The three big ideas, each with a screenshot. */
export const PILLARS = [
  { n: '01', tag: 'Build', title: 'Turn land into goods', body: 'Pick a spot in the woods, the fields or the hills. Camps, farms and quarries pull raw goods out of the ground, and mills and factories turn them into lumber, bricks, steel and machinery. The trees grow back. Mostly.', img: '/title/3.jpg', alt: 'A mountain town with factories' },
  { n: '02', tag: 'Move', title: 'Run the line', body: 'Lay roads, rail and bridges, buy trucks, trains, ships and planes, and hire drivers who rank up. Every route is yours to plan, from a dirt track to an air freight network. The drivers never complain. We checked.', img: '/title/2.jpg', alt: 'A railway and road running into a tunnel' },
  { n: '03', tag: 'Grow', title: 'Feed the towns', body: 'Towns want food, materials and products. Keep their shelves full and a village becomes a town, a city, a metropolis. Then it wants more. It always wants more.', img: '/title/5.jpg', alt: 'A town on a river' },
];

/** Who makes this, said plainly. */
export const STUDIO = {
  title: 'Hi. We are Probably Fine Studios.',
  body: [
    'SupplyLine is made by one developer and a handful of friends with opinions. We are good at the logic: the goods, the routes, the towns, and the thousand small sums that decide whether your truck turns up.',
    'We cannot make 3D art. At all. So every building, truck and tree you see was built in code, with AI doing the heavy lifting. It is all we have got, and we would rather tell you than pretend.',
    'The friends come from the same place the game does: American Truck Simulator, Farming Simulator, Satisfactory, Cities: Skylines, SimCity and every game like them. SupplyLine is our ode to them and to everything that came before us. We stand on their shoulders, and we are open to modding.',
    'They are stand-ins. When a real artist joins, they get replaced. Until then, it is probably fine.',
  ],
  report: [
    ['Developers', '1'],
    ['Friends with opinions', 'A handful'],
    ['3D artists', '0 (please)'],
    ['Models made by AI', 'All of them'],
    ['Friends who need to patch their build', 'Some'],
  ] as [string, string][],
};

export const SHOTS = [
  { src: '/title/0.jpg', alt: 'The globe from space' },
  { src: '/site/shot-island.png', alt: 'Islands in the ocean' },
  { src: '/title/1.jpg', alt: 'A town by the water' },
  { src: '/site/shot-desert.jpg', alt: 'A desert continent' },
  { src: '/site/shot-river.png', alt: 'A river valley' },
];

export const TIERS = ['Startup', 'Regional Supplier', 'Industrial Group', 'Global Network', 'Legacy'];
/** How many tiers the demo plays. */
export const DEMO_TIERS = 2;

export const DEMO_POINTS = [
  'Map 1, The Known World',
  'Your first town, food, lumber, bricks and mechanics',
  'Trucks and highways',
  'Save to a file and carry it into the full game',
];

export const MAPS = [
  { n: 1, name: 'The Known World', img: '/site/map-1.jpg', status: 'Free demo', body: 'Small and friendly, built to teach. Every good is within reach, and island goods need ships.', facts: ['33 towns'] },
  { n: 2, name: 'The Continental', img: '/site/map-2.jpg', status: 'Full game', body: 'Four continents and a lot of sea. Coffee, mangoes and oil lie overseas, so you need ports and planes.', facts: ['55 towns'] },
  { n: 3, name: 'The Meridian Sea', img: '/site/map-3.jpg', status: 'Full game, beta', body: 'Five times the land of Map 2, with a desert continent and sea channels. It wants a good graphics card.', facts: ['About 190 towns'] },
];

export const ROADMAP: { now: string[]; next: string[] } = {
  now: ['A faster, lighter globe for laptops', 'Polishing Tiers 0 to 2 into a complete early build'],
  next: ['The artwork overhaul', 'Steel, machinery, rail networks and air freight', 'Sleeping towns that join in as your lines reach them', 'A Steam page and release'],
};

export const NEWS = [
  { v: '0.146 - 0.155', title: 'A wiki and a cleaner world', items: ['A wiki with every building, vehicle, district and good, with pictures.', 'A richer Forestry Camp.', 'Fresher ground colours.', 'Small hills are carved flat, so roads run straight.', 'Land you can build on glows green; locked land glows orange.', 'Homes no longer stand on lots or building pads.', 'See the buyers your truck cannot reach yet.'] },
  { v: '0.141 - 0.145', title: 'Smoother', items: ['Building a road no longer stalls the frame.', 'The ground only draws what is on screen.', 'A far camp is always offered the Supply Yard and Market.'] },
  { v: '0.136', title: 'The demo', items: ['The demo plays Map 1 and ends at Tier 2.', 'Save your demo progress and load it in the full game.'] },
];

export const FAQ = [
  { q: 'Can I play in my browser or on a phone?', a: 'No. It is a Windows download played with a mouse and keyboard, because the game is too heavy for a browser tab. This website works on a phone.' },
  { q: 'Will it come to Steam?', a: 'That is the plan. The wishlist button switches on once there is a page.' },
  { q: 'Why does it look like that?', a: 'Because one developer can write a supply chain but cannot model a forklift. The models are built in code with AI help, as stand-ins. A real artwork overhaul is planned the moment we find an artist.' },
  { q: 'Is it finished?', a: 'No. It changes most weeks, things break and get fixed, and saves sometimes do not survive. It is probably fine.' },
];

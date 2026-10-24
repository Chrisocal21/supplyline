// Everything the site says, in one place.

/** Set these when the pages exist. A button with no address stays off. */
export const LINKS = {
  demo: 'https://github.com/Chrisocal21/supplyline/releases/download/demo/Supplyline-Demo-Setup.exe',
  steam: '',
  studio: 'https://www.probablyfinestudios.com',
};

export const BUILD = process.env.NEXT_PUBLIC_BUILD ?? '';

export const FEATURES = [
  { tag: 'Build', title: 'Make things', body: 'Camps, farms, mills and factories turn raw goods into products.' },
  { tag: 'Move', title: 'Run your fleet', body: 'Trucks, trains, ships and planes carry the goods where they are wanted.' },
  { tag: 'Grow', title: 'Watch towns grow', body: 'A village becomes a town, a city, a metropolis. Bigger towns want more.' },
];

export const SHOTS = [
  { src: '/title/2.jpg', alt: 'A farm and rail line by the sea', caption: 'Roads, rail and bridges, down at street level.' },
  { src: '/site/shot-overview.png', alt: 'The whole globe from space', caption: 'The whole globe, every wood and range named.' },
  { src: '/site/shot-desert.jpg', alt: 'A desert continent with lakes and arid towns', caption: 'A desert continent, with oases and arid towns.' },
  { src: '/site/shot-island.png', alt: 'An island in the ocean', caption: 'Coffee, mangoes and oil lie across the water.' },
  { src: '/site/shot-forest.jpg', alt: 'A forest with a Forestry spot ringed', caption: 'A ringed spot waits for your first camp.' },
  { src: '/site/shot-river.png', alt: 'A river valley', caption: 'Rivers, lakes and bridges.' },
];

export const STATS = [
  { n: '89', label: 'goods' },
  { n: '87', label: 'buildings' },
  { n: '12', label: 'vehicles' },
  { n: '3', label: 'maps' },
];

export const STEPS = [
  { title: 'Build a Forestry Camp', body: 'Pick a ringed forest spot. Trees give you logs.' },
  { title: 'Buy a truck and lay a road', body: 'Drag a road from the camp to your town.' },
  { title: 'Build the Supply Yard', body: 'Send it 160 logs. It stores the town’s building materials.' },
  { title: 'Build the Market', body: '240 more logs, carried by a yard truck.' },
  { title: 'Sell food', body: 'Add a ranch and an orchard. Milk and fruit sell to the Market, and your town starts to grow.' },
];

export const TIERS = [
  { tier: 'Tier 0', name: 'Startup', body: 'Logs, a town, first sales', demo: true },
  { tier: 'Tier 1', name: 'Regional Supplier', body: 'Food, lumber, bricks, mechanics', demo: true },
  { tier: 'Tier 2', name: 'Industrial Group', body: 'Rail, ports, metal, cloth', demo: false, edge: true },
  { tier: 'Tier 3', name: 'Global Network', body: 'Steel, machinery, air freight', demo: false },
  { tier: 'Tier 4', name: 'Legacy', body: 'The long game', demo: false },
];

export const COMPARE: { what: string; demo: string; full: string }[] = [
  { what: 'Maps', demo: 'Map 1: The Known World', full: 'All three maps' },
  { what: 'Tiers', demo: 'Tier 0 and Tier 1', full: 'Tier 0 to Tier 4' },
  { what: 'Moving goods', demo: 'Trucks and highways', full: 'Trucks, rail, ports, ships and planes' },
  { what: 'Goods', demo: 'Food, lumber, bricks', full: 'Steel, machinery, cloth and more' },
  { what: 'Saves', demo: 'Carry over to the full game', full: 'Yes' },
  { what: 'Price', demo: 'Free', full: 'Coming to Steam' },
];

export const MAPS = [
  {
    n: 1,
    name: 'The Known World',
    img: '/site/map-1.jpg',
    status: 'In the demo',
    tone: 'good',
    lead: 'Built to teach.',
    body: 'A small, friendly world where every good is within reach and the island goods need ships. The map the free demo plays, and the best place to learn the game.',
    facts: ['33 towns', 'island goods by ship', 'demo and full game'],
  },
  {
    n: 2,
    name: 'The Continental',
    img: '/site/map-2.jpg',
    status: 'Full game',
    tone: '',
    lead: 'Built for rivers, ports and planes.',
    body: 'Four continents and about 46% sea. Coffee, mangoes and oil lie overseas, so you have to build ports and use aircraft to get them.',
    facts: ['55 towns', 'rivers, lakes and a gulf', 'desktop only'],
  },
  {
    n: 3,
    name: 'The Meridian Sea',
    img: '/site/map-3.jpg',
    status: 'Full game, beta',
    tone: 'accent',
    lead: 'Built for scale and the long game.',
    body: 'Five times the land of Map 2, with a desert continent, sea channels for ships and about 190 towns. It is heavy, so it wants a good graphics card.',
    facts: ['5 times the land of Map 2', 'desert and arid towns', '22 sea channels', 'desktop only'],
  },
];

export const ROADMAP: { title: string; body: string; state: 'done' | 'now' | 'next' }[] = [
  { title: 'Hello, world', body: 'Hand-made maps with rivers, seas, islands and a desert.', state: 'done' },
  { title: 'Wheels, wings and waves', body: 'Trucks, trains, ships and planes, with roads, rails and bridges.', state: 'done' },
  { title: 'Meet the crew', body: 'Named drivers who rank up, and mechanics who keep the fleet running.', state: 'done' },
  { title: 'Show me the way', body: 'Quests in five tiers, plus a tutorial for your first town.', state: 'done' },
  { title: 'The big map', body: 'Map 3, five times bigger than Map 2, open as a beta.', state: 'done' },
  { title: 'A free taste', body: 'A free Windows demo on Map 1 that ends at Tier 2.', state: 'done' },
  { title: 'Smooth as butter', body: 'A faster, lighter globe for laptops. The ground now only draws what is on screen.', state: 'now' },
  { title: 'A great first hour', body: 'Polishing tiers 0 to 2 into a complete early build.', state: 'now' },
  { title: 'The artwork overhaul', body: 'New models for buildings, vehicles and towns. We are looking for 3D artists.', state: 'next' },
  { title: 'Deeper chains', body: 'Steel, machinery, rail networks and air freight.', state: 'next' },
  { title: 'Sleeping towns wake up', body: 'Towns that join in as your lines reach them.', state: 'next' },
  { title: 'Steam', body: 'A store page and a release, once the game is ready.', state: 'next' },
];

export const NEWS = [
  { v: '0.141 - 0.145', title: 'Smoother, and a store page', items: ['Building a road no longer stalls the frame.', 'The ground is drawn in chunks, so only what is on screen costs anything.', 'A camp far from its town is always offered the Supply Yard and Market.', 'The demo shows a DEMO tag and marks later tiers as the full game.', 'A preview of the Steam store page.'] },
  { v: '0.136', title: 'The demo', items: ['The demo plays Map 1 and ends when you reach Tier 2.', 'Save your demo progress to a file and load it in the download.', 'Every map now says what it is and why it was built.'] },
  { v: '0.130 - 0.135', title: 'A lighter globe', items: ['The globe draws far fewer triangles, so it runs smoother on laptops.', 'Town names appear as your pointer passes over them.', 'Map 3 has sea channels for ships.'] },
  { v: '0.127 - 0.129', title: 'Map 3 is open', items: ['About five times the land of Map 2, redrawn so nothing looks squeezed.', 'Every town keeps clear of the water and has room to grow.', 'Map 3 saves are a third of the size.'] },
  { v: '0.123 - 0.126', title: 'A longer start', items: ['Your first town is built from logs, then lumber from Tier 1.', 'More quests, and a tutorial you can switch off.'] },
];

export const FAQ = [
  { q: 'What is in the free demo?', a: 'Map 1, and Tiers 0 and 1: your first town, food, lumber, bricks, mechanics and the first town levels. It ends when you reach Tier 2. It is a Windows download, because the game is too big for a browser tab.' },
  { q: 'Which map should I start on?', a: 'Map 1. It is built to teach, and it is the one the demo plays. Map 2 is built for ports and planes, and Map 3 for scale and the long game; both are in the full game only.' },
  { q: 'Can I play in my browser?', a: 'No. The game is too heavy for a browser tab, so it is a Windows download.' },
  { q: 'Will it come to Steam?', a: 'That is the plan. The wishlist button switches on once there is a page.' },
  { q: 'Will my save carry over?', a: 'Mostly, but not always yet. If a map’s land is changed, older saves cannot load. You can always export a save to a file from the menu.' },
  { q: 'Does it run on a phone or tablet?', a: 'Not yet. It is a desktop game, played with a mouse and keyboard. This website works on a phone, but the game does not. Mobile may come much later.' },
  { q: 'Why does it look rough in places?', a: 'The models you see are stand-ins while the rules and the world are built. A full artwork overhaul is planned.' },
];

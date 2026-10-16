export const TOKENS = [
  { name: 'Speedster', icon: '🚗', color: '#f06a4f' },
  { name: 'Top Hat', icon: '🎩', color: '#e8bc55' },
  { name: 'Good Boy', icon: '🐕', color: '#7bb8a3' },
  { name: 'Catwalk', icon: '🐈', color: '#b59be8' },
  { name: 'Seafarer', icon: '🚢', color: '#6fa9dc' },
  { name: 'Boots', icon: '🥾', color: '#d8a276' },
  { name: 'Thimble', icon: '🧵', color: '#e88bb2' },
  { name: 'Hauler', icon: '🛒', color: '#b7c86a' },
];

const p = (name, group, price, rent, houseCost = 50) => ({ name, type: 'property', group, price, rent, houseCost });
const rail = (name) => ({ name, type: 'railroad', price: 200, rent: 25 });
const util = (name) => ({ name, type: 'utility', price: 150, rent: 0 });
const tax = (name, amount) => ({ name, type: 'tax', amount });
const special = (name, type, subtitle = '') => ({ name, type, subtitle });

export const SQUARES = [
  special('GO', 'go', 'Collect $200 as you pass'),
  p('Mediterranean Avenue', 'brown', 60, 2, 50),
  special('Community Chest', 'chest'),
  p('Baltic Avenue', 'brown', 60, 4, 50),
  tax('Income Tax', 200),
  rail('Reading Railroad'),
  p('Oriental Avenue', 'lightblue', 100, 6),
  special('Chance', 'chance'),
  p('Vermont Avenue', 'lightblue', 100, 6),
  p('Connecticut Avenue', 'lightblue', 120, 8),
  special('Jail / Just Visiting', 'jail'),
  p('St. Charles Place', 'pink', 140, 10),
  util('Electric Company'),
  p('States Avenue', 'pink', 140, 10),
  p('Virginia Avenue', 'pink', 160, 12),
  rail('Pennsylvania Railroad'),
  p('St. James Place', 'orange', 180, 14),
  special('Community Chest', 'chest'),
  p('Tennessee Avenue', 'orange', 180, 14),
  p('New York Avenue', 'orange', 200, 16),
  special('Free Parking', 'parking'),
  p('Kentucky Avenue', 'red', 220, 18),
  special('Chance', 'chance'),
  p('Indiana Avenue', 'red', 220, 18),
  p('Illinois Avenue', 'red', 240, 20),
  rail('B. & O. Railroad'),
  p('Atlantic Avenue', 'yellow', 260, 22),
  p('Ventnor Avenue', 'yellow', 260, 22),
  util('Water Works'),
  p('Marvin Gardens', 'yellow', 280, 24),
  special('Go To Jail', 'gojail'),
  p('Pacific Avenue', 'green', 300, 26),
  p('North Carolina Avenue', 'green', 300, 26),
  special('Community Chest', 'chest'),
  p('Pennsylvania Avenue', 'green', 320, 28),
  rail('Short Line'),
  special('Chance', 'chance'),
  p('Park Place', 'darkblue', 350, 35),
  tax('Luxury Tax', 100),
  p('Boardwalk', 'darkblue', 400, 50),
];

export const GROUPS = {
  brown: { label: 'Brown', color: '#9c694b', count: 2 }, lightblue: { label: 'Light Blue', color: '#7ec9db', count: 3 },
  pink: { label: 'Pink', color: '#c77eb3', count: 3 }, orange: { label: 'Orange', color: '#ed9b53', count: 3 },
  red: { label: 'Red', color: '#e65b59', count: 3 }, yellow: { label: 'Yellow', color: '#e5c95c', count: 3 },
  green: { label: 'Green', color: '#64a77b', count: 3 }, darkblue: { label: 'Dark Blue', color: '#5575c9', count: 2 },
};

export const CHANCE_CARDS = [
  { text: 'Advance to GO. Collect $200.', action: 'go' }, { text: 'Bank pays you a dividend of $50.', action: 'cash', amount: 50 },
  { text: 'Advance to Boardwalk.', action: 'move', target: 39 }, { text: 'Go directly to Jail. Do not pass GO.', action: 'jail' },
  { text: 'Your building loan matures. Collect $150.', action: 'cash', amount: 150 }, { text: 'Pay speeding fine of $15.', action: 'pay', amount: 15 },
  { text: 'Advance to Illinois Avenue.', action: 'move', target: 24 }, { text: 'You inherit $100.', action: 'cash', amount: 100 },
  { text: 'Go back 3 spaces.', action: 'back', amount: 3 }, { text: 'Pay each player $25.', action: 'payeach', amount: 25 },
  { text: 'Make general repairs: $25 per house, $100 per hotel.', action: 'repairs', house: 25, hotel: 100 }, { text: 'Get out of Jail free.', action: 'jailcard' },
  { text: 'Advance to the nearest Railroad.', action: 'railroad' }, { text: 'Collect $50 from every player.', action: 'collecteach', amount: 50 },
  { text: 'Advance to St. Charles Place.', action: 'move', target: 11 }, { text: 'You have won a crossword competition. Collect $100.', action: 'cash', amount: 100 },
];
export const CHEST_CARDS = [
  { text: 'Bank error in your favour. Collect $200.', action: 'cash', amount: 200 }, { text: 'Doctor’s fee. Pay $50.', action: 'pay', amount: 50 },
  { text: 'From sale of stock you get $50.', action: 'cash', amount: 50 }, { text: 'Go directly to Jail.', action: 'jail' },
  { text: 'Holiday fund matures. Receive $100.', action: 'cash', amount: 100 }, { text: 'Pay school fees of $50.', action: 'pay', amount: 50 },
  { text: 'Income tax refund. Collect $20.', action: 'cash', amount: 20 }, { text: 'It is your birthday. Collect $10 from each player.', action: 'collecteach', amount: 10 },
  { text: 'Life insurance matures. Collect $100.', action: 'cash', amount: 100 }, { text: 'Pay hospital fees of $100.', action: 'pay', amount: 100 },
  { text: 'Receive $25 consultancy fee.', action: 'cash', amount: 25 }, { text: 'You inherit $100.', action: 'cash', amount: 100 },
  { text: 'Pay your insurance premium of $50.', action: 'pay', amount: 50 }, { text: 'Get out of Jail free.', action: 'jailcard' },
  { text: 'You have won second prize in a beauty contest. Collect $10.', action: 'cash', amount: 10 }, { text: 'You receive $100 from a property sale.', action: 'cash', amount: 100 },
];

export const fmt = (value) => '$' + Math.round(value).toLocaleString('en-US');

import { SQUARES, GROUPS, CHANCE_CARDS, CHEST_CARDS, TOKENS } from './data.js';

const shuffled = (items) => [...items].sort(() => Math.random() - 0.5);
const initialPlayers = (count) => Array.from({ length: count }, (_, i) => ({
  id: i, name: ['You', 'Maya', 'Tobi', 'Zara'][i], token: TOKENS[i], cash: 1500, position: 0,
  properties: [], jailed: false, jailTurns: 0, jailCards: 0, bankrupt: false, color: TOKENS[i].color,
}));

export class MonopolyGame {
  constructor(count = 2) {
    this.players = initialPlayers(count);
    this.current = 0;
    this.turn = 1;
    this.phase = 'ready';
    this.lastRoll = [1, 1];
    this.doubles = 0;
    this.pending = null;
    this.log = [];
    this.chance = shuffled(CHANCE_CARDS);
    this.chest = shuffled(CHEST_CARDS);
    this.freeParking = 0;
    this.winner = null;
    this.houses = Object.fromEntries(SQUARES.map((s, i) => [i, { houses: 0, hotel: false, mortgaged: false, owner: null }]));
    this.say('The table is open. Pick your strategy and roll.');
  }
  get player() { return this.players[this.current]; }
  get square() { return SQUARES[this.player.position]; }
  getPropertyState(index) { return this.houses[index]; }
  say(message, kind = 'normal') { this.log.unshift({ message, kind, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }); this.log = this.log.slice(0, 18); }
  alivePlayers() { return this.players.filter(p => !p.bankrupt); }
  roll() {
    if (this.phase !== 'ready' && this.phase !== 'jailed') return null;
    const p = this.player;
    const a = 1 + Math.floor(Math.random() * 6), b = 1 + Math.floor(Math.random() * 6);
    this.lastRoll = [a, b];
    const doubles = a === b;
    this.say(`${p.name} rolled ${a} + ${b}${doubles ? ' — doubles!' : '.'}`, doubles ? 'good' : 'normal');
    if (p.jailed) {
      if (doubles) { p.jailed = false; p.jailTurns = 0; this.say(`${p.name} rolled doubles and walked free.`, 'good'); }
      else { p.jailTurns++; if (p.jailTurns >= 3) { p.cash -= 50; p.jailed = false; p.jailTurns = 0; this.say(`${p.name} paid $50 bail after three turns.`, 'bad'); } else { this.phase = 'endturn'; this.say(`${p.name} remains in Jail (${p.jailTurns}/3).`); return { a, b, jailed: true, doubles: false }; } }
    } else if (doubles) {
      this.doubles++;
      if (this.doubles >= 3) { this.sendToJail(p); this.phase = 'endturn'; return { a, b, jailed: true, doubles: true }; }
    } else this.doubles = 0;
    this.phase = 'moving';
    this.pending = { destination: (p.position + a + b) % 40, steps: a + b, doubles };
    return { a, b, doubles, steps: a + b };
  }
  completeMove() {
    if (!this.pending) return;
    const p = this.player, { destination, steps } = this.pending;
    if (!p.jailed && destination < p.position) { p.cash += 200; this.say(`${p.name} passed GO and collected $200.`, 'good'); }
    p.position = destination;
    this.pending = null;
    this.resolveSquare();
  }
  resolveSquare() {
    const p = this.player, s = this.square, idx = p.position, state = this.houses[idx];
    this.phase = 'action';
    this.say(`${p.name} landed on ${s.name}.`, 'normal');
    if (s.type === 'property' || s.type === 'railroad' || s.type === 'utility') {
      if (state.owner === null) { this.phase = 'buy'; this.say(`${s.name} is unowned. Buy it or leave it to the bank.`); }
      else if (state.owner !== p.id && !state.mortgaged) {
        const owner = this.players[state.owner];
        const rent = this.calculateRent(idx);
        p.cash -= rent; owner.cash += rent;
        this.say(`${p.name} paid ${owner.name} ${'$' + rent} rent.`, 'bad'); this.phase = 'endturn'; this.checkBankruptcy(p, owner);
      } else { this.phase = 'endturn'; this.say(state.owner === p.id ? 'Your property. No rent due.' : 'This property is mortgaged. No rent due.'); }
    } else if (s.type === 'tax') {
      p.cash -= s.amount; this.freeParking += s.amount; this.say(`${p.name} paid ${'$' + s.amount} in ${s.name}.`, 'bad'); this.phase = 'endturn'; this.checkBankruptcy(p);
    } else if (s.type === 'gojail') { this.sendToJail(p); this.phase = 'endturn'; }
    else if (s.type === 'chance' || s.type === 'chest') this.drawCard(s.type);
    else this.phase = 'endturn';
    return s;
  }
  calculateRent(index) {
    const s = SQUARES[index], state = this.houses[index], owner = this.players[state.owner];
    if (state.mortgaged) return 0;
    if (s.type === 'railroad') return 25 * Math.pow(2, this.players[state.owner].properties.filter(i => SQUARES[i].type === 'railroad').length - 1);
    if (s.type === 'utility') { const count = owner.properties.filter(i => SQUARES[i].type === 'utility').length; return (this.lastRoll[0] + this.lastRoll[1]) * (count === 2 ? 10 : 4); }
    const group = GROUPS[s.group];
    const ownsGroup = group && SQUARES.map((sq, i) => sq.group === s.group ? i : -1).filter(i => i >= 0).every(i => this.houses[i].owner === owner.id);
    if (state.hotel) return s.rent * 15;
    if (state.houses) return s.rent * (state.houses === 1 ? 5 : state.houses === 2 ? 15 : state.houses === 3 ? 45 : 80);
    return s.rent * (ownsGroup ? 2 : 1);
  }
  buy() {
    if (this.phase !== 'buy') return false;
    const p = this.player, idx = p.position, s = SQUARES[idx];
    if (p.cash < s.price) { this.say(`Not enough cash to buy ${s.name}.`, 'bad'); return false; }
    p.cash -= s.price; p.properties.push(idx); this.houses[idx].owner = p.id;
    this.say(`${p.name} bought ${s.name} for ${'$' + s.price}.`, 'good'); this.phase = 'endturn'; return true;
  }
  auctionPass() { if (this.phase !== 'buy') return; this.say(`${this.square.name} stays with the bank.`); this.phase = 'endturn'; }
  build(index, kind = 'house') {
    const p = this.player, s = SQUARES[index], st = this.houses[index];
    if (!s || s.type !== 'property' || st.owner !== p.id || st.mortgaged || p.cash < s.houseCost) return false;
    const groupSquares = SQUARES.map((sq, i) => sq.group === s.group ? i : -1).filter(i => i >= 0);
    if (!groupSquares.every(i => this.houses[i].owner === p.id)) return false;
    if (kind === 'hotel') { if (st.houses < 4) return false; st.houses = 0; st.hotel = true; }
    else { if (st.hotel || st.houses >= 4) return false; st.houses++; }
    p.cash -= s.houseCost; this.say(`${p.name} built ${kind} on ${s.name} for ${'$' + s.houseCost}.`, 'good'); return true;
  }
  mortgage(index) {
    const p = this.player, s = SQUARES[index], st = this.houses[index];
    if (!s || st.owner !== p.id || st.mortgaged || st.houses || st.hotel) return false;
    st.mortgaged = true; p.cash += Math.floor(s.price / 2); this.say(`${p.name} mortgaged ${s.name} for ${'$' + Math.floor(s.price / 2)}.`); return true;
  }
  unmortgage(index) {
    const p = this.player, s = SQUARES[index], st = this.houses[index], cost = Math.ceil(s.price * 0.55);
    if (!s || st.owner !== p.id || !st.mortgaged || p.cash < cost) return false;
    p.cash -= cost; st.mortgaged = false; this.say(`${p.name} unmortgaged ${s.name} for ${'$' + cost}.`); return true;
  }
  sendToJail(p) { p.position = 10; p.jailed = true; p.jailTurns = 0; this.doubles = 0; this.say(`${p.name} was sent to Jail.`, 'bad'); }
  payBail() { const p = this.player; if (!p.jailed || p.cash < 50) return false; p.cash -= 50; p.jailed = false; p.jailTurns = 0; this.say(`${p.name} paid $50 bail.`, 'good'); this.phase = 'ready'; return true; }
  drawCard(type) {
    const deck = type === 'chance' ? this.chance : this.chest;
    if (!deck.length) deck.push(...shuffled(type === 'chance' ? CHANCE_CARDS : CHEST_CARDS));
    const card = deck.pop(); this.lastCard = { ...card, type };
    const p = this.player; this.say(`${type === 'chance' ? 'Chance' : 'Community Chest'}: ${card.text}`);
    switch (card.action) {
      case 'cash': p.cash += card.amount; this.phase = 'endturn'; break;
      case 'pay': p.cash -= card.amount; this.phase = 'endturn'; this.checkBankruptcy(p); break;
      case 'go': if (p.position !== 0) p.cash += 200; p.position = 0; this.phase = 'endturn'; break;
      case 'move': if (card.target < p.position) p.cash += 200; p.position = card.target; this.resolveSquare(); break;
      case 'jail': this.sendToJail(p); this.phase = 'endturn'; break;
      case 'jailcard': p.jailCards++; this.phase = 'endturn'; break;
      case 'back': p.position = (p.position - card.amount + 40) % 40; this.resolveSquare(); break;
      case 'railroad': { const target = [5, 15, 25, 35].find(i => i > p.position) ?? 5; if (target < p.position) p.cash += 200; p.position = target; this.resolveSquare(); break; }
      case 'collecteach': for (const other of this.players.filter(x => x.id !== p.id && !x.bankrupt)) { other.cash -= card.amount; p.cash += card.amount; } this.phase = 'endturn'; break;
      case 'payeach': for (const other of this.players.filter(x => x.id !== p.id && !x.bankrupt)) { p.cash -= card.amount; other.cash += card.amount; } this.phase = 'endturn'; this.checkBankruptcy(p); break;
      case 'repairs': { const cost = p.properties.reduce((sum, i) => sum + this.houses[i].houses * card.house + (this.houses[i].hotel ? card.hotel : 0), 0); p.cash -= cost; this.say(`Repairs cost ${'$' + cost}.`); this.phase = 'endturn'; this.checkBankruptcy(p); break; }
      default: this.phase = 'endturn';
    }
  }
  checkBankruptcy(p, creditor = null) {
    if (p.cash >= 0) return;
    p.bankrupt = true; this.say(`${p.name} is bankrupt. Assets transferred to ${creditor ? creditor.name : 'the bank'}.`, 'bad');
    for (const i of p.properties) { this.houses[i].owner = creditor ? creditor.id : null; if (creditor) creditor.properties.push(i); }
    p.properties = [];
    if (this.alivePlayers().length === 1) { this.winner = this.alivePlayers()[0]; this.phase = 'won'; this.say(`${this.winner.name} owns the city!`, 'good'); }
  }
  endTurn() {
    if (this.phase !== 'endturn' && this.phase !== 'action') return;
    if (this.phase === 'action') this.phase = 'endturn';
    if (this.lastRoll[0] === this.lastRoll[1] && !this.player.jailed && this.doubles < 3) { this.phase = 'ready'; this.say(`${this.player.name} gets another roll for doubles.`, 'good'); return; }
    this.current = this.nextAlive(this.current); this.turn++; this.doubles = 0; this.phase = this.player.jailed ? 'jailed' : 'ready';
    this.say(`${this.player.name}'s turn.`, 'normal');
  }
  nextAlive(from) { for (let n = 1; n <= this.players.length; n++) { const i = (from + n) % this.players.length; if (!this.players[i].bankrupt) return i; } return from; }
  trade(otherId, giveIndex, receiveIndex, cashDelta = 0) {
    const p = this.player, other = this.players[otherId];
    if (!other || other.bankrupt || p.cash + Math.min(0, cashDelta) < 0 || other.cash - Math.max(0, cashDelta) < 0) return false;
    if (giveIndex != null && this.houses[giveIndex].owner !== p.id) return false;
    if (receiveIndex != null && this.houses[receiveIndex].owner !== other.id) return false;
    if (giveIndex != null) { p.properties = p.properties.filter(i => i !== giveIndex); other.properties.push(giveIndex); this.houses[giveIndex].owner = other.id; }
    if (receiveIndex != null) { other.properties = other.properties.filter(i => i !== receiveIndex); p.properties.push(receiveIndex); this.houses[receiveIndex].owner = p.id; }
    p.cash += cashDelta; other.cash -= cashDelta;
    this.say(`${p.name} and ${other.name} completed a trade.`, 'good'); return true;
  }
  stats(p) { const value = p.properties.reduce((sum, i) => sum + Math.floor(SQUARES[i].price / 2) + this.houses[i].houses * SQUARES[i].houseCost + (this.houses[i].hotel ? SQUARES[i].houseCost : 0), 0); return { properties: p.properties.length, netWorth: p.cash + value }; }
}

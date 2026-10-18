// The bank: loans, a savings account and a market fund. Plain rules over the world; the sheet in ui/sheets.ts draws them.
// Money is borrowed against how far the company has come, and interest runs by the game minute like every other cost.
import type { World } from './world';

/** The bank opens at this tier. */
export const BANK_TIER = 1;
/** Loan interest per game minute, added to what is owed. */
export const LOAN_RATE = 0.01;
/** Savings interest per game minute. */
export const SAVINGS_RATE = 0.004;
/** Share of the proceeds the fund keeps when you sell. */
export const FUND_FEE = 0.02;
const FUND_START = 100;
const FUND_MIN = 30;
const FUND_MAX = 600;
const HISTORY = 90;
/** The economy ticks once a second; rates are per minute. */
const PER_SECOND = 1 / 60;

export interface BankState {
  /** What is owed, interest included. */
  loan: number;
  savings: number;
  /** Fund units held, and what one unit costs now. */
  shares: number;
  price: number;
  /** What was put into the fund and not yet taken out, to show profit. */
  invested: number;
  /** Interest added to the loan since the start. */
  interest: number;
  /** Recent prices, one per few seconds, for the chart. */
  history: number[];
  rng: number;
  /** Interest the savings account has paid since the start. */
  savingsInterest?: number;
  /** Fund profit already taken: what sales brought in, less what that part cost, fee included. */
  realised?: number;
  /** All the cash ever put into the fund. */
  putIn?: number;
  /** Snapshots about every ten seconds, so "today" can be measured. */
  marks?: Mark[];
}

/** A snapshot of the books at one moment. */
export interface Mark {
  tick: number;
  price: number;
  net: number;
  savingsInterest: number;
  loanInterest: number;
}

/** A game "day" for the bank's reports: ten minutes of play. */
export const DAY_TICKS = 6000;

/** How the books have moved over the last day, and over all time, for the bank menu to explain. */
export interface BankReport {
  /** Minutes the "today" numbers really cover (less than a day early on). */
  minutes: number;
  netToday: number;
  netTodayPct: number;
  fundHeld: number;
  fundToday: number;
  fundTodayPct: number;
  fundAllTime: number;
  fundAllTimePct: number;
  savingsToday: number;
  savingsTodayPct: number;
  savingsAllTime: number;
  loanToday: number;
  loanAllTime: number;
  loanPerMinute: number;
  savingsPerMinute: number;
}

/**
 * Real-money purchases need a payment provider and a server that confirms each payment before cash is credited.
 * Until one exists the bank shows the option as closed, and nothing in the game can add money any other way.
 */
export const REAL_MONEY_ENABLED = false;

const next = (b: BankState): number => {
  // mulberry32, kept apart from the world's event stream so the bank never changes how events play out
  b.rng = (b.rng + 0x6d2b79f5) | 0;
  let t = b.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

function walk(b: BankState, tick: number): void {
  // Roughly normal noise, a slow cycle that makes runs of good and bad years, and a pull back toward the middle.
  const z = next(b) + next(b) + next(b) - 1.5;
  const cycle = Math.sin(tick / 3600) * 0.012 + Math.sin(tick / 1300) * 0.006;
  const pull = -0.004 * Math.log(b.price / 160);
  const x = Math.log(b.price) + (0.004 + cycle + pull) * PER_SECOND + 0.07 * z * Math.sqrt(PER_SECOND);
  b.price = Math.min(FUND_MAX, Math.max(FUND_MIN, Math.exp(x)));
}

/** The bank's books, opened on first use with a little price history behind them. */
export function bankOf(world: World): BankState {
  if (world.bank) return world.bank;
  const b: BankState = { loan: 0, savings: 0, shares: 0, price: FUND_START, invested: 0, interest: 0, history: [], rng: (world.seed ^ 0x9e3779b9) | 0 };
  for (let i = 0; i < HISTORY * 4; i++) {
    walk(b, i * 10);
    if (i % 4 === 3) b.history.push(b.price);
  }
  world.bank = b;
  return b;
}

/** How much the bank will lend in all, growing as the company does. */
export function creditLimit(world: World): number {
  return Math.round((2000 + 1500 * world.tier + world.earned * 0.25) / 500) * 500;
}

export function fundValue(world: World): number {
  const b = bankOf(world);
  return b.shares * b.price;
}

/** Everything owned less everything owed, money and bank balances included. */
export function netWorth(world: World): number {
  const b = world.bank;
  return world.money + (b ? b.savings + b.shares * b.price - b.loan : 0);
}

/** Called once a second. Does nothing until the bank has been opened. */
export function stepBank(world: World): void {
  const b = world.bank;
  if (!b) return;
  if (b.loan > 0) {
    const add = b.loan * LOAN_RATE * PER_SECOND;
    b.loan += add;
    b.interest += add;
  }
  const earnedNow = b.savings * SAVINGS_RATE * PER_SECOND;
  b.savings += earnedNow;
  b.savingsInterest = (b.savingsInterest ?? 0) + earnedNow;
  walk(b, world.tick);
  if (world.tick % 100 === 0) {
    const marks = (b.marks ??= []);
    marks.push({ tick: world.tick, price: b.price, net: netWorth(world), savingsInterest: b.savingsInterest ?? 0, loanInterest: b.interest });
    // Keep a day, plus the one mark just before it to measure from.
    while (marks.length > 2 && marks[1].tick <= world.tick - DAY_TICKS) marks.shift();
  }
  if (world.tick % 50 === 0) {
    b.history.push(b.price);
    if (b.history.length > HISTORY) b.history.shift();
  }
}

function open(world: World): string | null {
  return world.tier < BANK_TIER ? `The bank opens at Tier ${BANK_TIER}` : null;
}

const whole = (n: number): number => Math.floor(n + 1e-9);

/** Borrow `amount` (or as much as the limit allows). */
export function borrow(world: World, amount: number): string | null {
  const gate = open(world);
  if (gate) return gate;
  const b = bankOf(world);
  const room = whole(creditLimit(world) - b.loan);
  if (room < 1) return 'Credit limit reached: pay some back first';
  const take = Math.min(amount, room);
  b.loan += take;
  world.money += take;
  return null;
}

/** Pay back `amount` (or whatever is owed, or whatever cash there is). */
export function repay(world: World, amount: number): string | null {
  const b = bankOf(world);
  if (b.loan < 0.5) return 'Nothing owed';
  const pay = Math.min(amount, b.loan, whole(world.money));
  if (pay < 1) return 'No cash to pay with';
  b.loan = b.loan - pay < 0.5 ? 0 : b.loan - pay;
  world.money -= pay;
  return null;
}

export function deposit(world: World, amount: number): string | null {
  const gate = open(world);
  if (gate) return gate;
  const put = Math.min(amount, whole(world.money));
  if (put < 1) return 'No cash to deposit';
  bankOf(world).savings += put;
  world.money -= put;
  return null;
}

export function withdraw(world: World, amount: number): string | null {
  const b = bankOf(world);
  const out = Math.min(amount, whole(b.savings));
  if (out < 1) return 'Nothing in savings';
  b.savings -= out;
  world.money += out;
  return null;
}

/** Buy fund units with `amount` of cash. */
export function invest(world: World, amount: number): string | null {
  const gate = open(world);
  if (gate) return gate;
  const b = bankOf(world);
  const put = Math.min(amount, whole(world.money));
  if (put < 1) return 'No cash to invest';
  b.shares += put / b.price;
  b.invested += put;
  b.putIn = (b.putIn ?? 0) + put;
  world.money -= put;
  return null;
}

/** Sell fund units worth `amount` at today's price, less the fee. */
export function divest(world: World, amount: number): string | null {
  const b = bankOf(world);
  const value = b.shares * b.price;
  if (value < 1) return 'Nothing invested';
  const sell = Math.min(amount, value);
  const frac = sell / value;
  const cost = b.invested * frac;
  b.realised = (b.realised ?? 0) + sell * (1 - FUND_FEE) - cost;
  b.invested = Math.max(0, b.invested * (1 - frac));
  b.shares = sell >= value ? 0 : b.shares - sell / b.price;
  if (b.shares < 1e-9) {
    b.shares = 0;
    b.invested = 0;
  }
  world.money += sell * (1 - FUND_FEE);
  return null;
}

/** Today's and all-time numbers for each account. Safe to call before the bank has any history. */
export function bankReport(world: World): BankReport {
  const b = bankOf(world);
  const marks = b.marks ?? [];
  const ref: Mark = marks[0] ?? { tick: world.tick, price: b.price, net: netWorth(world), savingsInterest: b.savingsInterest ?? 0, loanInterest: b.interest };
  const held = b.shares * b.price;
  const profit = held - b.invested + (b.realised ?? 0);
  const putIn = b.putIn ?? b.invested;
  const savingsToday = (b.savingsInterest ?? 0) - ref.savingsInterest;
  const net = netWorth(world);
  return {
    minutes: Math.max(0, (world.tick - ref.tick) / (60 * 10)),
    netToday: net - ref.net,
    netTodayPct: ref.net > 0 ? (net / ref.net - 1) * 100 : 0,
    fundHeld: held,
    fundToday: b.shares * (b.price - ref.price),
    fundTodayPct: ref.price > 0 ? (b.price / ref.price - 1) * 100 : 0,
    fundAllTime: profit,
    fundAllTimePct: putIn > 0 ? (profit / putIn) * 100 : 0,
    savingsToday,
    savingsTodayPct: b.savings > 0 ? (savingsToday / Math.max(1, b.savings - savingsToday)) * 100 : 0,
    savingsAllTime: b.savingsInterest ?? 0,
    loanToday: b.interest - ref.loanInterest,
    loanAllTime: b.interest,
    loanPerMinute: b.loan * LOAN_RATE,
    savingsPerMinute: b.savings * SAVINGS_RATE,
  };
}

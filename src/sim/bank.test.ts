import { describe, expect, it } from 'vitest';
import { bankOf, borrow, creditLimit, deposit, divest, fundValue, invest, netWorth, repay, stepBank, withdraw } from './bank';
import { createWorld, step } from './world';

const rich = () => {
  const w = createWorld(1);
  w.tier = 1;
  w.money = 10000;
  return w;
};

describe('bank', () => {
  it('stays closed below its tier', () => {
    const w = createWorld(1);
    expect(borrow(w, 1000)).toMatch(/Tier/);
    expect(deposit(w, 1000)).toMatch(/Tier/);
    expect(invest(w, 1000)).toMatch(/Tier/);
  });

  it('lends up to the limit and charges interest that compounds into the debt', () => {
    const w = rich();
    expect(borrow(w, Infinity)).toBeNull();
    const b = bankOf(w);
    expect(b.loan).toBe(creditLimit(w));
    expect(borrow(w, 1000)).toMatch(/limit/);
    const before = b.loan;
    for (let i = 0; i < 600; i++) step(w);
    expect(b.loan).toBeGreaterThan(before);
    expect(b.interest).toBeGreaterThan(0);
  });

  it('repays only what is owed and what cash allows', () => {
    const w = rich();
    borrow(w, 2000);
    w.money = 500;
    expect(repay(w, Infinity)).toBeNull();
    expect(w.money).toBe(0);
    expect(bankOf(w).loan).toBeGreaterThan(1400);
    expect(repay(w, 100)).toMatch(/cash/);
    w.money = 100000;
    repay(w, Infinity);
    expect(bankOf(w).loan).toBe(0);
    expect(repay(w, 10)).toMatch(/owed/i);
  });

  it('pays interest on savings and gives the money back', () => {
    const w = rich();
    deposit(w, 5000);
    expect(w.money).toBe(5000);
    for (let i = 0; i < 600; i++) step(w);
    expect(bankOf(w).savings).toBeGreaterThan(5000);
    const had = Math.floor(bankOf(w).savings);
    withdraw(w, Infinity);
    expect(w.money).toBeGreaterThanOrEqual(5000 + had);
  });

  it('prices the fund with a fee and keeps it in bounds', () => {
    const w = rich();
    invest(w, 4000);
    const b = bankOf(w);
    expect(b.invested).toBe(4000);
    expect(fundValue(w)).toBeCloseTo(4000, 4);
    divest(w, Infinity);
    expect(b.shares).toBe(0);
    expect(w.money).toBeCloseTo(6000 + 4000 * 0.98, 3);
    for (let i = 0; i < 20000; i++) stepBank(w);
    expect(b.price).toBeGreaterThanOrEqual(30);
    expect(b.price).toBeLessThanOrEqual(600);
  });

  it('counts everything in net worth and never mints cash', () => {
    const w = rich();
    const start = netWorth(w);
    borrow(w, 3000);
    deposit(w, 2000);
    invest(w, 1000);
    expect(netWorth(w)).toBeCloseTo(start, 3);
  });
});

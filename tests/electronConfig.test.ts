import { describe, it, expect } from 'vitest';
import { getElectronConfig } from '../src/electronConfig';

function total(cfg: { n: number; l: number; electronCount: number }[]) {
  return cfg.reduce((s, e) => s + e.electronCount, 0);
}

describe('getElectronConfig - basic atoms', () => {
  it('H (Z=1)', () => {
    const cfg = getElectronConfig(1);
    expect(total(cfg)).toBe(1);
  });

  it('He (Z=2)', () => {
    const cfg = getElectronConfig(2);
    expect(total(cfg)).toBe(2);
    const s1 = cfg.find(s => s.n === 1 && s.l === 0);
    expect(s1?.electronCount).toBe(2);
  });

  it('Ne (Z=10)', () => {
    const cfg = getElectronConfig(10);
    expect(total(cfg)).toBe(10);
  });
});

describe('getElectronConfig - known exceptions', () => {
  it('Cr (Z=24) -> 4s1 3d5', () => {
    const cfg = getElectronConfig(24);
    expect(total(cfg)).toBe(24);
    const s4s = cfg.find(s => s.n === 4 && s.l === 0);
    const s3d = cfg.find(s => s.n === 3 && s.l === 2);
    expect(s4s?.electronCount).toBe(1);
    expect(s3d?.electronCount).toBe(5);
  });

  it('Cu (Z=29) -> 4s1 3d10', () => {
    const cfg = getElectronConfig(29);
    expect(total(cfg)).toBe(29);
    const s4s = cfg.find(s => s.n === 4 && s.l === 0);
    const s3d = cfg.find(s => s.n === 3 && s.l === 2);
    expect(s4s?.electronCount).toBe(1);
    expect(s3d?.electronCount).toBe(10);
  });

  it('Pd (Z=46) -> 5s0 4d10', () => {
    const cfg = getElectronConfig(46);
    expect(total(cfg)).toBe(46);
    const s5s = cfg.find(s => s.n === 5 && s.l === 0);
    const s4d = cfg.find(s => s.n === 4 && s.l === 2);
    expect(s5s?.electronCount).toBe(0);
    expect(s4d?.electronCount).toBe(10);
  });

  it('U (Z=92) -> 5f3 6d1 7s2 (as provided)', () => {
    const cfg = getElectronConfig(92);
    expect(total(cfg)).toBe(92);
    const s5f = cfg.find(s => s.n === 5 && s.l === 3);
    const s6d = cfg.find(s => s.n === 6 && s.l === 2);
    const s7s = cfg.find(s => s.n === 7 && s.l === 0);
    expect(s5f?.electronCount).toBe(3);
    expect(s6d?.electronCount).toBe(1);
    expect(s7s?.electronCount).toBe(2);
  });
});

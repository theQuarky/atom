// src/electronConfig.ts

export type Subshell = { n: number; l: number; electronCount: number };

/**
 * Generate all subshells up to maxN (inclusive) and sort by (n + l), then n.
 * This implements the programmatic fill-order generation you specified.
 */
export function generateSubshellOrder(maxN = 8): { n: number; l: number }[] {
  const subshells: { n: number; l: number }[] = [];
  for (let n = 1; n <= maxN; n++) {
    for (let l = 0; l <= n - 1; l++) {
      subshells.push({ n, l });
    }
  }
  subshells.sort((a, b) => {
    const na = a.n + a.l;
    const nb = b.n + b.l;
    if (na !== nb) return na - nb;
    return a.n - b.n;
  });
  return subshells;
}

export function maxElectronsForL(l: number): number {
  return 2 * (2 * l + 1);
}

/**
 * Basic Aufbau filling algorithm using generated subshell order.
 */
export function aufbauFill(z: number, maxN = 8): Subshell[] {
  if (!Number.isInteger(z) || z < 1) throw new Error("z must be positive integer >= 1");
  const order = generateSubshellOrder(maxN);
  let remaining = z;
  const result: Subshell[] = [];
  for (const s of order) {
    if (remaining <= 0) break;
    const max = maxElectronsForL(s.l);
    const take = Math.min(max, remaining);
    result.push({ n: s.n, l: s.l, electronCount: take });
    remaining -= take;
  }
  if (remaining > 0) {
    throw new Error(`Request z=${z} requires maxN=${maxN} too small; remaining=${remaining}`);
  }
  return result;
}

/**
 * Explicit override map for known Aufbau exceptions.
 *
 * Each entry is a list of subshell overrides: set this subshell to this electronCount.
 * The engine computes a standard aufbau config and then applies these overrides.
 *
 * NOTE: you asked for an explicit lookup keyed by Z checked before falling back.
 * We implement the override map so these Z keys always force the final electron counts
 * in the specified subshells (the rest of the subshells come from the aufbau fill).
 *
 * Add or change entries here if you want more exceptions (particularly for actinides).
 */
const EXCEPTION_OVERRIDES: Record<number, { n: number; l: number; electronCount: number }[]> = {
  // Chromium: 4s¹ 3d⁵
  24: [{ n: 4, l: 0, electronCount: 1 }, { n: 3, l: 2, electronCount: 5 }],

  // Copper: 4s¹ 3d¹⁰
  29: [{ n: 4, l: 0, electronCount: 1 }, { n: 3, l: 2, electronCount: 10 }],

  // Niobium: 5s¹ 4d⁴
  41: [{ n: 5, l: 0, electronCount: 1 }, { n: 4, l: 2, electronCount: 4 }],

  // Molybdenum: 5s¹ 4d⁵
  42: [{ n: 5, l: 0, electronCount: 1 }, { n: 4, l: 2, electronCount: 5 }],

  // Ruthenium: 5s¹ 4d⁷
  44: [{ n: 5, l: 0, electronCount: 1 }, { n: 4, l: 2, electronCount: 7 }],

  // Rhodium: 5s¹ 4d⁸
  45: [{ n: 5, l: 0, electronCount: 1 }, { n: 4, l: 2, electronCount: 8 }],

  // Palladium: 5s⁰ 4d¹⁰ (special: empty 5s)
  46: [{ n: 5, l: 0, electronCount: 0 }, { n: 4, l: 2, electronCount: 10 }],

  // Silver: 5s¹ 4d¹⁰
  47: [{ n: 5, l: 0, electronCount: 1 }, { n: 4, l: 2, electronCount: 10 }],

  // Lanthanum: 6s² 5d¹ (5d before 4f)
  57: [{ n: 6, l: 0, electronCount: 2 }, { n: 5, l: 2, electronCount: 1 }],

  // Cerium: 6s² 4f¹ 5d¹
  58: [{ n: 6, l: 0, electronCount: 2 }, { n: 5, l: 3, electronCount: 1 }, { n: 5, l: 2, electronCount: 1 }],

  // Gadolinium: 6s² 4f⁷ 5d¹
  64: [{ n: 6, l: 0, electronCount: 2 }, { n: 5, l: 3, electronCount: 7 }, { n: 5, l: 2, electronCount: 1 }],

  // Platinum: 6s¹ 5d⁹
  78: [{ n: 6, l: 0, electronCount: 1 }, { n: 5, l: 2, electronCount: 9 }],

  // Gold: 6s¹ 5d¹⁰
  79: [{ n: 6, l: 0, electronCount: 1 }, { n: 5, l: 2, electronCount: 10 }],

  // Uranium (example you gave): 5f³ 6d¹ 7s²
  92: [{ n: 5, l: 3, electronCount: 3 }, { n: 6, l: 2, electronCount: 1 }, { n: 7, l: 0, electronCount: 2 }],
};

/**
 * Apply overrides onto an aufbau-filled config.
 * If a subshell is in overrides, set it to the specified electron count.
 * If override mentions a subshell not present in the aufbau list (rare for our maxN),
 * we add it.
 */
function applyOverrides(base: Subshell[], overrides: { n: number; l: number; electronCount: number }[]): Subshell[] {
  const map = new Map<string, Subshell>();
  for (const s of base) {
    map.set(`${s.n},${s.l}`, { ...s });
  }
  for (const o of overrides) {
    map.set(`${o.n},${o.l}`, { n: o.n, l: o.l, electronCount: o.electronCount });
  }
  const result = Array.from(map.values());
  // Sort by n ascending then l ascending for predictable ordering
  result.sort((a, b) => a.n - b.n || a.l - b.l);
  return result;
}

/**
 * Public API: getElectronConfig(z)
 * - builds aufbau config
 * - if z is in EXCEPTION_OVERRIDES, applies overrides (these force final counts)
 * - validates sum equals Z
 */
export function getElectronConfig(z: number, maxN = 8): Subshell[] {
  if (!Number.isInteger(z) || z < 1 || z > 118) {
    throw new Error("z must be integer between 1 and 118 (inclusive)");
  }

  // Start with standard aufbau fill
  const base = aufbauFill(z, maxN);

  // If there's a hard override for this Z, apply it
  if (Object.prototype.hasOwnProperty.call(EXCEPTION_OVERRIDES, z)) {
    const overrides = EXCEPTION_OVERRIDES[z];
    const finalConfig = applyOverrides(base, overrides);

    // Validate total electrons
    const total = finalConfig.reduce((s, e) => s + e.electronCount, 0);
    if (total !== z) {
      throw new Error(`Exception override for Z=${z} produced total ${total}, expected ${z}. Check overrides.`);
    }
    return finalConfig;
  }

  // No override — return the aufbau config
  return base;
}

/* --- Simple ad-hoc tests (can be moved to a test file) --- */
if (require.main === module) {
  const examples = [1, 2, 10, 24, 29, 46, 57, 58, 64, 78, 79, 92];
  for (const z of examples) {
    const cfg = getElectronConfig(z);
    const formatted = cfg
      .map(s => `${s.n}${"spdf"[s.l] || "?"}${s.electronCount}`)
      .join(" ");
    console.log(`Z=${z}: ${formatted} (sum=${cfg.reduce((a, b) => a + b.electronCount, 0)})`);
  }
}

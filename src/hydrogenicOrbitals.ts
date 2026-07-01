const TWO_PI = 2 * Math.PI;

function factorial(n: number): number {
  if (n < 0) throw new Error('factorial: n must be >= 0');
  let result = 1;
  for (let i = 2; i <= n; i += 1) {
    result *= i;
  }
  return result;
}

function doubleFactorial(n: number): number {
  if (n < 0) return 1;
  let result = 1;
  for (let i = n; i > 1; i -= 2) {
    result *= i;
  }
  return result;
}

export function associatedLaguerrePolynomial(k: number, q: number, x: number): number {
  if (k < 0) throw new Error('associatedLaguerrePolynomial: k must be >= 0');
  if (k === 0) return 1;
  if (k === 1) return q + 1 - x;

  let Lkm2 = 1; // L_0^q
  let Lkm1 = q + 1 - x; // L_1^q
  let Lk = 0;

  for (let i = 2; i <= k; i += 1) {
    Lk = ((2 * i - 1 + q - x) * Lkm1 - (i - 1 + q) * Lkm2) / i;
    Lkm2 = Lkm1;
    Lkm1 = Lk;
  }

  return Lk;
}

export function associatedLegendrePolynomial(l: number, m: number, x: number): number {
  if (l < 0) throw new Error('associatedLegendrePolynomial: l must be >= 0');
  const absM = Math.abs(m);
  if (absM > l) return 0;

  const oneMinusX2 = Math.max(0, 1 - x * x);
  let pmm = 1;
  if (absM > 0) {
    const root = Math.sqrt(oneMinusX2);
    for (let i = 1; i <= absM; i += 1) {
      pmm *= -(2 * i - 1) * root;
    }
  }

  if (l === absM) {
    return pmm;
  }

  const pmmp1 = x * (2 * absM + 1) * pmm;
  if (l === absM + 1) {
    return pmmp1;
  }

  let plm2 = pmm;
  let plm1 = pmmp1;
  let plm = 0;

  for (let ll = absM + 2; ll <= l; ll += 1) {
    plm = ((2 * ll - 1) * x * plm1 - (ll + absM - 1) * plm2) / (ll - absM);
    plm2 = plm1;
    plm1 = plm;
  }

  return plm;
}

export function realSphericalHarmonic(l: number, m: number, theta: number, phi: number): number {
  const absM = Math.abs(m);
  const legendre = associatedLegendrePolynomial(l, absM, Math.cos(theta));
  const normalization = Math.sqrt(
    ((2 * l + 1) / (4 * Math.PI)) * (factorial(l - absM) / factorial(l + absM))
  );

  let angularFactor = 1;
  if (m > 0) {
    angularFactor = Math.sqrt(2) * Math.cos(m * phi);
  } else if (m < 0) {
    angularFactor = Math.sqrt(2) * Math.sin(absM * phi);
  }

  return normalization * legendre * angularFactor;
}

export function radialWavefunction(n: number, l: number, r: number): number {
  if (n < 1) throw new Error('radialWavefunction: n must be >= 1');
  if (l < 0 || l >= n) throw new Error('radialWavefunction: l must satisfy 0 <= l < n');
  if (r < 0) throw new Error('radialWavefunction: r must be >= 0');

  const rho = (2 * r) / n;
  const k = n - l - 1;
  const q = 2 * l + 1;
  const laguerre = associatedLaguerrePolynomial(k, q, rho);
  const normalization = Math.sqrt(
    Math.pow(2 / n, 3) * (factorial(k) / (2 * n * factorial(n + l)))
  );

  return normalization * Math.exp(-r / n) * Math.pow(rho, l) * laguerre;
}

export function orbitalProbabilityDensity(
  n: number,
  l: number,
  m: number,
  r: number,
  theta: number,
  phi: number
): number {
  const R = radialWavefunction(n, l, r);
  const Y = realSphericalHarmonic(l, m, theta, phi);
  return R * R * Y * Y * r * r * Math.sin(theta);
}

function estimateMaxDensity(
  n: number,
  l: number,
  m: number,
  rMax: number,
  rSteps = 40,
  thetaSteps = 24,
  phiSteps = 12
): number {
  let maxDensity = 0;
  for (let ir = 0; ir <= rSteps; ir += 1) {
    const r = (ir / rSteps) * rMax;
    for (let ith = 0; ith <= thetaSteps; ith += 1) {
      const theta = (ith / thetaSteps) * Math.PI;
      for (let iph = 0; iph < phiSteps; iph += 1) {
        const phi = (iph / phiSteps) * TWO_PI;
        const density = orbitalProbabilityDensity(n, l, m, r, theta, phi);
        if (density > maxDensity) {
          maxDensity = density;
        }
      }
    }
  }
  return Math.max(maxDensity, 1e-12);
}

export interface OrbitalPoint {
  x: number;
  y: number;
  z: number;
  r: number;
  theta: number;
  phi: number;
  m: number;
}

export interface SampleOptions {
  rMax?: number;
  pMax?: number;
  maxAttemptsPerPoint?: number;
}

export function sampleOrbitalPoints(
  n: number,
  l: number,
  m: number,
  count: number,
  options: SampleOptions = {}
): OrbitalPoint[] {
  if (count < 1) throw new Error('sampleOrbitalPoints: count must be >= 1');

  const rMax = options.rMax ?? 1.8 * n * n + 4;
  const pMax = options.pMax ?? estimateMaxDensity(n, l, m, rMax);
  const maxAttemptsPerPoint = options.maxAttemptsPerPoint ?? 10000;

  const points: OrbitalPoint[] = [];
  let attempts = 0;

  while (points.length < count) {
    if (attempts > count * maxAttemptsPerPoint) {
      throw new Error('sampleOrbitalPoints: too many rejection attempts; consider increasing rMax or pMax');
    }

    const r = Math.random() * rMax;
    const theta = Math.acos(2 * Math.random() - 1);
    const phi = Math.random() * TWO_PI;
    const density = orbitalProbabilityDensity(n, l, m, r, theta, phi);

    if (Math.random() * pMax < density) {
      points.push({
        x: r * Math.sin(theta) * Math.cos(phi),
        y: r * Math.sin(theta) * Math.sin(phi),
        z: r * Math.cos(theta),
        r,
        theta,
        phi,
        m
      });
    }

    attempts += 1;
  }

  return points;
}

export function sampleSubshellPoints(
  n: number,
  l: number,
  electronCount: number,
  count: number,
  options: SampleOptions = {}
): OrbitalPoint[] {
  if (electronCount < 1) throw new Error('sampleSubshellPoints: electronCount must be >= 1');
  const mValues = Array.from({ length: 2 * l + 1 }, (_, index) => index - l);
  const maxPmax = Math.max(
    ...mValues.map(m => estimateMaxDensity(n, l, m, options.rMax ?? 1.8 * n * n + 4))
  );

  const points: OrbitalPoint[] = [];
  const rMax = options.rMax ?? 1.8 * n * n + 4;
  const maxAttemptsPerPoint = options.maxAttemptsPerPoint ?? 10000;
  let attempts = 0;

  while (points.length < count) {
    if (attempts > count * maxAttemptsPerPoint) {
      throw new Error('sampleSubshellPoints: too many rejection attempts; consider increasing rMax or pMax');
    }

    const r = Math.random() * rMax;
    const theta = Math.acos(2 * Math.random() - 1);
    const phi = Math.random() * TWO_PI;
    const m = mValues[Math.floor(Math.random() * mValues.length)];
    const density = orbitalProbabilityDensity(n, l, m, r, theta, phi);

    if (Math.random() * (options.pMax ?? maxPmax) < density) {
      points.push({
        x: r * Math.sin(theta) * Math.cos(phi),
        y: r * Math.sin(theta) * Math.sin(phi),
        z: r * Math.cos(theta),
        r,
        theta,
        phi,
        m
      });
    }

    attempts += 1;
  }

  return points;
}

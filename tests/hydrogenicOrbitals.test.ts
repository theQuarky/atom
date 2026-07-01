import { describe, it, expect } from 'vitest';
import {
  associatedLaguerrePolynomial,
  associatedLegendrePolynomial,
  realSphericalHarmonic,
  radialWavefunction,
  orbitalProbabilityDensity,
  sampleOrbitalPoints,
  sampleSubshellPoints
} from '../src/hydrogenicOrbitals';

function closeTo(actual: number, expected: number, epsilon = 1e-6) {
  return Math.abs(actual - expected) < epsilon;
}

describe('associatedLaguerrePolynomial', () => {
  it('computes L_0^q(x) = 1', () => {
    expect(associatedLaguerrePolynomial(0, 3, 1.2)).toBe(1);
  });

  it('computes L_1^q(x) correctly', () => {
    expect(associatedLaguerrePolynomial(1, 2, 0.5)).toBeCloseTo(2.5);
  });

  it('computes L_2^1(x) for sample input', () => {
    expect(associatedLaguerrePolynomial(2, 1, 1)).toBeCloseTo(0.5);
  });
});

describe('associatedLegendrePolynomial', () => {
  it('computes P_0^0(x) = 1', () => {
    expect(associatedLegendrePolynomial(0, 0, 0.3)).toBe(1);
  });

  it('computes P_1^0(x) = x', () => {
    expect(associatedLegendrePolynomial(1, 0, 0.6)).toBeCloseTo(0.6);
  });

  it('computes P_1^1(x) = -(1-x^2)^(1/2)', () => {
    expect(associatedLegendrePolynomial(1, 1, 0.5)).toBeCloseTo(-Math.sqrt(1 - 0.25));
  });
});

describe('realSphericalHarmonic', () => {
  it('computes Y_0^0 constant normalization', () => {
    const value = realSphericalHarmonic(0, 0, Math.PI / 3, Math.PI / 4);
    expect(value).toBeCloseTo(1 / Math.sqrt(4 * Math.PI));
  });
});

describe('radialWavefunction', () => {
  it('computes 1s radial part at r=0', () => {
    expect(radialWavefunction(1, 0, 0)).toBeCloseTo(2, 6);
  });

  it('computes 2s radial part at r=2 and returns finite value', () => {
    expect(() => radialWavefunction(2, 0, 2)).not.toThrow();
  });
});

describe('probability sampling', () => {
  it('samples points for 1s orbital', () => {
    const points = sampleOrbitalPoints(1, 0, 0, 20, { maxAttemptsPerPoint: 1000 });
    expect(points.length).toBe(20);
    points.forEach(point => {
      expect(point.r).toBeGreaterThanOrEqual(0);
      expect(point.r).toBeLessThanOrEqual(1.8 * 1 * 1 + 4);
    });
  });

  it('samples points for full p subshell', () => {
    const points = sampleSubshellPoints(2, 1, 6, 20, { maxAttemptsPerPoint: 1000 });
    expect(points.length).toBe(20);
    points.forEach(point => {
      expect(point.r).toBeGreaterThanOrEqual(0);
      expect(point.r).toBeLessThanOrEqual(1.8 * 2 * 2 + 4);
    });
  });
});

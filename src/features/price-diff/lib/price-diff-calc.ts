import Decimal from 'decimal.js';

export interface IndexPair {
  base: Decimal; // Io, Ço, Do, etc. (temel endeks)
  current: Decimal; // In, Çn, Dn, etc. (güncel endeks)
}

export interface PriceDiffInput {
  an: Decimal; // hakediş tutarı
  coefficients: {
    a: Decimal; // işçilik
    b: Decimal[]; // b1-b5 malzeme grupları
    c: Decimal; // makine amortismanı
  };
  indices: {
    labor: IndexPair; // a → işçilik
    materials: IndexPair[]; // b1-b5 → malzeme grupları
    machinery: IndexPair; // c → makine
  };
}

export interface PriceDiffResult {
  pn: Decimal;
  f: Decimal; // pozitif = ödeme, negatif = kesinti
  b: Decimal; // 0.90 sabit
}

const B = new Decimal('0.90');

export function calculatePriceDiff(input: PriceDiffInput): PriceDiffResult {
  const { an, coefficients, indices } = input;

  // Pn = a×(In/Io) + b1×(Çn/Ço) + b2×(Dn/Do) + ... + c×(Mn/Mo)
  let pn = new Decimal(0);

  // a × (In/Io)
  if (!indices.labor.base.isZero()) {
    pn = pn.plus(coefficients.a.times(indices.labor.current.div(indices.labor.base)));
  }

  // b1-b5 × (Xn/Xo)
  for (let i = 0; i < coefficients.b.length; i++) {
    const pair = indices.materials[i];
    if (pair && !pair.base.isZero()) {
      pn = pn.plus(coefficients.b[i].times(pair.current.div(pair.base)));
    }
  }

  // c × (Mn/Mo)
  if (!indices.machinery.base.isZero()) {
    pn = pn.plus(coefficients.c.times(indices.machinery.current.div(indices.machinery.base)));
  }

  // F = An × B × (Pn - 1)
  const f = an.times(B).times(pn.minus(1));

  return { pn, f, b: B };
}

export function validateCoefficients(a: Decimal, b: Decimal[], c: Decimal): boolean {
  const sum = a.plus(b.reduce((s, v) => s.plus(v), new Decimal(0))).plus(c);
  return sum.eq(1);
}

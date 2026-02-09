import Decimal from 'decimal.js';

export interface Bid {
  name: string;
  amount: Decimal;
}

export interface BidResult extends Bid {
  status: 'normal' | 'low' | 'excluded';
  tenzilat: Decimal;
}

export interface ThresholdSteps {
  lowerBound: Decimal; // YM × 0.40
  upperBound: Decimal; // YM × 1.20
  validBids: Decimal[]; // %40-%120 arası
  tort1: Decimal;
  stdDev: Decimal;
  sigmaLower: Decimal; // Tort1 − σ
  sigmaUpper: Decimal; // Tort1 + σ
  filteredBids: Decimal[]; // ±1σ arası
  tort2: Decimal;
  c: Decimal;
  k: Decimal;
  n: Decimal;
}

export interface ThresholdResult {
  thresholdValue: Decimal;
  bids: BidResult[];
  steps: ThresholdSteps;
  winner: string | null;
}

export function calculateThreshold(ym: Decimal, n: Decimal, bids: Bid[]): ThresholdResult {
  const lowerBound = ym.times(new Decimal('0.40'));
  const upperBound = ym.times(new Decimal('1.20'));

  // Step 1: Filter bids within %40-%120 range
  const validBids = bids.map((b) => b.amount).filter((a) => a.gte(lowerBound) && a.lte(upperBound));

  // Step 2: Arithmetic mean of valid bids (Tort1)
  const tort1 =
    validBids.length > 0
      ? validBids.reduce((sum, a) => sum.plus(a), new Decimal(0)).div(validBids.length)
      : new Decimal(0);

  // Step 3: Standard deviation (sample, ÷(n-1))
  const stdDev =
    validBids.length > 1
      ? Decimal.sqrt(
          validBids
            .reduce((sum, a) => sum.plus(a.minus(tort1).pow(2)), new Decimal(0))
            .div(validBids.length - 1),
        )
      : new Decimal(0);

  // Step 4: Filter bids within ±1σ of Tort1, calculate Tort2
  const sigmaLower = tort1.minus(stdDev);
  const sigmaUpper = tort1.plus(stdDev);
  const filteredBids = validBids.filter((a) => a.gte(sigmaLower) && a.lte(sigmaUpper));

  const tort2 =
    filteredBids.length > 0
      ? filteredBids.reduce((sum, a) => sum.plus(a), new Decimal(0)).div(filteredBids.length)
      : new Decimal(0);

  // Step 5: C = Tort2 / YM
  const c = ym.isZero() ? new Decimal(0) : tort2.div(ym);

  // Step 6: K
  const threshold060 = new Decimal('0.60');
  const threshold100 = new Decimal('1.00');
  let k: Decimal;
  if (c.lt(threshold060)) {
    k = c;
  } else if (c.lte(threshold100)) {
    // (3.2C - C² - 0.6) / (C + 1)
    k = c.times('3.2').minus(c.pow(2)).minus('0.6').div(c.plus(1));
  } else {
    // (C² - 0.8C + 1.4) / (C + 1)
    k = c.pow(2).minus(c.times('0.8')).plus('1.4').div(c.plus(1));
  }
  const kRounded = k.toDecimalPlaces(3, Decimal.ROUND_DOWN);

  // Step 7: Sınır Değer = K × YM / N
  const thresholdValue = kRounded.times(ym).div(n);

  // Classify bids and calculate tenzilat
  const bidResults: BidResult[] = bids.map((bid) => {
    const tenzilat = ym.isZero() ? new Decimal(0) : ym.minus(bid.amount).div(ym).times(100);

    if (bid.amount.lt(lowerBound) || bid.amount.gt(upperBound)) {
      return { ...bid, status: 'excluded' as const, tenzilat };
    }
    if (bid.amount.lt(thresholdValue)) {
      return { ...bid, status: 'low' as const, tenzilat };
    }
    return { ...bid, status: 'normal' as const, tenzilat };
  });

  // Find winner: lowest bid among 'normal' status bids
  const normalBids = bidResults.filter((b) => b.status === 'normal');
  let winner: string | null = null;
  if (normalBids.length > 0) {
    const lowestNormal = normalBids.reduce((min, b) => (b.amount.lt(min.amount) ? b : min));
    winner = lowestNormal.name;
  }

  return {
    thresholdValue,
    bids: bidResults,
    winner,
    steps: {
      lowerBound,
      upperBound,
      validBids,
      tort1,
      stdDev,
      sigmaLower,
      sigmaUpper,
      filteredBids,
      tort2,
      c,
      k: kRounded,
      n,
    },
  };
}

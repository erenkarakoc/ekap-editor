import Decimal from 'decimal.js';

export interface Bid {
  name: string;
  amount: Decimal;
}

export interface BidResult extends Bid {
  status: 'normal' | 'low' | 'excluded';
}

export interface ThresholdSteps {
  lowerBound: Decimal;   // YM × 0.40
  upperBound: Decimal;   // YM × 1.20
  validBids: Decimal[];  // %40-%120 arası
  tort1: Decimal;
  stdDev: Decimal;
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
}

export function calculateThreshold(
  ym: Decimal,
  n: Decimal,
  bids: Bid[],
): ThresholdResult {
  const lowerBound = ym.times(new Decimal('0.40'));
  const upperBound = ym.times(new Decimal('1.20'));

  // Step 1: Filter bids within %40-%120 range
  const validBids = bids
    .map((b) => b.amount)
    .filter((a) => a.gte(lowerBound) && a.lte(upperBound));

  // Step 2: Arithmetic mean of valid bids (Tort1)
  const tort1 =
    validBids.length > 0
      ? validBids.reduce((sum, a) => sum.plus(a), new Decimal(0)).div(validBids.length)
      : new Decimal(0);

  // Step 3: Standard deviation
  const stdDev =
    validBids.length > 0
      ? Decimal.sqrt(
          validBids
            .reduce((sum, a) => sum.plus(a.minus(tort1).pow(2)), new Decimal(0))
            .div(validBids.length),
        )
      : new Decimal(0);

  // Step 4: Filter bids within ±1σ of Tort1, calculate Tort2
  const sigmaLower = tort1.minus(stdDev);
  const sigmaUpper = tort1.plus(stdDev);
  const filteredBids = validBids.filter(
    (a) => a.gte(sigmaLower) && a.lte(sigmaUpper),
  );

  const tort2 =
    filteredBids.length > 0
      ? filteredBids.reduce((sum, a) => sum.plus(a), new Decimal(0)).div(filteredBids.length)
      : new Decimal(0);

  // Step 5: C = Tort2 / YM
  const c = ym.isZero() ? new Decimal(0) : tort2.div(ym);

  // Step 6: K
  const threshold060 = new Decimal('0.60');
  const threshold040 = new Decimal('0.40');
  const k = c.lt(threshold060) ? c : threshold060.plus(threshold040.times(c));

  // Step 7: Sınır Değer = YM × K × N
  const thresholdValue = ym.times(k).times(n);

  // Classify bids
  const bidResults: BidResult[] = bids.map((bid) => {
    if (bid.amount.lt(lowerBound) || bid.amount.gt(upperBound)) {
      return { ...bid, status: 'excluded' as const };
    }
    if (bid.amount.lt(thresholdValue)) {
      return { ...bid, status: 'low' as const };
    }
    return { ...bid, status: 'normal' as const };
  });

  return {
    thresholdValue,
    bids: bidResults,
    steps: {
      lowerBound,
      upperBound,
      validBids,
      tort1,
      stdDev,
      filteredBids,
      tort2,
      c,
      k,
      n,
    },
  };
}

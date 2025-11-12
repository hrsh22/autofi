export function applyBuffer(amount: bigint, bufferPct: number): bigint {
  if (bufferPct <= 0) return amount;
  const numerator = BigInt(Math.round((1 + bufferPct / 100) * 1_000_000));
  return (amount * numerator) / 1_000_000n;
}

export function bps(amount: bigint, feeBps?: number): bigint {
  if (!feeBps || feeBps <= 0) return amount;
  return amount + (amount * BigInt(feeBps)) / 10_000n;
}

export function estimateRequiredSrc(params: {
  dstAmount: bigint;
  feeBps?: number;
  bufferPct?: number;
}): bigint {
  const withFees = bps(params.dstAmount, params.feeBps);
  return applyBuffer(withFees, params.bufferPct ?? 0);
}

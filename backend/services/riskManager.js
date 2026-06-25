export function calculatePaperPositionSize({
  paperBalance,
  riskPct = 0.01,
  entry,
  stopLoss,
}) {
  if (!paperBalance || !entry || !stopLoss) return 0;

  const riskAmount = paperBalance * riskPct;
  const stopDistance = Math.abs(entry - stopLoss);

  if (stopDistance <= 0) return 0;

  const positionSize = riskAmount / stopDistance;

  return positionSize;
}

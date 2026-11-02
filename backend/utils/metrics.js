function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function ratio(numerator, denominator, digits = 2) {
  const top = toNumber(numerator);
  const bottom = toNumber(denominator);
  if (!bottom) return 0;
  return Number((top / bottom).toFixed(digits));
}

function monthlyAmountCents(amountCents, billingInterval = 'month') {
  const amount = toNumber(amountCents);
  if (billingInterval === 'year') return Math.round(amount / 12);
  if (billingInterval === 'none') return 0;
  return Math.round(amount);
}

function netCents(grossCents, refundCents) {
  return Math.max(0, toNumber(grossCents) - toNumber(refundCents));
}

module.exports = { toNumber, ratio, monthlyAmountCents, netCents };

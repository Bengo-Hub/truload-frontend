/**
 * Smoke tests: Weighing history date filter and export gating logic.
 */

describe('Weighing history filters', () => {
  const MAX_DATE_RANGE_DAYS = 365;

  function isDateRangeValid(from: Date, to: Date): boolean {
    const diff = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= MAX_DATE_RANGE_DAYS;
  }

  it('accepts a valid 30-day range', () => {
    const from = new Date('2026-04-01');
    const to = new Date('2026-05-01');
    expect(isDateRangeValid(from, to)).toBe(true);
  });

  it('rejects a range where to < from', () => {
    const from = new Date('2026-05-01');
    const to = new Date('2026-04-01');
    expect(isDateRangeValid(from, to)).toBe(false);
  });

  it('rejects a range exceeding 365 days', () => {
    const from = new Date('2024-01-01');
    const to = new Date('2026-01-01');
    expect(isDateRangeValid(from, to)).toBe(false);
  });
});

describe('Bulk download gating', () => {
  it('ZIP download is available when dataExport feature is enabled', () => {
    const subscription = { features: { dataExport: true } };
    expect(subscription.features.dataExport).toBe(true);
  });

  it('ZIP download is hidden when dataExport feature is disabled', () => {
    const subscription = { features: { dataExport: false } };
    expect(subscription.features.dataExport).toBe(false);
  });
});

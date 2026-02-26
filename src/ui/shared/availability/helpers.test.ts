import { firstAvailableTab, hasAnyPresentValue, isValuePresent } from '@ui/shared/availability/helpers';

describe('availability helpers', () => {
  it('treats null/undefined/empty string/empty array as missing and 0 as present', () => {
    expect(isValuePresent(null)).toBe(false);
    expect(isValuePresent(undefined)).toBe(false);
    expect(isValuePresent('')).toBe(false);
    expect(isValuePresent('   ')).toBe(false);
    expect(isValuePresent([])).toBe(false);
    expect(isValuePresent(0)).toBe(true);
  });

  it('detects at least one present value in object records', () => {
    expect(hasAnyPresentValue({ a: null, b: '', c: [] })).toBe(false);
    expect(hasAnyPresentValue({ a: null, b: 0 })).toBe(true);
  });

  it('falls back to first available tab and then unknown tab', () => {
    const tabs = [
      { key: 'overview', state: 'missing' as const },
      { key: 'matches', state: 'available' as const },
      { key: 'stats', state: 'unknown' as const },
    ];

    expect(firstAvailableTab(tabs, 'overview')).toBe('matches');
    expect(firstAvailableTab(tabs, 'stats')).toBe('stats');
    expect(firstAvailableTab([{ key: 'a', state: 'unknown' as const }], null)).toBe('a');
  });
});

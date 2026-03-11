import { getMatchStatusLabel } from '@ui/features/matches/utils/getMatchStatusLabel';

const translations: Record<string, string> = {
  'matches:status.upcoming': 'Upcoming',
  'matches:status.finishedShort': 'FT',
  'matches:status.afterExtraTime': 'After extra time',
  'matches:status.afterPenalties': 'After penalties',
  'matches:status.postponed': 'Postponed',
  'matches:status.cancelled': 'Cancelled',
  'matches:status.abandoned': 'Abandoned',
  'matches:status.suspended': 'Suspended',
  'matches:status.interrupted': 'Interrupted',
  'matches:status.awarded': 'Awarded',
  'matches:status.walkover': 'Walkover',
};

function t(key: string): string {
  return translations[key] ?? key;
}

describe('getMatchStatusLabel', () => {
  it('returns live elapsed minute for live fixtures', () => {
    expect(
      getMatchStatusLabel({ short: '1H', long: 'First Half', elapsed: 78 }, t),
    ).toBe("78'");
  });

  it('returns upcoming label for NS fixtures', () => {
    expect(
      getMatchStatusLabel({ short: 'NS', long: 'Not Started', elapsed: null }, t),
    ).toBe('Upcoming');
  });

  it('returns FT for finished fixtures', () => {
    expect(
      getMatchStatusLabel({ short: 'FT', long: 'Match Finished', elapsed: 90 }, t),
    ).toBe('FT');
  });

  it('maps long cancelled statuses to translated labels', () => {
    expect(
      getMatchStatusLabel({ short: '', long: 'Match Cancelled', elapsed: null }, t),
    ).toBe('Cancelled');
  });
});

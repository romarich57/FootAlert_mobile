import {
  safeNavigateEntity,
  sanitizeNumericEntityId,
} from '@ui/app/navigation/routeParams';

describe('routeParams', () => {
  it('accepts strict numeric ids', () => {
    expect(sanitizeNumericEntityId('42')).toBe('42');
    expect(sanitizeNumericEntityId('999999')).toBe('999999');
  });

  it('normalizes finite numeric entity ids during navigation', () => {
    const navigate = jest.fn();
    const navigation = { navigate } as never;

    expect(safeNavigateEntity(navigation, 'MatchDetails', 101)).toBe(true);
    expect(navigate).toHaveBeenCalledWith('MatchDetails', { matchId: '101' });
  });

  it('rejects malformed ids', () => {
    expect(sanitizeNumericEntityId('')).toBeNull();
    expect(sanitizeNumericEntityId('0')).toBeNull();
    expect(sanitizeNumericEntityId('-12')).toBeNull();
    expect(sanitizeNumericEntityId('12abc')).toBeNull();
    expect(sanitizeNumericEntityId('1/2')).toBeNull();
    expect(sanitizeNumericEntityId('abc')).toBeNull();
  });

  it('navigates only when entity ids are valid', () => {
    const navigate = jest.fn();
    const navigation = { navigate } as never;

    expect(
      safeNavigateEntity(navigation, 'TeamDetails', '42'),
    ).toBe(true);
    expect(navigate).toHaveBeenCalledWith('TeamDetails', { teamId: '42' });

    navigate.mockClear();
    expect(
      safeNavigateEntity(navigation, 'PlayerDetails', 'invalid'),
    ).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('keeps optional extra params for competition navigation', () => {
    const navigate = jest.fn();
    const navigation = { navigate } as never;
    const competition = {
      id: '39',
      name: 'Premier League',
      logo: '',
      type: 'League',
      countryName: 'England',
    };

    expect(
      safeNavigateEntity(navigation, 'CompetitionDetails', '39', { competition }),
    ).toBe(true);
    expect(navigate).toHaveBeenCalledWith('CompetitionDetails', {
      competitionId: '39',
      competition,
    });
  });
});

import { getMobileApiEnvOrThrow } from '@data/config/env';
import { buildBffUrl } from '@data/endpoints/bffClient';

jest.mock('@data/config/env', () => ({
  getMobileApiEnvOrThrow: jest.fn(),
}));

const mockedGetMobileApiEnvOrThrow = jest.mocked(getMobileApiEnvOrThrow);

describe('buildBffUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps backward compatibility when base URL already includes /v1', () => {
    mockedGetMobileApiEnvOrThrow.mockReturnValue({
      mobileApiBaseUrl: 'http://localhost:3001/v1',
    } as never);

    expect(buildBffUrl('/search/global')).toBe('http://localhost:3001/v1/search/global');
    expect(buildBffUrl('/v1/search/global')).toBe('http://localhost:3001/v1/search/global');
    expect(buildBffUrl('v1/search/global')).toBe('http://localhost:3001/v1/search/global');
  });

  it('keeps /v1 path when base URL does not include /v1', () => {
    mockedGetMobileApiEnvOrThrow.mockReturnValue({
      mobileApiBaseUrl: 'http://localhost:3001',
    } as never);

    expect(buildBffUrl('/v1/search/global')).toBe('http://localhost:3001/v1/search/global');
    expect(buildBffUrl('/search/global')).toBe('http://localhost:3001/search/global');
  });

  it('appends query string while filtering nullish values', () => {
    mockedGetMobileApiEnvOrThrow.mockReturnValue({
      mobileApiBaseUrl: 'http://localhost:3001/v1',
    } as never);

    expect(
      buildBffUrl('/v1/search/global', {
        q: 'madrid',
        season: 2025,
        limit: 20,
        timezone: 'Europe/Paris',
        ignoredNull: null,
        ignoredUndefined: undefined,
      }),
    ).toBe(
      'http://localhost:3001/v1/search/global?q=madrid&season=2025&limit=20&timezone=Europe%2FParis',
    );
  });
});

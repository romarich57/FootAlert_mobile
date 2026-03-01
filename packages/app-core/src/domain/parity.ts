export type PlatformId = 'mobile' | 'web' | 'desktop';

export type FeatureParitySurface = Record<string, readonly PlatformId[]>;

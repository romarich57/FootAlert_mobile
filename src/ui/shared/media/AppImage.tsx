import { type ComponentProps } from 'react';
import {
  Image as ReactNativeImage,
  type ImageProps,
  type ImageResizeMode,
  type ImageSourcePropType,
} from 'react-native';

type AppImageCachePolicy = 'immutable' | 'web' | 'cacheOnly';

export type AppImageProps = Omit<ImageProps, 'source' | 'resizeMode' | 'defaultSource'> & {
  source: ImageSourcePropType;
  resizeMode?: ImageResizeMode;
  cachePolicy?: AppImageCachePolicy;
  defaultSource?: number;
};

function getSourceIdentitySegment(source: ImageSourcePropType): string {
  if (typeof source === 'number') {
    return `asset:${source}`;
  }

  if (Array.isArray(source)) {
    return source.map(item => getSourceIdentitySegment(item)).join('|');
  }

  if (source && typeof source === 'object' && 'uri' in source) {
    const uri = typeof source.uri === 'string' ? source.uri.trim() : '';
    return uri ? `uri:${uri}` : 'uri:empty';
  }

  return 'source:unknown';
}

export function getAppImageSourceIdentity(source: ImageSourcePropType): string {
  return getSourceIdentitySegment(source);
}

export function AppImage({
  source,
  resizeMode = 'cover',
  cachePolicy: _cachePolicy = 'immutable',
  onError,
  ...rest
}: AppImageProps) {
  const nativeImageProps = rest as ComponentProps<typeof ReactNativeImage>;
  const sourceIdentity = getAppImageSourceIdentity(source);

  return (
    <ReactNativeImage
      key={sourceIdentity}
      {...nativeImageProps}
      source={source}
      resizeMode={resizeMode}
      onError={onError}
    />
  );
}

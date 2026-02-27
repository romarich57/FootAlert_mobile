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

export function AppImage({
  source,
  resizeMode = 'cover',
  cachePolicy: _cachePolicy = 'immutable',
  onError,
  ...rest
}: AppImageProps) {
  const nativeImageProps = rest as ComponentProps<typeof ReactNativeImage>;
  return (
    <ReactNativeImage
      {...nativeImageProps}
      source={source}
      resizeMode={resizeMode}
      onError={onError}
    />
  );
}

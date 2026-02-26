import { useMemo, useState, type ComponentProps } from 'react';
import {
  Image as ReactNativeImage,
  type ImageErrorEventData,
  type ImageProps,
  type ImageResizeMode,
  type ImageSourcePropType,
  type NativeSyntheticEvent,
} from 'react-native';
import FastImage from 'react-native-fast-image';

type AppImageCachePolicy = 'immutable' | 'web' | 'cacheOnly';

export type AppImageProps = Omit<ImageProps, 'source' | 'resizeMode' | 'defaultSource'> & {
  source: ImageSourcePropType;
  resizeMode?: ImageResizeMode;
  cachePolicy?: AppImageCachePolicy;
  defaultSource?: number;
};

function resolveFastImageResizeMode(resizeMode: ImageResizeMode | undefined) {
  if (resizeMode === 'contain') {
    return FastImage.resizeMode.contain;
  }
  if (resizeMode === 'stretch') {
    return FastImage.resizeMode.stretch;
  }
  if (resizeMode === 'center') {
    return FastImage.resizeMode.center;
  }

  return FastImage.resizeMode.cover;
}

function resolveFastImageCachePolicy(cachePolicy: AppImageCachePolicy | undefined) {
  if (cachePolicy === 'web') {
    return FastImage.cacheControl.web;
  }
  if (cachePolicy === 'cacheOnly') {
    return FastImage.cacheControl.cacheOnly;
  }

  return FastImage.cacheControl.immutable;
}

function toFastImageSource(
  source: ImageSourcePropType,
  cachePolicy: AppImageCachePolicy | undefined,
) {
  if (typeof source === 'number') {
    return source;
  }

  if (Array.isArray(source)) {
    return null;
  }

  if (!source?.uri) {
    return null;
  }

  return {
    uri: source.uri,
    headers: source.headers,
    cache: resolveFastImageCachePolicy(cachePolicy),
    priority: FastImage.priority.normal,
  };
}

export function AppImage({
  source,
  resizeMode = 'cover',
  cachePolicy = 'immutable',
  onError,
  ...rest
}: AppImageProps) {
  const [fallbackToNativeImage, setFallbackToNativeImage] = useState(false);
  const fastImageSource = useMemo(
    () => toFastImageSource(source, cachePolicy),
    [cachePolicy, source],
  );
  const fastImageProps = rest as unknown as Omit<
    ComponentProps<typeof FastImage>,
    'source' | 'resizeMode' | 'onError'
  >;

  if (fallbackToNativeImage || fastImageSource === null) {
    return (
      <ReactNativeImage
        {...rest}
        source={source}
        resizeMode={resizeMode}
        onError={onError}
      />
    );
  }

  return (
    <FastImage
      {...fastImageProps}
      source={fastImageSource}
      resizeMode={resolveFastImageResizeMode(resizeMode)}
      onError={() => {
        setFallbackToNativeImage(true);
        onError?.({
          nativeEvent: {
            error: 'react-native-fast-image-error',
          },
        } as NativeSyntheticEvent<ImageErrorEventData>);
      }}
    />
  );
}

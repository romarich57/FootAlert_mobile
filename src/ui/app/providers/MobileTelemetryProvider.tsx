import type { PropsWithChildren } from 'react';
import { useEffect, useMemo } from 'react';
import { AppState } from 'react-native';

import {
  createDefaultMobileTelemetry,
  createNoopMobileTelemetry,
  setMobileTelemetry,
  type MobileTelemetry,
} from '@data/telemetry/mobileTelemetry';

type MobileTelemetryProviderProps = PropsWithChildren<{
  telemetry?: MobileTelemetry;
}>;

export function MobileTelemetryProvider({
  children,
  telemetry,
}: MobileTelemetryProviderProps) {
  const activeTelemetry = useMemo(
    () => telemetry ?? createDefaultMobileTelemetry(),
    [telemetry],
  );

  useEffect(() => {
    setMobileTelemetry(activeTelemetry);
    return () => {
      activeTelemetry.flush('shutdown').catch(() => undefined);
      setMobileTelemetry(createNoopMobileTelemetry());
    };
  }, [activeTelemetry]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', () => {
      activeTelemetry.flush('app_state_change').catch(() => undefined);
    });

    return () => {
      subscription.remove();
    };
  }, [activeTelemetry]);

  useEffect(() => {
    const runtimeGlobal = globalThis as {
      ErrorUtils?: {
        getGlobalHandler?: () => (error: unknown, isFatal?: boolean) => void;
        setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void;
      };
    };

    const getGlobalHandler = runtimeGlobal.ErrorUtils?.getGlobalHandler;
    const setGlobalHandler = runtimeGlobal.ErrorUtils?.setGlobalHandler;

    if (typeof getGlobalHandler !== 'function' || typeof setGlobalHandler !== 'function') {
      return;
    }

    const previousHandler = getGlobalHandler();
    const nextHandler = (error: unknown, isFatal?: boolean) => {
      activeTelemetry.trackError(error, {
        feature: 'runtime',
        details: {
          isFatal: Boolean(isFatal),
        },
      });
      previousHandler(error, isFatal);
    };

    setGlobalHandler(nextHandler);

    return () => {
      setGlobalHandler(previousHandler);
    };
  }, [activeTelemetry]);

  return <>{children}</>;
}

export type AvailabilityState = 'available' | 'missing' | 'unknown';

export type CategoryAvailability = {
  key: string;
  state: AvailabilityState;
};

export type TabAvailability<TTabKey extends string = string> = {
  key: TTabKey;
  state: AvailabilityState;
  categories?: CategoryAvailability[];
};

export type EntityAvailabilitySnapshot<TTabKey extends string = string> = {
  entityId: string;
  state: AvailabilityState;
  tabs: TabAvailability<TTabKey>[];
  hasAnyTab: boolean;
  checkedAt: number;
};

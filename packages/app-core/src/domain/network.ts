export type FlexibleObject = Record<string, unknown>;
export type PagingInfo = {
  current?: number;
  total?: number;
};

export type ListEnvelope<T = FlexibleObject> = {
  response: T[];
};

export type OptionalEnvelope<T = unknown> = {
  response?: T;
};

export type PagedEnvelope<T = FlexibleObject> = {
  response: T[];
  paging?: PagingInfo;
};

import '@shopify/flash-list';

declare module '@shopify/flash-list' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface FlashListProps<TItem> {
    estimatedItemSize?: number;
  }
}

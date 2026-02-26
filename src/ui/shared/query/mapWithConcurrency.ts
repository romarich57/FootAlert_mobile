export async function mapWithConcurrency<TInput, TOutput>(
  items: readonly TInput[],
  concurrency: number,
  mapper: (item: TInput, index: number) => Promise<TOutput>,
): Promise<TOutput[]> {
  if (items.length === 0) {
    return [];
  }

  const normalizedConcurrency =
    typeof concurrency === 'number' && Number.isFinite(concurrency)
      ? Math.floor(concurrency)
      : 1;
  const workerCount = Math.max(1, Math.min(items.length, normalizedConcurrency));
  const results = new Array<TOutput>(items.length);
  let nextIndex = 0;

  const consume = async (): Promise<void> => {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= items.length) {
        return;
      }

      results[currentIndex] = await mapper(items[currentIndex] as TInput, currentIndex);
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => consume()));
  return results;
}

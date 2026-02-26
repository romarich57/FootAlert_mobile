export async function mapWithConcurrency(items, concurrency, worker) {
    if (items.length === 0) {
        return [];
    }
    const boundedConcurrency = Math.max(1, Math.min(concurrency, items.length));
    const results = new Array(items.length);
    let nextIndex = 0;
    const consume = async () => {
        while (true) {
            const currentIndex = nextIndex;
            nextIndex += 1;
            if (currentIndex >= items.length) {
                return;
            }
            results[currentIndex] = await worker(items[currentIndex]);
        }
    };
    await Promise.all(Array.from({ length: boundedConcurrency }, () => consume()));
    return results;
}

type QueueState = {
  active: number;
  waiters: Array<() => void>;
};

const queueStates = new Map<string, QueueState>();

function getQueueState(key: string): QueueState {
  let state = queueStates.get(key);
  if (!state) {
    state = { active: 0, waiters: [] };
    queueStates.set(key, state);
  }

  return state;
}

async function acquireSlot(queueKey: string, concurrency: number): Promise<void> {
  const state = getQueueState(queueKey);

  if (state.active < concurrency) {
    state.active += 1;
    return;
  }

  await new Promise<void>(resolve => {
    state.waiters.push(resolve);
  });

  state.active += 1;
}

function releaseSlot(queueKey: string): void {
  const state = getQueueState(queueKey);
  state.active = Math.max(0, state.active - 1);

  const next = state.waiters.shift();
  if (next) {
    next();
    return;
  }

  if (state.active === 0) {
    queueStates.delete(queueKey);
  }
}

export async function runProbeTask<T>({
  queueKey,
  concurrency,
  task,
}: {
  queueKey: string;
  concurrency: number;
  task: () => Promise<T>;
}): Promise<T> {
  await acquireSlot(queueKey, Math.max(1, Math.floor(concurrency)));

  try {
    return await task();
  } finally {
    releaseSlot(queueKey);
  }
}

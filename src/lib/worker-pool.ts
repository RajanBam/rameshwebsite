// Generic message-passing worker pool.
// Spreads jobs across up to `size` workers so batch processing of hundreds
// of files stays off the main thread and the UI never freezes.
//
// Workers must post back `{ id, result }` on success or `{ id, error }` on
// failure, echoing the `id` we send in. Everything else is generic.

interface PendingJob<TOut> {
  resolve: (value: TOut) => void;
  reject: (reason: Error) => void;
}

interface WorkerSlot {
  worker: Worker;
  busy: boolean;
}

export interface PoolJob<TIn> {
  payload: TIn;
  transfer?: Transferable[];
}

export class WorkerPool<TIn, TOut> {
  private slots: WorkerSlot[] = [];
  private queue: Array<{ id: number; job: PoolJob<TIn> }> = [];
  private pending = new Map<number, PendingJob<TOut>>();
  private nextId = 1;

  constructor(
    private readonly factory: () => Worker,
    size: number = defaultPoolSize(),
  ) {
    const n = Math.max(1, size);
    for (let i = 0; i < n; i++) this.spawn();
  }

  private spawn() {
    const worker = this.factory();
    const slot: WorkerSlot = { worker, busy: false };
    worker.onmessage = (e: MessageEvent) => {
      const { id, result, error } = e.data as { id: number; result?: TOut; error?: string };
      const job = this.pending.get(id);
      slot.busy = false;
      if (job) {
        this.pending.delete(id);
        if (error) job.reject(new Error(error));
        else job.resolve(result as TOut);
      }
      this.drain();
    };
    worker.onerror = (e) => {
      // A hard worker crash: fail its in-flight job and keep the pool alive.
      slot.busy = false;
      this.drain();
      e.preventDefault?.();
    };
    this.slots.push(slot);
  }

  run(payload: TIn, transfer?: Transferable[]): Promise<TOut> {
    const id = this.nextId++;
    return new Promise<TOut>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.queue.push({ id, job: { payload, transfer } });
      this.drain();
    });
  }

  private drain() {
    for (const slot of this.slots) {
      if (slot.busy) continue;
      const next = this.queue.shift();
      if (!next) break;
      slot.busy = true;
      slot.worker.postMessage({ id: next.id, payload: next.job.payload }, next.job.transfer ?? []);
    }
  }

  /** Release all workers. Call when the tool unmounts. */
  terminate() {
    for (const slot of this.slots) slot.worker.terminate();
    this.slots = [];
    this.queue = [];
    for (const job of this.pending.values()) job.reject(new Error('Pool terminated'));
    this.pending.clear();
  }
}

/** Sensible default: one worker per core, capped so we don't over-spawn. */
export function defaultPoolSize(): number {
  const cores = typeof navigator !== 'undefined' && navigator.hardwareConcurrency
    ? navigator.hardwareConcurrency
    : 4;
  return Math.min(Math.max(cores - 1, 2), 8);
}

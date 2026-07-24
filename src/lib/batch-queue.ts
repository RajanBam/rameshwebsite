// Batch queue — orchestration + observable UI state for any batch tool.
// Holds a list of items, runs them through a caller-supplied async worker
// with bounded concurrency, and notifies subscribers on every change so
// Preact islands can render live progress.

export type ItemStatus = 'pending' | 'processing' | 'done' | 'error';

export interface QueueItem<TResult> {
  id: string;
  file: File;
  status: ItemStatus;
  result?: TResult;
  error?: string;
}

export type Processor<TResult> = (item: QueueItem<TResult>) => Promise<TResult>;
type Listener = () => void;

export class BatchQueue<TResult> {
  private items: QueueItem<TResult>[] = [];
  private listeners = new Set<Listener>();
  private running = false;

  constructor(
    private readonly processor: Processor<TResult>,
    private readonly concurrency: number = 4,
  ) {}

  // ---- state access ----
  getItems(): ReadonlyArray<QueueItem<TResult>> {
    return this.items;
  }

  get isRunning() {
    return this.running;
  }

  get stats() {
    let done = 0, error = 0, pending = 0, processing = 0;
    for (const it of this.items) {
      if (it.status === 'done') done++;
      else if (it.status === 'error') error++;
      else if (it.status === 'processing') processing++;
      else pending++;
    }
    return { total: this.items.length, done, error, pending, processing };
  }

  // ---- subscription (for Preact useSyncExternalStore / manual) ----
  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    for (const fn of this.listeners) fn();
  }

  // ---- mutation ----
  add(files: File[]) {
    for (const file of files) {
      this.items.push({
        id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
        file,
        status: 'pending',
      });
    }
    this.emit();
  }

  remove(id: string) {
    this.items = this.items.filter((it) => it.id !== id);
    this.emit();
  }

  clear() {
    this.items = [];
    this.emit();
  }

  /** Process all pending items, `concurrency` at a time. Resolves when done. */
  async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.emit();

    const queue = this.items.filter((it) => it.status === 'pending');
    let cursor = 0;

    const worker = async (): Promise<void> => {
      while (cursor < queue.length) {
        const item = queue[cursor++];
        item.status = 'processing';
        this.emit();
        try {
          item.result = await this.processor(item);
          item.status = 'done';
        } catch (err) {
          item.status = 'error';
          item.error = err instanceof Error ? err.message : String(err);
        }
        this.emit();
      }
    };

    const lanes = Math.min(this.concurrency, Math.max(1, queue.length));
    await Promise.all(Array.from({ length: lanes }, () => worker()));

    this.running = false;
    this.emit();
  }
}

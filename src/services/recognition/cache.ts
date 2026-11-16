/** Per-account bounded memory cache. A cancelled subscriber cannot consume a late result. */
export class RecognitionCache<T> {
  private results = new Map<string, T>();
  private pending = new Map<string, { controller: AbortController; subscribers: Set<symbol>; promise: Promise<T> }>();
  constructor(private capacity = 32) {}
  clear() {
    for (const item of this.pending.values()) item.controller.abort();
    this.pending.clear();
    this.results.clear();
  }
  async get(key: string, signal: AbortSignal, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
    if (signal.aborted) throw new Error('Recognition cancelled.');
    if (this.results.has(key)) return this.results.get(key)!;
    let item = this.pending.get(key);
    if (!item) {
      const controller = new AbortController();
      item = { controller, subscribers: new Set(), promise: Promise.resolve(undefined as T) };
      const current = item;
      item.promise = Promise.resolve().then(() => run(controller.signal)).then(value => {
        if (!controller.signal.aborted) {
          this.results.set(key, value);
          while (this.results.size > this.capacity) this.results.delete(this.results.keys().next().value!);
        }
        return value;
      }).finally(() => { if (this.pending.get(key) === current) this.pending.delete(key); });
      this.pending.set(key, item);
    }
    const token = Symbol();
    item.subscribers.add(token);
    const current = item;
    return new Promise<T>((resolve, reject) => {
      const release = () => {
        current.subscribers.delete(token);
        signal.removeEventListener('abort', abort);
      };
      const abort = () => {
        release();
        if (!current.subscribers.size) {
          current.controller.abort();
          if (this.pending.get(key) === current) this.pending.delete(key);
        }
        reject(new Error('Recognition cancelled.'));
      };
      signal.addEventListener('abort', abort, { once: true });
      current.promise.then(value => { release(); if (!signal.aborted) resolve(value); }, error => { release(); reject(error); });
    });
  }
}

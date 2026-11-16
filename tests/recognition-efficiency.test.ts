import test from 'node:test';
import assert from 'node:assert/strict';
import { RecognitionCache } from '../src/services/recognition/cache';
import { inkBounds } from '../src/features/practice/ink';
import { summarizeBenchmark } from '../src/services/recognition/benchmark';
test('bounds include superscripts and denominators with padding', () => {
  assert.deepEqual(inkBounds({ width: 1000, height: 400, strokes: [[[100, 20, 0], [300, 350, 2]]] }), { x: 76, y: 0, width: 248, height: 374 });
});
test('deduplicates subscribers, preserves active subscriber and isolates accounts', async () => {
  const cache = new RecognitionCache<number>(2); let calls = 0;
  let finish!: (value: number) => void;
  const run = () => { calls++; return new Promise<number>(r => { finish = r; }); };
  const first = new AbortController(), second = new AbortController();
  const a = cache.get('account-a:ink:v1', first.signal, run);
  const b = cache.get('account-a:ink:v1', second.signal, run);
  first.abort(); await assert.rejects(a); await Promise.resolve(); finish(42);
  assert.equal(await b, 42); assert.equal(calls, 1);
  assert.equal(await cache.get('account-a:ink:v1', second.signal, async () => 99), 42);
  assert.equal(await cache.get('account-b:ink:v1', second.signal, async () => 99), 99);
});
test('reports failures in accuracy, and latency percentiles separately', () => {
  const base = { sampleId: 'one', truth: 'x', prediction: 'x', provider: 'fixture', model: 'fixture' };
  assert.deepEqual(summarizeBenchmark([{ ...base, durationMs: 100 }, { ...base, sampleId: 'two', durationMs: 500, failed: true }]), { samples: 2, accuracy: .5, failureRate: .5, p50Ms: 100, p95Ms: 100 });
});

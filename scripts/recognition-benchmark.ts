import { readFileSync } from 'node:fs';
import { summarizeBenchmark, type BenchmarkRecord } from '../src/services/recognition/benchmark';
const path = process.argv[2];
if (!path) throw new Error('Usage: npx tsx scripts/recognition-benchmark.ts records.jsonl');
const rows: BenchmarkRecord[] = readFileSync(path, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
for (const row of rows) if (!row.sampleId || !Number.isFinite(row.durationMs) || row.durationMs < 0 || typeof row.truth !== 'string' || typeof row.prediction !== 'string') throw new Error('Invalid benchmark record');
for (const key of new Set(rows.map(r => `${r.provider}/${r.model}`))) console.log(key, JSON.stringify(summarizeBenchmark(rows.filter(r => `${r.provider}/${r.model}` === key))));

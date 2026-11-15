import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { MIGRATIONS } from "../src/db/schema";
test("SQLite migration preserves cards and history and enforces unique events", () => {
  const result = execFileSync(
    "python3",
    [
      "-c",
      `
import sqlite3,json,sys
m=json.load(sys.stdin)
db=sqlite3.connect(':memory:')
db.execute('PRAGMA foreign_keys=ON')
db.executescript(m['1'])
db.execute("INSERT INTO decks(id,title,created_at,updated_at) VALUES('d','Stats','t','t')")
db.execute("INSERT INTO cards(id,deck_id,term,definition,created_at,updated_at) VALUES('c','d','Half','0.5','t','t')")
db.execute("INSERT INTO test_attempts(id,deck_id,deck_title,total_questions,correct_answers,objective_correct,objective_total,score_percent,started_at,finished_at) VALUES('a','d','Stats',0,0,0,0,0,'t','t')")
db.executescript(m['2'])
db.executescript(m['3'])
assert db.execute("SELECT term,grading_mode,numeric_tolerance FROM cards WHERE id='c'").fetchone()==('Half','self_review',0.001)
assert db.execute('SELECT count(*) FROM test_attempts').fetchone()[0]==1
row=('r','c','d','correct','2026-11-16T00:00:00Z','2026-11-16','Asia/Manila',1,1,'automatic')
db.execute('INSERT INTO review_events VALUES(?,?,?,?,?,?,?,?,?,?)',row)
db.commit()
try:
 with db:
  db.execute("UPDATE cards SET term='Changed' WHERE id='c'")
  db.execute('INSERT INTO review_events VALUES(?,?,?,?,?,?,?,?,?,?)',row)
except sqlite3.IntegrityError: pass
else: raise AssertionError('Duplicate event accepted')
assert db.execute("SELECT term FROM cards WHERE id='c'").fetchone()[0]=='Half'
print('SQLite checks passed')
`,
    ],
    { input: JSON.stringify(MIGRATIONS), encoding: "utf8" },
  );
  assert.match(result, /SQLite checks passed/);
});

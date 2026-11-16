\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id) VALUES ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
DO $$
DECLARE a jsonb; b jsonb; c jsonb; n integer;
BEGIN
 a:=public.push_study_operation(auth.uid(),'{"id":"op1","entityId":"deck1","kind":"deck","baseVersion":0,"payload":{"title":"device A"},"deleted":false}');
 b:=public.push_study_operation(auth.uid(),'{"id":"op1","entityId":"deck1","kind":"deck","baseVersion":0,"payload":{"title":"device A"},"deleted":false}');
 IF a<>b OR (a->'entity'->>'version')::int<>1 THEN RAISE EXCEPTION 'retry is not idempotent'; END IF;
 c:=public.push_study_operation(auth.uid(),'{"id":"op2","entityId":"deck1","kind":"deck","baseVersion":0,"payload":{"title":"concurrent device"},"deleted":false}');
 IF NOT (c->>'conflict')::boolean OR c->'entity'->'payload'->>'title'<>'device A' THEN RAISE EXCEPTION 'lost conflicting edit'; END IF;
 c:=public.push_study_operation(auth.uid(),'{"id":"op3","entityId":"deck1","kind":"deck","baseVersion":1,"payload":null,"deleted":true}');
 IF NOT (c->'entity'->>'deleted')::boolean THEN RAISE EXCEPTION 'missing tombstone'; END IF;
 c:=public.push_study_operation(auth.uid(),'{"id":"op4","entityId":"deck1","kind":"deck","baseVersion":0,"payload":{"title":"resurrection"},"deleted":false}');
 IF NOT (c->>'conflict')::boolean THEN RAISE EXCEPTION 'stale client resurrected deletion'; END IF;
 a:=public.push_study_operation(auth.uid(),'{"id":"r1","entityId":"review1","kind":"review","baseVersion":0,"payload":{"result":"correct"}}');
 b:=public.push_study_operation(auth.uid(),'{"id":"r2","entityId":"review1","kind":"review","baseVersion":0,"payload":{"result":"correct"}}');
 IF (b->>'conflict')::boolean OR (b->'entity'->>'version')::int<>1 THEN RAISE EXCEPTION 'duplicate review'; END IF;
 b:=public.push_study_operation(auth.uid(),'{"id":"r3","entityId":"review1","kind":"review","baseVersion":1,"payload":{"result":"incorrect"}}');
 IF NOT (b->>'conflict')::boolean THEN RAISE EXCEPTION 'review mutated'; END IF;
 a:=public.push_study_operation(auth.uid(),'{"id":"ink1","entityId":"ink1","kind":"ink","baseVersion":0,"payload":{"strokes":[[12345]]}}');
 PERFORM public.delete_study_ink(auth.uid());
 IF EXISTS(SELECT 1 FROM public.study_entities WHERE kind='ink' AND NOT deleted) OR EXISTS(SELECT 1 FROM public.study_operation_receipts WHERE response::text LIKE '%12345%') THEN RAISE EXCEPTION 'ink deletion retained cloud data'; END IF;
 IF public.delete_study_ink(auth.uid())<>0 THEN RAISE EXCEPTION 'ink deletion is not idempotent'; END IF;
 a:=public.pull_study_changes(auth.uid(),0,1);
 IF jsonb_array_length(a->'changes')<>1 OR NOT (a->>'more')::boolean THEN RAISE EXCEPTION 'pagination failed'; END IF;
 b:=public.pull_study_changes(auth.uid(),(a->>'cursor')::bigint,200);
 IF jsonb_array_length(b->'changes')<>2 THEN RAISE EXCEPTION 'cursor lost changes'; END IF;
 BEGIN
  PERFORM public.pull_study_changes('00000000-0000-0000-0000-000000000002',0,200);
  RAISE EXCEPTION 'cross-owner pull succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.push_study_operation('00000000-0000-0000-0000-000000000002','{}');
  RAISE EXCEPTION 'cross-owner push succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.study_entities) OR EXISTS (SELECT 1 FROM public.study_operation_receipts) THEN RAISE EXCEPTION 'RLS leaks another account'; END IF;
END $$;
ROLLBACK;

BEGIN;
-- Additive local-first protocol. Existing study tables remain intact.
CREATE SEQUENCE IF NOT EXISTS public.study_change_cursor;
CREATE TABLE IF NOT EXISTS public.study_entities (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('deck','session','test','attempt','review','ink','baseline','marker')),
  id text NOT NULL CHECK (length(id) BETWEEN 1 AND 200),
  payload jsonb,
  version bigint NOT NULL DEFAULT 1,
  deleted boolean NOT NULL DEFAULT false,
  cursor bigint NOT NULL DEFAULT nextval('public.study_change_cursor'),
  PRIMARY KEY(user_id,kind,id)
);
CREATE INDEX IF NOT EXISTS study_entities_cursor ON public.study_entities(user_id,cursor);
CREATE TABLE IF NOT EXISTS public.study_operation_receipts (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id text NOT NULL,
  response jsonb NOT NULL,
  PRIMARY KEY(user_id,id)
);
ALTER TABLE public.study_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_operation_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS study_entities_owner ON public.study_entities;
CREATE POLICY study_entities_owner ON public.study_entities FOR SELECT TO authenticated USING (user_id=auth.uid());
DROP POLICY IF EXISTS study_receipts_owner ON public.study_operation_receipts;
CREATE POLICY study_receipts_owner ON public.study_operation_receipts FOR SELECT TO authenticated USING (user_id=auth.uid());
REVOKE ALL ON public.study_entities,public.study_operation_receipts FROM anon,authenticated;
GRANT SELECT ON public.study_entities,public.study_operation_receipts TO authenticated;
CREATE OR REPLACE FUNCTION public.push_study_operation(p_account uuid,p_operation jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  owner_id uuid := auth.uid();
  existing public.study_entities%ROWTYPE;
  answer jsonb;
  op_id text := p_operation->>'id';
  entity_id text := p_operation->>'entityId';
  entity_kind text := p_operation->>'kind';
  base_version bigint := (p_operation->>'baseVersion')::bigint;
  removed boolean := COALESCE((p_operation->>'deleted')::boolean,false);
BEGIN
  IF owner_id IS NULL OR owner_id IS DISTINCT FROM p_account THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
  IF op_id IS NULL OR length(op_id) NOT BETWEEN 1 AND 200 OR entity_id IS NULL OR length(entity_id) NOT BETWEEN 1 AND 200 OR entity_kind IS NULL OR entity_kind NOT IN ('deck','session','test','attempt','review','ink','baseline','marker') OR base_version IS NULL OR base_version < 0 OR octet_length(p_operation::text)>2000000 THEN RAISE EXCEPTION 'Invalid operation'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(owner_id::text,77));
  SELECT response INTO answer FROM public.study_operation_receipts WHERE user_id=owner_id AND id=op_id;
  IF FOUND THEN RETURN answer; END IF;
  SELECT * INTO existing FROM public.study_entities WHERE user_id=owner_id AND kind=entity_kind AND id=entity_id;
  IF (existing.version IS NOT NULL AND entity_kind='review') THEN
    -- Immutable events: identical retries are safe; different payloads require resolution.
    answer := jsonb_build_object('conflict',existing.payload IS DISTINCT FROM (p_operation->'payload') OR removed,
      'entity',jsonb_build_object('key',entity_kind||':'||entity_id,'kind',entity_kind,'id',entity_id,'payload',existing.payload,'version',existing.version,'deleted',existing.deleted));
  ELSIF existing.version IS NOT NULL AND existing.payload IS NOT DISTINCT FROM (p_operation->'payload') AND existing.deleted=removed THEN
    answer := jsonb_build_object('conflict',false,'entity',jsonb_build_object('key',entity_kind||':'||entity_id,'kind',entity_kind,'id',entity_id,'payload',existing.payload,'version',existing.version,'deleted',existing.deleted));
  ELSIF COALESCE(existing.version,0)<>base_version THEN
    answer := jsonb_build_object('conflict',true,'entity',jsonb_build_object('key',entity_kind||':'||entity_id,'kind',entity_kind,'id',entity_id,'payload',existing.payload,'version',COALESCE(existing.version,0),'deleted',COALESCE(existing.deleted,false)));
  ELSE
    INSERT INTO public.study_entities(user_id,kind,id,payload,version,deleted)
    VALUES(owner_id,entity_kind,entity_id,p_operation->'payload',base_version+1,removed)
    ON CONFLICT(user_id,kind,id) DO UPDATE SET payload=EXCLUDED.payload,version=EXCLUDED.version,deleted=EXCLUDED.deleted,cursor=nextval('public.study_change_cursor') RETURNING * INTO existing;
    answer := jsonb_build_object('conflict',false,'entity',jsonb_build_object('key',entity_kind||':'||entity_id,'kind',entity_kind,'id',entity_id,'payload',existing.payload,'version',existing.version,'deleted',existing.deleted));
  END IF;
  INSERT INTO public.study_operation_receipts(user_id,id,response) VALUES(owner_id,op_id,answer);
  RETURN answer;
END $$;
CREATE OR REPLACE FUNCTION public.pull_study_changes(p_account uuid,p_cursor bigint DEFAULT 0,p_limit integer DEFAULT 200) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE owner_id uuid:=auth.uid(); changes jsonb; last_cursor bigint; high_cursor bigint; count_rows integer;
BEGIN
  IF owner_id IS NULL OR owner_id IS DISTINCT FROM p_account THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
  IF p_limit NOT BETWEEN 1 AND 500 OR p_cursor<0 THEN RAISE EXCEPTION 'Invalid page'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(owner_id::text,77));
  SELECT COALESCE(max(cursor),p_cursor) INTO high_cursor FROM public.study_entities WHERE user_id=owner_id;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('key',kind||':'||id,'kind',kind,'id',id,'payload',payload,'version',version,'deleted',deleted) ORDER BY cursor),'[]'::jsonb),max(cursor),count(*) INTO changes,last_cursor,count_rows
  FROM (SELECT * FROM public.study_entities WHERE user_id=owner_id AND cursor>p_cursor ORDER BY cursor LIMIT p_limit) page;
  RETURN jsonb_build_object('changes',changes,'cursor',CASE WHEN count_rows=p_limit THEN last_cursor ELSE greatest(high_cursor,p_cursor) END,'more',count_rows=p_limit);
END $$;
REVOKE ALL ON FUNCTION public.push_study_operation(uuid,jsonb),public.pull_study_changes(uuid,bigint,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.push_study_operation(uuid,jsonb),public.pull_study_changes(uuid,bigint,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_study_ink(p_account uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE owner_id uuid:=auth.uid(); removed_count integer;
BEGIN
  IF owner_id IS NULL OR owner_id IS DISTINCT FROM p_account THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(owner_id::text,77));
  UPDATE public.study_entities SET payload='null'::jsonb,deleted=true,version=version+1,cursor=nextval('public.study_change_cursor')
    WHERE user_id=owner_id AND kind='ink' AND (NOT deleted OR payload IS DISTINCT FROM 'null'::jsonb);
  GET DIAGNOSTICS removed_count=ROW_COUNT;
  -- Idempotency receipts must not retain deleted raw handwriting either.
  UPDATE public.study_operation_receipts r SET response=jsonb_build_object('conflict',false,'entity',jsonb_build_object('key','ink:'||e.id,'kind','ink','id',e.id,'payload',NULL,'version',e.version,'deleted',true))
    FROM public.study_entities e WHERE r.user_id=owner_id AND e.user_id=owner_id AND e.kind='ink' AND r.response->'entity'->>'kind'='ink' AND r.response->'entity'->>'id'=e.id;
  RETURN removed_count;
END $$;
REVOKE ALL ON FUNCTION public.delete_study_ink(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.delete_study_ink(uuid) TO authenticated;

COMMIT;

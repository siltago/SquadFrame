CREATE OR REPLACE FUNCTION debug_exec(sql text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result jsonb;
BEGIN
  EXECUTE 'SELECT jsonb_agg(t) FROM (' || sql || ') t' INTO result;
  RETURN result;
END;
$$;
GRANT EXECUTE ON FUNCTION debug_exec(text) TO service_role;

CREATE OR REPLACE FUNCTION debug_exec_void(sql text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  EXECUTE sql;
END;
$$;
GRANT EXECUTE ON FUNCTION debug_exec_void(text) TO service_role;

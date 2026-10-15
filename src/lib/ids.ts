const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Route params reach Postgres as uuid; a malformed one would be a 500, not a 404. */
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v);

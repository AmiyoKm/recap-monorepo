export function deferD1Database(read: () => D1Database): D1Database {
  return {
    prepare: (query) => read().prepare(query),
    batch: <T>(statements: D1PreparedStatement[]) => read().batch<T>(statements),
    exec: (query) => read().exec(query),
    withSession: (constraintOrBookmark) => read().withSession(constraintOrBookmark),
    dump: () => read().dump(),
  };
}

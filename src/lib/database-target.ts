const familyTables = new Set(["members", "candidates", "votes", "settings"]);

/** Keep unrelated external tables untouched while retaining the application's row types. */
export function familyRequestUrl(input: string, external: boolean): string {
  const url = new URL(input);
  const table = url.pathname.match(/^\/rest\/v1\/([^/]+)$/)?.[1];
  if (external && table && familyTables.has(table)) {
    url.pathname = `/rest/v1/bakri_${table}`;
  }
  return url.toString();
}
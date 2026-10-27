export function normName(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي").replace(/[\u064B-\u0652\u0670]/g, "").replace(/ـ/g, "")
    .replace(/^(الحاج|الحاجة|المرحوم|المرحومة)\s+/, "");
}

type Linkable = { id: string; full_name: string; father_name: string | null; status?: string };

function shortenedMatch(a: string, b: string) {
  const short = a.split(" ");
  const long = b.split(" ");
  return short.length === 3 && long.length === 4 &&
    short[0] === long[0] && short[1] === long[1] && short[2] === long[3];
}

/** Only unique matches are accepted; never guess between similarly named relatives. */
export function resolveParents<T extends Linkable>(rows: T[]) {
  const approved = rows.filter((m) => !m.status || m.status === "approved");
  const names = new Map(approved.map((m) => [m.id, normName(m.full_name)]));
  const parents = new Map<string, string | null>();
  for (const member of rows) {
    const father = normName(member.father_name);
    const candidates = approved.filter((m) => m.id !== member.id);
    const exact = father ? candidates.filter((m) => names.get(m.id) === father) : [];
    const compatible = exact.length ? exact : father ? candidates.filter((m) => {
      const name = names.get(m.id) ?? "";
      return shortenedMatch(father, name) || shortenedMatch(name, father);
    }) : [];
    parents.set(member.id, compatible.length === 1 ? compatible[0]?.id ?? null : null);
  }
  // Break every edge participating in a cycle, not just the first visited edge.
  const cyclic = new Set<string>();
  for (const row of rows) {
    const path: string[] = [];
    let current: string | null = row.id;
    while (current) {
      const repeated = path.indexOf(current);
      if (repeated >= 0) { path.slice(repeated).forEach((id) => cyclic.add(id)); break; }
      path.push(current);
      current = parents.get(current) ?? null;
    }
  }
  cyclic.forEach((id) => parents.set(id, null));
  return parents;
}

export function elderRepeatCount(count: number, width: number, itemWidth = 172) {
  return count >= 3 ? Math.max(1, Math.ceil(width / (count * itemWidth))) : 1;
}
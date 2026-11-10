// Bound the first paint payload; older or large responses retain the lazy batch path.
export function initialDisplay(store, session, runs, maxBytes = 65536) {
  const result = [];
  let bytes = 2;
  for (const meta of runs.slice(0, 8)) {
    const run = store.displayRuns(session, [meta.id])[0];
    if (!run) continue;
    const size = Buffer.byteLength(JSON.stringify(run)) + 1;
    if (bytes + size > maxBytes) continue;
    result.push(run); bytes += size;
  }
  return result;
}

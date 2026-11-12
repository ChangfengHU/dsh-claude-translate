/** Translation follows the actual execution route, never a stale session toggle. */
export function translationPolicy(provider, targets) {
  const required = typeof provider === 'string' && targets.includes(provider);
  return { provider: provider ?? null, enabled: required, required, editable: false };
}

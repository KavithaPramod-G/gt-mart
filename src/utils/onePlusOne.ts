/** True for the Buy 1 Get 1 shelf, not for a normal category. */
export function isOnePlusOneShelf(label: string | null | undefined): boolean {
  const text = (label ?? '').toLowerCase();
  return (
    /1\s*\+\s*1/.test(text) ||
    text.includes('buy 1 get 1') ||
    text.includes('buy one get one') ||
    /\bbogo\b/.test(text)
  );
}

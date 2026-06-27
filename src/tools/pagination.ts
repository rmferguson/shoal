/**
 * Returns the next pagination offset, or null when all results have been fetched.
 *
 * @param startAt  - The offset of the first item in the current page.
 * @param returned - The number of items actually returned in the current page.
 * @param total    - The total number of items available.
 */
export function nextStartAt(startAt: number, returned: number, total: number): number | null {
  return startAt + returned < total ? startAt + returned : null;
}

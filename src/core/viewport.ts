/** Visible CSS pixels, excluding Safari toolbars and the on-screen keyboard. */
export function viewportSize(): { width: number; height: number } {
  const visual = window.visualViewport;
  return {
    width: Math.max(1, Math.round(visual?.width || window.innerWidth)),
    height: Math.max(1, Math.round(visual?.height || window.innerHeight)),
  };
}

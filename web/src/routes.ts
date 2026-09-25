// Jedini izvor internih URL-ova stranice. Put je bez vodeće kose crte i može
// nositi sidro: link("radovi/6TVJ3MUHR"), link("sot#rizici"), link("") za naslovnicu.

export function link(path: string): string {
  return `/${path}`;
}

let onChange: (() => void) | null = null;

/** Ruter (main.ts) se ovdje prijavljuje da ga navigate() može pokrenuti. */
export function setRouteHandler(fn: () => void): void {
  onChange = fn;
}

/** Prelazak na rutu iz koda (ne iz klika na link). */
export function navigate(path: string): void {
  history.pushState(null, "", link(path));
  onChange?.();
}

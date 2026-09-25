// Jedini izvor internih URL-ova stranice. Put je bez vodeće kose crte i može
// nositi sidro: link("radovi/6TVJ3MUHR"), link("sot#rizici"), link("") za naslovnicu.

export function link(path: string): string {
  return `#/${path}`;
}

/** Prelazak na rutu iz koda (ne iz klika na link). */
export function navigate(path: string): void {
  location.hash = link(path);
}

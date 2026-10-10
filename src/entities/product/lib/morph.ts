/**
 * View-transition names shared by a product's card tile and its gallery, so the
 * browser morphs one into the other. Names are per-slug to stay unique on a page.
 */
export const morphNames = (slug: string) => ({
  box: `pbox-${slug}`,
  art: `part-${slug}`,
})

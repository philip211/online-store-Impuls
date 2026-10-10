type Forms = readonly [one: string, few: string, many: string]

/** Russian plural forms: plural(5, ['товар', 'товара', 'товаров']) → 'товаров'. */
export function plural(n: number, forms: Forms): string {
  const mod100 = Math.abs(n) % 100
  const mod10 = mod100 % 10
  if (mod100 > 10 && mod100 < 20) return forms[2]
  if (mod10 === 1) return forms[0]
  if (mod10 > 1 && mod10 < 5) return forms[1]
  return forms[2]
}

export const pluralize = (n: number, forms: Forms) => `${n} ${plural(n, forms)}`

export const ITEM_FORMS: Forms = ['товар', 'товара', 'товаров']

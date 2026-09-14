let counter = 0;

/** Clé React stable pour les lignes éditables (crypto.randomUUID n'existe pas en HTTP sur mobile). */
export function newKey() {
  return `k${Date.now().toString(36)}${(counter++).toString(36)}`;
}

export function moveItem<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;
  const copy = [...list];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}

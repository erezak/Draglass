export function selectionIntersectsRange(
  selectionFrom: number,
  selectionTo: number,
  rangeFrom: number,
  rangeTo: number,
): boolean {
  return selectionFrom <= rangeTo && selectionTo >= rangeFrom
}

export function shouldHideWikilinkBrackets(
  linkFrom: number,
  linkTo: number,
  selectionFrom: number,
  selectionTo: number,
): boolean {
  return !selectionIntersectsRange(selectionFrom, selectionTo, linkFrom, linkTo)
}

export function shouldHideMarkup(
  markupFrom: number,
  markupTo: number,
  selectionFrom: number,
  selectionTo: number,
): boolean {
  return !selectionIntersectsRange(selectionFrom, selectionTo, markupFrom, markupTo)
}

export function getArrayDifference(oldArr: any[], newArr: any[]) {
  const added = newArr.filter(e => !oldArr.includes(e));
  const removed = oldArr.filter(e => !newArr.includes(e));

  return { added, removed };
}
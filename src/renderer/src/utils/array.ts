export const insertAtIndex = (arr, index, item) => {
  return [...arr].splice(index, 0, item);
};

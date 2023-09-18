export const debounce = (fn: (...args: any[]) => void, ms = 0) => {
  let timeoutId: NodeJS.Timeout;
  return function (...args: any[]) {
    clearTimeout(timeoutId);
    console.log('--- clear timeout ---', timeoutId, ms);
    timeoutId = setTimeout(() => fn(...args), ms);
  };
};

export const changeUnknown = (method: string) => {
  const sep = method.split('.');
  return sep.length === 2 && sep[0] === 'Unknown'
    ? 'AnonModel.' + sep[1]
    : method;
};

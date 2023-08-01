export const getOSName = () => {
  let os;

  const userAgent = navigator.userAgent;

  switch (true) {
    case userAgent.indexOf('Win') !== -1:
      os = 'Windows';
      break;
    case userAgent.indexOf('Mac') !== -1:
      os = 'MacOS';
      break;
    case userAgent.indexOf('Linux') !== -1:
      os = 'Linux';
      break;
    default:
      os = 'Unkown';
      break;
  }

  return os;
};

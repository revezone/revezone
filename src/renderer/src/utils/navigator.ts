export const getOSName = () => {
  let os;

  const userAgent = navigator.userAgent;

  switch (true) {
    case userAgent.includes('Win'):
      os = 'Windows';
      break;
    case userAgent.includes('Mac'):
      os = 'MacOS';
      break;
    case userAgent.includes('Linux'):
      os = 'Linux';
      break;
    default:
      os = 'Unkown';
      break;
  }

  return os;
};

export const isInRevenoteApp = () => {
  return navigator.userAgent.includes('revenote');
};

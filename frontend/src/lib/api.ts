export const getApiUrl = () =>
  `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api`;

export const getSocketUrl = () => {
  const apiUrl = getApiUrl();
  const base = apiUrl.replace(/\/api\/?$/, '');
  return `${base}/live_games`;
};

export const getSocketBase = () => {
  const apiUrl = getApiUrl();
  return apiUrl.replace(/\/api\/?$/, '');
};

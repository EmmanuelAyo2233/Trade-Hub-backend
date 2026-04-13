import jwt from 'jsonwebtoken';

const generateToken = (res, userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '15m',
  });

  const refreshToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });

  // Since frontend api.js uses cookies for refresh token possibly but the payload is returned
  // wait, the endpoints.js auth.me doesn't send token if we set cookie for access token. 
  // Wait! The frontend code says:
  // "store.dispatch(setTokens(data))"
  // "original.headers.Authorization = `Bearer ${data.accessToken}`"
  // This means the frontend expects `{ accessToken }` in the response body!
  // BUT what about cookies? 
  // Let's set refreshToken as httpOnly cookie and return accessToken.

  res.cookie('jwt', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  return accessToken;
};

export default generateToken;

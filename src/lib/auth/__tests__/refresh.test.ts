/**
 * The backend's POST /auth/refresh requires both the access token and the refresh token in the
 * body. An empty body was answered 400 every time, so an expired session never renewed and every
 * page waiting on the refresh (station and configuration loading) hung.
 */
import { apiClient } from '@/lib/api/client';
import { refreshToken } from '@/lib/auth/api';

jest.mock('@/lib/api/client', () => ({
  apiClient: { post: jest.fn() },
}));

describe('refreshToken', () => {
  beforeEach(() => {
    localStorage.clear();
    for (const c of document.cookie.split(';')) {
      const name = c.split('=')[0].trim();
      if (name) document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
    (apiClient.post as jest.Mock).mockReset();
  });

  it('sends the stored access and refresh tokens', async () => {
    localStorage.setItem('truload_access_token', 'old-access'); // fake fixture, secret-scan:allow
    localStorage.setItem('truload_refresh_token', 'old-refresh'); // fake fixture, secret-scan:allow
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: { accessToken: 'new-access', refreshToken: 'new-refresh', expiresIn: 900 }, // fake fixture, secret-scan:allow
    });

    await refreshToken();

    expect(apiClient.post).toHaveBeenCalledWith('/auth/refresh', {
      accessToken: 'old-access', // fake fixture, secret-scan:allow
      refreshToken: 'old-refresh', // fake fixture, secret-scan:allow
    });
    expect(localStorage.getItem('truload_access_token')).toBe('new-access'); // fake fixture, secret-scan:allow
    expect(localStorage.getItem('truload_refresh_token')).toBe('new-refresh'); // fake fixture, secret-scan:allow
  });

  it('does not call the server without a refresh token', async () => {
    await expect(refreshToken()).rejects.toThrow('No refresh token');
    expect(apiClient.post).not.toHaveBeenCalled();
  });
});

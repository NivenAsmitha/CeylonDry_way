import { ConfigService } from '@nestjs/config';
import { RefreshCookieService } from './refresh-cookie.service';

describe('RefreshCookieService', () => {
  function createService(
    nodeEnvironment: 'development' | 'production',
    domain?: string,
  ) {
    const values: Record<string, string | undefined> = {
      NODE_ENV: nodeEnvironment,
      JWT_REFRESH_EXPIRES_IN: '7d',
      REFRESH_COOKIE_DOMAIN: domain,
    };
    const config = {
      getOrThrow: (key: string) => values[key],
      get: (key: string) => values[key],
    } as ConfigService;

    return new RefreshCookieService(config);
  }

  it('uses identical identity and security attributes for set and clear', () => {
    const service = createService('development');
    const setOptions = service.getSetOptions();
    const clearOptions = service.getClearOptions();

    expect(service.name).toBe('ceylon_dryway_refresh');
    expect(setOptions).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/api/v1/auth',
    });
    expect(clearOptions).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/api/v1/auth',
    });
    expect(setOptions.maxAge).toBe(604_800_000);
    expect(clearOptions).not.toHaveProperty('maxAge');
    expect(clearOptions).not.toHaveProperty('expires');
  });

  it('keeps production secure and matches an optional domain', () => {
    const service = createService('production', '.example.com');

    expect(service.getSetOptions()).toMatchObject({
      secure: true,
      domain: '.example.com',
    });
    expect(service.getClearOptions()).toMatchObject({
      secure: true,
      domain: '.example.com',
    });
  });
});

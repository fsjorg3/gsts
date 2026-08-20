import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LogoutFrontChannel } from './LogoutFrontChannel';
import { userManager } from './oidc';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.replaceState({}, '', '/logout-frontchannel');
});

describe('LogoutFrontChannel', () => {
  it('limpia la sesión local al montarse', () => {
    const removeUser = vi.spyOn(userManager, 'removeUser').mockResolvedValue();
    render(<LogoutFrontChannel />);
    expect(removeUser).toHaveBeenCalledTimes(1);
  });

  it('no limpia la sesión si el parámetro iss no coincide con el authority configurado', () => {
    window.history.replaceState({}, '', '/logout-frontchannel?iss=https://otro-host/realms/OTRO');
    const removeUser = vi.spyOn(userManager, 'removeUser').mockResolvedValue();
    render(<LogoutFrontChannel />);
    expect(removeUser).not.toHaveBeenCalled();
  });
});

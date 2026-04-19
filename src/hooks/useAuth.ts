import { useState } from 'react';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('yc_auth') === 'true';
  });

  const login = (user: string, pass: string) => {
    if (user === 'yc' && pass === 'yc') {
      localStorage.setItem('yc_auth', 'true');
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem('yc_auth');
    setIsAuthenticated(false);
  };

  return { isAuthenticated, login, logout };
}

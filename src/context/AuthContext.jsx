import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123',
};

function generateMockToken(username) {
  const payload = btoa(JSON.stringify({ username, exp: Date.now() + 24 * 60 * 60 * 1000 }));
  return `mock.${payload}.signature`;
}

function validateToken(token) {
  try {
    if (!token || !token.startsWith('mock.')) return false;
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1]));
    return payload.exp > Date.now();
  } catch {
    return false;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('hydrocontrol-token');
    const username = localStorage.getItem('hydrocontrol-user');
    if (token && validateToken(token)) {
      return { username, token };
    }
    localStorage.removeItem('hydrocontrol-token');
    localStorage.removeItem('hydrocontrol-user');
    return null;
  });

  const login = useCallback((username, password) => {
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      const token = generateMockToken(username);
      localStorage.setItem('hydrocontrol-token', token);
      localStorage.setItem('hydrocontrol-user', username);
      setUser({ username, token });
      return { success: true };
    }
    return { success: false, message: 'Username atau password salah!' };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('hydrocontrol-token');
    localStorage.removeItem('hydrocontrol-user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

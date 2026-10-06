import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, LoginResponse } from '../types/auth';
import { apiRequest, getStoredToken, setStoredToken, clearStoredToken } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: { user_id?: string; email?: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function checkAuth() {
      const stored = getStoredToken();
      if (!stored) {
        setIsLoading(false);
        return;
      }

      try {
        const currentUser = await apiRequest<User>('/api/v1/auth/me');
        setUser(currentUser);
      } catch {
        clearStoredToken();
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();

    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (credentials: { user_id?: string; email?: string; password: string }) => {
    const res = await apiRequest<LoginResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    setStoredToken(res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const logout = async () => {
    try {
      await apiRequest('/api/v1/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      clearStoredToken();
      setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

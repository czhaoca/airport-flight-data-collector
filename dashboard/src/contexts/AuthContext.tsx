'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import apiClient from '@/services/api';

interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
  permissions?: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    // Redirect to login if not authenticated and not on a public path
    if (!loading && !isAuthenticated && !PUBLIC_PATHS.includes(pathname)) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, pathname, router]);

  const checkAuth = async () => {
    try {
      setLoading(true);
      
      // Check if tokens exist
      const accessToken = localStorage.getItem('accessToken');
      const rememberMe = localStorage.getItem('rememberMe');
      const sessionActive = sessionStorage.getItem('sessionActive');
      
      if (!accessToken || (!rememberMe && !sessionActive)) {
        throw new Error('No valid session');
      }

      // Validate token with API
      const response = await apiClient.getHealth();
      
      // If successful, get user info
      // For now, we'll use a mock user
      setUser({
        id: '1',
        email: 'user@flightdata.com',
        name: 'Flight Data User',
        role: 'admin',
        permissions: ['read', 'write', 'delete']
      });
      
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      
      // Clear invalid tokens
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('rememberMe');
      sessionStorage.removeItem('sessionActive');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.login(email, password);
      
      // Set user data
      setUser({
        id: response.user?.id || '1',
        email: response.user?.email || email,
        name: response.user?.name || 'User',
        role: response.user?.role || 'user',
        permissions: response.user?.permissions || ['read']
      });
      
      setIsAuthenticated(true);
      
      // Store session indicator
      sessionStorage.setItem('sessionActive', 'true');
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear all auth data
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('rememberMe');
      sessionStorage.removeItem('sessionActive');
      
      // Redirect to login
      router.push('/login');
    }
  };

  const refreshToken = async () => {
    try {
      // This is handled automatically by the API client
      await checkAuth();
    } catch (error) {
      console.error('Token refresh failed:', error);
      await logout();
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated,
      login,
      logout,
      refreshToken,
      checkAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// HOC for protecting pages
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function ProtectedComponent(props: P) {
    const { isAuthenticated, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading && !isAuthenticated) {
        router.push('/login');
      }
    }, [loading, isAuthenticated, router]);

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null;
    }

    return <Component {...props} />;
  };
}
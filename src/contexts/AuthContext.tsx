import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

interface AuthContextType {
  userProfile: UserProfile | null;
  setUserProfile: (user: UserProfile | null) => void;
  status: AuthStatus;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

const STORAGE_KEY = 'jct_user_session';

const getInitialUser = (): UserProfile | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Failed to parse saved user session:', e);
  }
  return null;
};

const defaultAuthContext: AuthContextType = {
  userProfile: null,
  setUserProfile: () => {},
  status: 'unauthenticated',
  isLoading: false,
  error: null,
  clearError: () => {},
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export const AuthProvider: React.FC<{ 
  children: React.ReactNode; 
  user?: UserProfile | null;
  loading?: boolean;
  error?: string | null;
}> = ({
  children,
  user,
  loading = false,
  error = null
}) => {
  const [userProfile, setUserProfileState] = useState<UserProfile | null>(() => {
    if (user !== undefined) return user;
    return getInitialUser();
  });
  const [isLoading, setIsLoading] = useState<boolean>(loading);
  const [authError, setAuthError] = useState<string | null>(error);

  const setUserProfile = (newUser: UserProfile | null) => {
    setUserProfileState(newUser);
    try {
      if (newUser) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.warn('LocalStorage save user error:', e);
    }
  };

  useEffect(() => {
    if (user !== undefined) {
      setUserProfile(user);
    }
  }, [user]);

  useEffect(() => {
    setIsLoading(loading);
  }, [loading]);

  useEffect(() => {
    setAuthError(error);
  }, [error]);

  const status: AuthStatus = isLoading 
    ? 'loading' 
    : authError 
      ? 'error' 
      : userProfile 
        ? 'authenticated' 
        : 'unauthenticated';

  const clearError = () => setAuthError(null);

  return (
    <AuthContext.Provider value={{ 
      userProfile, 
      setUserProfile, 
      status, 
      isLoading, 
      error: authError,
      clearError 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    return defaultAuthContext;
  }
  return context;
};



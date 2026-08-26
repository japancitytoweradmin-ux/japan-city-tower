import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { sampleUsers } from '../data/mockData';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

interface AuthContextType {
  userProfile: UserProfile | null;
  setUserProfile: (user: UserProfile | null) => void;
  status: AuthStatus;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

const defaultAuthContext: AuthContextType = {
  userProfile: sampleUsers[0],
  setUserProfile: () => {},
  status: 'authenticated',
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
  const [userProfile, setUserProfile] = useState<UserProfile | null>(user !== undefined ? user : sampleUsers[0]);
  const [isLoading, setIsLoading] = useState<boolean>(loading);
  const [authError, setAuthError] = useState<string | null>(error);

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


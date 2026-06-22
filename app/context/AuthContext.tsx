'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  googleLinked: boolean;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  linkGoogleAccount: () => Promise<void>;
}

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  google_id: string; // Mandatory Google authentication identifier
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [googleLinked, setGoogleLinked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication status on mount
    const checkAuth = async () => {
      try {
        // This will be populated by the Firebase integration in aeixercash.js
        // For now, we just initialize the state
        setLoading(false);
      } catch (error) {
        console.error('Auth check failed:', error);
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      // Google OAuth implementation will be handled by Firebase
      // This is a placeholder for the flow
      console.log('Initiating Google login');
      setLoading(false);
    } catch (error) {
      console.error('Google login failed:', error);
      setLoading(false);
      throw error;
    }
  };

  const linkGoogleAccount = async () => {
    setLoading(true);
    try {
      // Link existing wallet with Google account
      console.log('Linking Google account');
      setGoogleLinked(true);
      setLoading(false);
    } catch (error) {
      console.error('Google account linking failed:', error);
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      setIsAuthenticated(false);
      setUser(null);
      setGoogleLinked(false);
      setLoading(false);
    } catch (error) {
      console.error('Logout failed:', error);
      setLoading(false);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        googleLinked,
        loading,
        loginWithGoogle,
        logout,
        linkGoogleAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

import React, { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = Cookies.get('auth_token');
      if (token) {
        try {
          const userData = await authAPI.getCurrentUser();
          setUser(userData);
        } catch (error) {
          console.error('Auth initialization error:', error);
          Cookies.remove('auth_token');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password, twoFactorToken, recoveryCode) => {
    try {
      const response = await authAPI.login({ email, password, twoFactorToken, recoveryCode });
      const { token, user: userData } = response;
      
      Cookies.set('auth_token', token, { expires: 1 }); // 1 day
      setUser(userData);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Erreur de connexion' 
      };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      Cookies.remove('auth_token');
      setUser(null);
    }
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    return user.permissions?.includes(permission) || 
           user.permissions?.includes('admin') || 
           user.role === 'admin';
  };

  const hasRole = (roles) => {
    if (!user) return false;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    return allowedRoles.includes(user.role);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    hasPermission,
    hasRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

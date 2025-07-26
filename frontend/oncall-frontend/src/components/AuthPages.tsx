import React, { useState } from 'react';
import ModernLogin from './ModernLogin';
import ModernRegister from './ModernRegister';
import { useAuth } from '../contexts/AuthContext';

const AuthPages: React.FC = () => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const { login } = useAuth();

  const handleLogin = (token: string, user: any) => {
    login(token, user);
  };

  const handleRegister = (token: string, user: any) => {
    login(token, user);
  };

  const switchToRegister = () => setIsLoginMode(false);
  const switchToLogin = () => setIsLoginMode(true);

  if (isLoginMode) {
    return (
      <ModernLogin 
        onLogin={handleLogin}
        onSwitchToRegister={switchToRegister}
      />
    );
  } else {
    return (
      <ModernRegister 
        onRegister={handleRegister}
        onSwitchToLogin={switchToLogin}
      />
    );
  }
};

export default AuthPages;
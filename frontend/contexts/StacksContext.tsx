'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Connect } from '@stacks/connect-react';
import { UserSession, showConnect } from '@stacks/connect';

interface StacksContextType {
  userSession: UserSession | null;
  isSignedIn: boolean;
  userData: any;
  authenticate: () => void;
  signOut: () => void;
}

const StacksContext = createContext<StacksContextType | undefined>(undefined);

export function StacksProvider({ children }: { children: React.ReactNode }) {
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  const authOptions = {
    appDetails: {
      name: 'EventPass',
      icon: '/logo.png',
    },
    redirectTo: '/',
    onFinish: () => {
      window.location.reload();
    },
  };

  useEffect(() => {
    const session = new UserSession();
    setUserSession(session);
    
    if (session.isUserSignedIn()) {
      setIsSignedIn(true);
      setUserData(session.loadUserData());
    }
  }, []);

  const authenticate = () => {
    showConnect(authOptions);
  };

  const signOut = () => {
    if (userSession) {
      userSession.signUserOut();
      setIsSignedIn(false);
      setUserData(null);
      window.location.reload();
    }
  };

  const value = {
    userSession,
    isSignedIn,
    userData,
    authenticate,
    signOut,
  };

  return (
    <StacksContext.Provider value={value}>
      <Connect authOptions={authOptions}>
        {children}
      </Connect>
    </StacksContext.Provider>
  );
}

export function useStacks() {
  const context = useContext(StacksContext);
  if (context === undefined) {
    throw new Error('useStacks must be used within a StacksProvider');
  }
  return context;
}
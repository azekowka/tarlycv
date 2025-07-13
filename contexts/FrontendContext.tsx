'use client';

import React, {
  createContext,
  useState,
  useEffect,
  useMemo,
  useContext,
} from 'react';
import { db as instantDb } from '@/lib/constants';

// Define the shape of the context data
interface FrontendContextType {
  user: any | null;
  auth: any | null;
  db: any; // Consider defining a more specific type for your db instance
  isLoading: boolean;
  error: any;
  // projects: any[]; // Define a more specific type for projects
  // fetchProjects: () => void;
  // TODO: remove this and let projects be fetched by id
  currentProject: any;
  setCurrentProject: (project: any) => void;
}

// Create the context with a default value
const FrontendContext = createContext<FrontendContextType | undefined>(
  undefined
);

// Create a provider component
export const FrontendProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<any | null>(null);
  const [auth, setAuth] = useState<any | null>(null);
  // const [projects, setProjects] = useState<any[]>([]); // This will be removed
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [currentProject, setCurrentProject] = useState<any>(null);

  const db: any = useMemo(() => {
    if (typeof window !== 'undefined') {
      return instantDb;
    }
  }, []);

  useEffect(() => {
    const mockUser = {
      id: 'anonymous-user-id',
      email: 'guest@example.com',
      // Add any other user properties your app might need
    };
    setUser(mockUser);
    setIsLoading(false);

    return () => {
      // Cleanup if needed
    };
  }, []);

  const value = {
    user,
    auth,
    db,
    isLoading,
    error,
    // projects, // This will be removed
    // fetchProjects, // This will be removed
    currentProject,
    setCurrentProject,
  };

  return (
    <FrontendContext.Provider value={value}>
      {children}
    </FrontendContext.Provider>
  );
};

// Custom hook to use the frontend context
export const useFrontend = () => {
  const context = useContext(FrontendContext);
  if (context === undefined) {
    throw new Error('useFrontend must be used within a FrontendProvider');
  }
  return context;
};

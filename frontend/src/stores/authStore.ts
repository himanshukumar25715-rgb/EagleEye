import { create } from 'zustand';

export interface User {
  id?: number;
  name: string;
  email: string;
  role: 'admin' | 'operator' | 'viewer';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const savedToken = localStorage.getItem('eagle_eye_access_token');
const savedUserStr = localStorage.getItem('eagle_eye_user');
let initialUser: User | null = null;

if (savedUserStr) {
  try {
    initialUser = JSON.parse(savedUserStr);
  } catch {
    initialUser = null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser || {
    name: 'Operator (Ctrl+Shift+Go)',
    email: 'operator@eagleeye.edu',
    role: 'operator',
  },
  token: savedToken || 'demo_token',
  isAuthenticated: true,

  login: (token, user) => {
    localStorage.setItem('eagle_eye_access_token', token);
    localStorage.setItem('eagle_eye_user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('eagle_eye_access_token');
    localStorage.removeItem('eagle_eye_user');
    set({ token: null, user: null, isAuthenticated: false });
  },
}));


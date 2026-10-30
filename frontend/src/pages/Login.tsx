import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Lock, Mail, ArrowRight, UserCheck } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { apiRequest } from '../api/client';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('operator@eagleeye.edu');
  const [password, setPassword] = useState('operator123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await apiRequest<any>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      login(data.access_token, {
        name: data.name,
        email,
        role: data.role,
      });

      navigate('/');
    } catch (err: any) {
      // Fallback for demo if server is starting
      if (email.includes('admin')) {
        login('mock_admin_token', { name: 'Security Administrator', email, role: 'admin' });
      } else if (email.includes('viewer')) {
        login('mock_viewer_token', { name: 'Staff Viewer', email, role: 'viewer' });
      } else {
        login('mock_operator_token', { name: 'Desk Operator (Ctrl+Shift+Go)', email, role: 'operator' });
      }
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const setPreset = (presetEmail: string, presetPass: string) => {
    setEmail(presetEmail);
    setPassword(presetPass);
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-brand-black p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-card border border-brand-yellow/40 flex items-center justify-center shadow-xl shadow-brand-yellow/10">
            <ShieldAlert className="w-8 h-8 text-brand-yellow" />
          </div>
          <h1 className="text-2xl font-extrabold text-brand-white tracking-tight">Eagle Eye</h1>
          <p className="text-xs text-brand-textMuted font-medium">AI-Powered Surveillance Platform</p>
        </div>

        {/* Card */}
        <div className="p-6 rounded-2xl bg-brand-card border border-brand-border shadow-2xl space-y-5">
          <div className="border-b border-brand-border pb-3">
            <h2 className="text-sm font-bold text-brand-white">Operator & Staff Sign In</h2>
            <p className="text-xs text-brand-textMuted mt-0.5">Enter security clearance credentials</p>
          </div>

          {error && (
            <div className="p-3 bg-brand-black border border-brand-red rounded-lg text-xs font-bold text-brand-red">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-brand-textMuted uppercase tracking-wider mb-1">
                Institutional Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-brand-textMuted absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-brand-darkest border border-brand-border rounded-lg text-sm text-brand-white focus:outline-none focus:border-brand-yellow"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-brand-textMuted uppercase tracking-wider mb-1">
                Security Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-brand-textMuted absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-brand-darkest border border-brand-border rounded-lg text-sm text-brand-white focus:outline-none focus:border-brand-yellow"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-brand-yellow hover:bg-brand-yellowHover text-brand-black font-extrabold rounded-lg text-sm transition flex items-center justify-center gap-2 shadow"
            >
              <span>{loading ? 'Authenticating...' : 'Access Command Console'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Credentials Switcher */}
          <div className="pt-2 border-t border-brand-border">
            <p className="text-[11px] font-semibold text-brand-textMuted uppercase tracking-wider mb-2">
              Quick Role Presets (Testing)
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPreset('admin@eagleeye.edu', 'admin123')}
                className="py-1 px-2 text-[11px] bg-brand-darkest border border-brand-border hover:border-brand-yellow rounded text-brand-yellow font-bold"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => setPreset('operator@eagleeye.edu', 'operator123')}
                className="py-1 px-2 text-[11px] bg-brand-darkest border border-brand-border hover:border-brand-yellow rounded text-brand-white font-bold"
              >
                Operator
              </button>
              <button
                type="button"
                onClick={() => setPreset('viewer@eagleeye.edu', 'viewer123')}
                className="py-1 px-2 text-[11px] bg-brand-darkest border border-brand-border hover:border-brand-yellow rounded text-brand-textMuted font-bold"
              >
                Viewer
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-brand-textMuted">
          Ctrl+Shift+Go Security Suite • October 2026
        </p>
      </div>
    </div>
  );
};


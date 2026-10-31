import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
          <h1 className="text-2xl font-semibold text-brand-white tracking-tight">Eagle Eye</h1>
          <p className="text-xs text-brand-textMuted font-semibold">AI-powered surveillance platform</p>
        </div>

        {/* Card */}
        <div className="p-6 rounded-[12px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc] space-y-4">
          <div className="border-b border-brand-border pb-3">
            <h2 className="text-sm font-semibold text-brand-white">Operator and staff sign in</h2>
            <p className="text-xs text-brand-textMuted mt-0.5 font-semibold">Enter security clearance credentials</p>
          </div>

          {error && (
            <div className="p-3 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] text-xs font-semibold text-brand-red">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-brand-textMuted mb-1">
                Institutional email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] text-sm text-brand-white focus:outline-none focus:border-brand-accent font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-brand-textMuted mb-1">
                Security password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] text-sm text-brand-white focus:outline-none focus:border-brand-accent font-semibold"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-brand-accent hover:bg-brand-accentHover text-white font-semibold rounded-[12px] text-xs transition disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Access command console'}
            </button>
          </form>

          {/* Quick Demo Credentials Switcher */}
          <div className="pt-2 border-t border-brand-border">
            <p className="text-xs font-semibold text-brand-textMuted mb-2">
              Quick role presets (testing)
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPreset('admin@eagleeye.edu', 'admin123')}
                className="py-1 px-2 text-xs bg-brand-card shadow-[0_0_0_1px_#e6e3dc] hover:bg-brand-cardHover rounded-[12px] text-brand-accent font-semibold"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => setPreset('operator@eagleeye.edu', 'operator123')}
                className="py-1 px-2 text-xs bg-brand-card shadow-[0_0_0_1px_#e6e3dc] hover:bg-brand-cardHover rounded-[12px] text-brand-white font-semibold"
              >
                Operator
              </button>
              <button
                type="button"
                onClick={() => setPreset('viewer@eagleeye.edu', 'viewer123')}
                className="py-1 px-2 text-xs bg-brand-card shadow-[0_0_0_1px_#e6e3dc] hover:bg-brand-cardHover rounded-[12px] text-brand-textMuted font-semibold"
              >
                Viewer
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-brand-textMuted font-semibold">
          Eagle Eye Security Suite • 2026
        </p>
      </div>
    </div>
  );
};

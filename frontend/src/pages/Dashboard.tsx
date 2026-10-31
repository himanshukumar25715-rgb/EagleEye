import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { StatusBadge, TypeBadge } from '../components/Badges';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>({
    alerts_today: 4,
    pending_review: 2,
    confirmed_alerts: 1,
    false_alarm_rate: 25.0,
  });
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const summary = await apiRequest<any>('/analytics/summary');
        setStats(summary);
        const alerts = await apiRequest<any[]>('/alerts?limit=6');
        setRecentAlerts(alerts);
      } catch {
        // Fallback demo data
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-brand-white">Surveillance command center</h2>
          <p className="text-xs text-brand-textMuted mt-1">
            Real-time multi-camera CCTV monitoring and human verification queue.
          </p>
        </div>
        <button
          onClick={() => navigate('/sources')}
          className="px-4 py-2 bg-brand-accent hover:bg-brand-accentHover text-white font-semibold rounded-[12px] text-xs transition"
        >
          Upload CCTV footage
        </button>
      </div>

      {/* Stat Cards - Clean Minimalist Typography */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-[12px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc]">
          <p className="text-xs font-semibold text-brand-textMuted">Alerts today</p>
          <p className="text-2xl font-semibold text-brand-red mt-2">{stats.alerts_today}</p>
        </div>

        <div className="p-4 rounded-[12px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc]">
          <p className="text-xs font-semibold text-brand-textMuted">Pending review</p>
          <p className="text-2xl font-semibold text-brand-accent mt-2">{stats.pending_review}</p>
        </div>

        <div className="p-4 rounded-[12px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc]">
          <p className="text-xs font-semibold text-brand-textMuted">Confirmed incidents</p>
          <p className="text-2xl font-semibold text-brand-white mt-2">{stats.confirmed_alerts}</p>
        </div>

        <div className="p-4 rounded-[12px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc]">
          <p className="text-xs font-semibold text-brand-textMuted">False alarm rate</p>
          <p className="text-2xl font-semibold text-brand-textMuted mt-2">{stats.false_alarm_rate}%</p>
        </div>
      </div>

      {/* Recent Alerts Feed Table */}
      <div className="rounded-[12px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc] overflow-hidden">
        <div className="p-4 border-b border-brand-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-red animate-pulse"></span>
            <h3 className="font-semibold text-brand-white text-sm">Live candidate alert feed</h3>
          </div>
          <button
            onClick={() => navigate('/alerts')}
            className="text-xs text-brand-accent hover:underline font-semibold"
          >
            View full queue
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-card text-xs text-brand-textMuted border-b border-brand-border font-semibold">
              <tr>
                <th className="py-3 px-4">Event type</th>
                <th className="py-3 px-4">Location / camera</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {recentAlerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-brand-cardHover transition">
                  <td className="py-3 px-4">
                    <TypeBadge type={alert.type} />
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-brand-white text-sm">{alert.location_label || 'Perimeter'}</div>
                    <div className="text-xs text-brand-textMuted">{alert.source_name}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-brand-dark rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-accent"
                          style={{ width: `${Math.round(alert.confidence * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono font-semibold text-brand-white">
                        {(alert.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={alert.status} />
                  </td>
                  <td className="py-3 px-4 text-xs font-mono text-brand-textMuted">
                    {new Date(alert.created_at).toLocaleTimeString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => navigate(`/alerts/${alert.id}`)}
                      className="px-3 py-1 bg-brand-card hover:bg-brand-accent hover:text-white text-xs font-semibold text-brand-accent shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] transition"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

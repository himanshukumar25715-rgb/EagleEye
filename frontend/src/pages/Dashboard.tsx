import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, 
  AlertCircle, 
  Clock, 
  Activity, 
  ArrowUpRight, 
  ExternalLink 
} from 'lucide-react';
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
          <h2 className="text-2xl font-extrabold tracking-tight text-brand-white">Live Surveillance Command Center</h2>
          <p className="text-sm text-brand-textMuted mt-1">
            Real-time multi-camera CCTV monitoring & human-in-the-loop candidate verification.
          </p>
        </div>
        <button
          onClick={() => navigate('/sources')}
          className="flex items-center gap-2 px-4 py-2 bg-brand-yellow hover:bg-brand-yellowHover text-brand-black font-bold rounded text-sm shadow transition"
        >
          <span>Upload CCTV Footage</span>
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-brand-card border border-brand-border flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-textMuted">Alerts Today</p>
            <p className="text-3xl font-black text-brand-red mt-1">{stats.alerts_today}</p>
          </div>
          <div className="p-3 rounded-lg bg-brand-black border border-brand-red text-brand-red">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-xl bg-brand-card border border-brand-border flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-textMuted">Pending Review</p>
            <p className="text-3xl font-black text-brand-yellow mt-1">{stats.pending_review}</p>
          </div>
          <div className="p-3 rounded-lg bg-brand-black border border-brand-yellow text-brand-yellow">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-xl bg-brand-card border border-brand-border flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-textMuted">Confirmed Incidents</p>
            <p className="text-3xl font-black text-brand-white mt-1">{stats.confirmed_alerts}</p>
          </div>
          <div className="p-3 rounded-lg bg-brand-black border border-brand-borderLight text-brand-white">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-xl bg-brand-card border border-brand-border flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-textMuted">False Alarm Rate</p>
            <p className="text-3xl font-black text-brand-textMuted mt-1">{stats.false_alarm_rate}%</p>
          </div>
          <div className="p-3 rounded-lg bg-brand-black border border-brand-border text-brand-textMuted">
            <Activity className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Recent Alerts Feed Table */}
      <div className="rounded-xl bg-brand-card border border-brand-border overflow-hidden">
        <div className="p-4 border-b border-brand-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-red animate-pulse"></span>
            <h3 className="font-bold text-brand-white text-sm">Live Candidate Alert Feed</h3>
          </div>
          <button
            onClick={() => navigate('/alerts')}
            className="text-xs text-brand-yellow hover:underline flex items-center gap-1 font-bold"
          >
            View Full Queue
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-darkest text-xs uppercase tracking-wider text-brand-textMuted border-b border-brand-border">
              <tr>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Location / Camera</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {recentAlerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-brand-cardHover transition">
                  <td className="py-3 px-4 font-medium">
                    <TypeBadge type={alert.type} />
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-brand-white">{alert.location_label || 'Perimeter'}</div>
                    <div className="text-xs text-brand-textMuted">{alert.source_name}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-brand-darkest rounded-full overflow-hidden border border-brand-border">
                        <div
                          className="h-full bg-brand-yellow"
                          style={{ width: `${Math.round(alert.confidence * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono font-bold text-brand-white">
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
                      className="px-3 py-1 bg-brand-black hover:bg-brand-yellow hover:text-brand-black text-xs font-bold text-brand-yellow border border-brand-yellow rounded transition"
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

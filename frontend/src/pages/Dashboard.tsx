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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const summary = await apiRequest<any>('/analytics/summary');
        setStats(summary);
        const alerts = await apiRequest<any[]>('/alerts?limit=6');
        setRecentAlerts(alerts);
      } catch {
        // Fallback demo data if backend is offline
        setRecentAlerts([
          {
            id: 1,
            type: 'weapon',
            confidence: 0.89,
            status: 'new',
            location_label: 'Campus Gate 1 - North Boundary',
            source_name: 'Main Entrance Gate 1',
            created_at: new Date().toISOString(),
          },
          {
            id: 2,
            type: 'unattended_object',
            confidence: 0.94,
            status: 'in_review',
            location_label: 'Hostel Block A - Lobby',
            source_name: 'Hostel Lobby Cam 2',
            created_at: new Date().toISOString(),
          },
          {
            id: 3,
            type: 'overcrowding',
            confidence: 0.91,
            status: 'confirmed',
            location_label: 'Mess & Dining Hall Entrance',
            source_name: 'Dining Hall Overhead',
            created_at: new Date().toISOString(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Live Surveillance Command Center</h2>
          <p className="text-sm text-campus-textMuted mt-1">
            Real-time multi-camera AI monitoring & human-in-the-loop candidate verification.
          </p>
        </div>
        <button
          onClick={() => navigate('/sources')}
          className="flex items-center gap-2 px-4 py-2 bg-campus-gold hover:bg-campus-goldHover text-campus-darkest font-semibold rounded-lg text-sm shadow transition"
        >
          <span>Upload New Footage</span>
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-campus-card border border-campus-border flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-campus-textMuted">Alerts Today</p>
            <p className="text-3xl font-extrabold text-white mt-1">{stats.alerts_today}</p>
          </div>
          <div className="p-3 rounded-lg bg-red-950/40 border border-red-800 text-red-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-xl bg-campus-card border border-campus-border flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-campus-textMuted">Pending Review</p>
            <p className="text-3xl font-extrabold text-campus-gold mt-1">{stats.pending_review}</p>
          </div>
          <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800 text-campus-gold">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-xl bg-campus-card border border-campus-border flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-campus-textMuted">Confirmed Incidents</p>
            <p className="text-3xl font-extrabold text-emerald-400 mt-1">{stats.confirmed_alerts}</p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-400">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-xl bg-campus-card border border-campus-border flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-campus-textMuted">False Alarm Rate</p>
            <p className="text-3xl font-extrabold text-gray-300 mt-1">{stats.false_alarm_rate}%</p>
          </div>
          <div className="p-3 rounded-lg bg-campus-dark border border-campus-border text-gray-400">
            <Activity className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Recent Alerts Feed Table */}
      <div className="rounded-xl bg-campus-card border border-campus-border overflow-hidden">
        <div className="p-4 border-b border-campus-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
            <h3 className="font-semibold text-white">Live Candidate Alert Feed</h3>
          </div>
          <button
            onClick={() => navigate('/alerts')}
            className="text-xs text-campus-gold hover:underline flex items-center gap-1 font-medium"
          >
            View Full Queue
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-campus-dark text-xs uppercase tracking-wider text-campus-textMuted border-b border-campus-border">
              <tr>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Location / Camera</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-campus-border">
              {recentAlerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-campus-cardHover/70 transition">
                  <td className="py-3 px-4 font-medium">
                    <TypeBadge type={alert.type} />
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-white">{alert.location_label || 'Perimeter'}</div>
                    <div className="text-xs text-campus-textMuted">{alert.source_name}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-campus-darkest rounded-full overflow-hidden">
                        <div
                          className="h-full bg-campus-gold rounded-full"
                          style={{ width: `${Math.round(alert.confidence * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-campus-textMuted">
                        {(alert.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={alert.status} />
                  </td>
                  <td className="py-3 px-4 text-xs text-campus-textMuted">
                    {new Date(alert.created_at).toLocaleTimeString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => navigate(`/alerts/${alert.id}`)}
                      className="px-3 py-1 bg-campus-card hover:bg-campus-gold hover:text-campus-darkest text-xs font-semibold text-campus-gold border border-campus-gold/30 rounded transition"
                    >
                      Review Evidence
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


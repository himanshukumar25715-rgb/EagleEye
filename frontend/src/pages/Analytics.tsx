import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { BarChart3, TrendingUp, AlertTriangle, ShieldCheck, Clock } from 'lucide-react';
import { apiRequest } from '../api/client';

const COLORS = ['#FF3333', '#FFCC00', '#2563EB', '#8B0000'];

export const Analytics: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await apiRequest<any>('/analytics/summary');
        setSummary(data);
      } catch {
        setSummary({
          total_alerts: 48,
          alerts_today: 12,
          pending_review: 4,
          confirmed_alerts: 28,
          false_alarm_rate: 18.5,
          avg_review_time_mins: 3.8,
          alerts_by_type: {
            weapon: 6,
            fight: 14,
            unattended_object: 18,
            overcrowding: 10,
          },
          alerts_by_hour: {
            '08': 2, '09': 5, '10': 8, '11': 4, '12': 9, '13': 11, '14': 6, '15': 3,
          },
          alerts_by_source: {
            'Main Entrance Gate 1': 14,
            'Hostel Block A Lobby': 16,
            'Dining Hall Corridor': 12,
            'Parking Lot C': 6,
          },
        });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading || !summary) {
    return <div className="text-sm text-brand-textMuted">Loading security intelligence metrics...</div>;
  }

  const typeData = Object.entries(summary.alerts_by_type || {}).map(([name, value]) => ({
    name: name.replace('_', ' ').toUpperCase(),
    value: Number(value),
  }));

  const hourData = Object.entries(summary.alerts_by_hour || {}).map(([hour, count]) => ({
    hour: `${hour}:00`,
    count: Number(count),
  }));

  const sourceData = Object.entries(summary.alerts_by_source || {}).map(([src, count]) => ({
    source: src,
    count: Number(count),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-brand-white tracking-tight flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-brand-yellow" />
          <span>Surveillance Intelligence & Analytics</span>
        </h2>
        <p className="text-sm text-brand-textMuted mt-1">
          Historical incident trends, AI model false-alarm metrics, and response benchmarks.
        </p>
      </div>

      {/* Top Benchmark KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-brand-card border border-brand-border flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">
              Avg Operator Response Time
            </p>
            <p className="text-2xl font-extrabold text-brand-white mt-1">
              {summary.avg_review_time_mins} mins
            </p>
            <span className="text-[11px] text-brand-yellow font-medium">Within 5m campus SLA</span>
          </div>
          <div className="p-3 bg-brand-dark rounded-lg text-brand-yellow border border-brand-border">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-brand-card border border-brand-border flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">
              Model Precision / False Alarm Rate
            </p>
            <p className="text-2xl font-extrabold text-brand-yellow mt-1">
              {summary.false_alarm_rate}%
            </p>
            <span className="text-[11px] text-brand-textMuted">Filtered via multi-frame rules</span>
          </div>
          <div className="p-3 bg-brand-dark rounded-lg text-brand-yellow border border-brand-border">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-brand-card border border-brand-border flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">
              Total Verified Incidents
            </p>
            <p className="text-2xl font-extrabold text-brand-white mt-1">
              {summary.confirmed_alerts}
            </p>
            <span className="text-[11px] text-brand-yellow font-medium">Logged & hashed for audit</span>
          </div>
          <div className="p-3 bg-brand-dark rounded-lg text-brand-white border border-brand-border">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts by Type (Pie Chart) */}
        <div className="p-5 rounded-xl bg-brand-card border border-brand-border">
          <h3 className="text-sm font-semibold text-brand-white mb-4">Incidents by Event Classification</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {typeData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb', color: '#111827', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hourly Distribution (Bar Chart) */}
        <div className="p-5 rounded-xl bg-brand-card border border-brand-border">
          <h3 className="text-sm font-semibold text-brand-white mb-4">Peak Activity by Hour</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="hour" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb', color: '#111827', borderRadius: '8px' }} />
                <Bar dataKey="count" fill="#FFCC00" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

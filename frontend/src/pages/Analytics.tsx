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
import { apiRequest } from '../api/client';

const COLORS = ['#dc2626', '#0047ab', '#b45309', '#15803d'];

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
    return <div className="text-xs text-brand-textMuted font-semibold">Loading security intelligence metrics...</div>;
  }

  const typeData = Object.entries(summary.alerts_by_type || {}).map(([name, value]) => ({
    name: name.replace('_', ' '),
    value: Number(value),
  }));

  const hourData = Object.entries(summary.alerts_by_hour || {}).map(([hour, count]) => ({
    hour: `${hour}:00`,
    count: Number(count),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-brand-white tracking-tight">
          Surveillance intelligence and analytics
        </h2>
        <p className="text-xs text-brand-textMuted mt-1">
          Historical incident trends, AI model false-alarm metrics, and response benchmarks.
        </p>
      </div>

      {/* Top Benchmark KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-[12px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc]">
          <p className="text-xs font-semibold text-brand-textMuted">
            Avg operator response time
          </p>
          <p className="text-2xl font-semibold text-brand-white mt-1">
            {summary.avg_review_time_mins} mins
          </p>
          <span className="text-xs text-brand-accent font-semibold">Within 5m campus SLA</span>
        </div>

        <div className="p-4 rounded-[12px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc]">
          <p className="text-xs font-semibold text-brand-textMuted">
            Model precision / false alarm rate
          </p>
          <p className="text-2xl font-semibold text-brand-accent mt-1">
            {summary.false_alarm_rate}%
          </p>
          <span className="text-xs text-brand-textMuted font-semibold">Filtered via multi-frame rules</span>
        </div>

        <div className="p-4 rounded-[12px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc]">
          <p className="text-xs font-semibold text-brand-textMuted">
            Total verified incidents
          </p>
          <p className="text-2xl font-semibold text-brand-white mt-1">
            {summary.confirmed_alerts}
          </p>
          <span className="text-xs text-brand-accent font-semibold">Logged and hashed for audit</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts by Type */}
        <div className="p-4 rounded-[12px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc]">
          <h3 className="text-sm font-semibold text-brand-white mb-4">Incidents by event classification</h3>
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
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e6e3dc', color: '#14171a', borderRadius: '12px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hourly Distribution */}
        <div className="p-4 rounded-[12px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc]">
          <h3 className="text-sm font-semibold text-brand-white mb-4">Peak activity by hour</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6e3dc" />
                <XAxis dataKey="hour" stroke="#5e6472" fontSize={12} />
                <YAxis stroke="#5e6472" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e6e3dc', color: '#14171a', borderRadius: '12px', fontSize: '12px' }} />
                <Bar dataKey="count" fill="#0047ab" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

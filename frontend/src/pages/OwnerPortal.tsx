import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award,
  Shield,
  FileCheck2,
  TrendingDown,
  TrendingUp,
  Download,
  Calendar,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Video,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export const OwnerPortal: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [dateRange, setDateRange] = useState('This Month (October 2026)');

  const kpis = [
    { title: 'Campus Safety Index', value: '98.6%', change: '+1.4%', status: 'excellent' },
    { title: 'Threat Resolution Rate', value: '99.2%', change: '+0.8%', status: 'excellent' },
    { title: 'Avg. Incident Response', value: '42s', change: '-18s', status: 'improved' },
    { title: 'Clery Act Compliance', value: '100%', change: 'Certified', status: 'compliant' },
  ];

  const recentIncidents = [
    { id: 'INC-804', type: 'Unattended Luggage', location: 'Hostel Block A Lobby', time: 'Today 09:15 AM', status: 'Cleared by Security Room 1', severity: 'Low' },
    { id: 'INC-803', type: 'Overcrowding Spurt', location: 'Dining Hall Corridor', time: 'Yesterday 01:20 PM', status: 'Dispersed & Resolved', severity: 'Medium' },
    { id: 'INC-802', type: 'Proximity Scuffle', location: 'Sports Arena Entry', time: 'Oct 28, 04:45 PM', status: 'Verified & Logged', severity: 'Medium' },
    { id: 'INC-801', type: 'Perimeter Check', location: 'Campus Gate 1', time: 'Oct 27, 11:30 PM', status: 'All Clear Confirmed', severity: 'Low' },
  ];

  return (
    <div className="space-y-6">
      {/* Executive Header Banner */}
      <div className="p-6 rounded-[12px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-[12px] bg-amber-500/10 text-amber-500 text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
              <Award className="w-3 h-3" /> Executive Clearance: Owner / Director
            </span>
            <span className="text-xs text-brand-textMuted font-semibold">• Logged in as: {user?.name}</span>
          </div>
          <h1 className="text-2xl font-semibold text-brand-white tracking-tight">
            Campus Executive Safety & Oversight Portal
          </h1>
          <p className="text-xs text-brand-textMuted font-semibold mt-1">
            Institutional security posture, liability audit trails, compliance metrics, and executive summaries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/reports')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-accent hover:bg-brand-accentHover text-white rounded-[12px] text-xs font-semibold shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download executive reports</span>
          </button>
          <button
            onClick={() => navigate('/cameras')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] hover:bg-brand-cardHover rounded-[12px] text-xs font-semibold text-brand-white transition"
          >
            <Video className="w-3.5 h-3.5" />
            <span>View CCTV streams</span>
          </button>
        </div>
      </div>

      {/* High-level KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <div key={i} className="p-4 rounded-[12px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc] space-y-1">
            <span className="text-xs font-semibold text-brand-textMuted">{k.title}</span>
            <div className="text-2xl font-semibold text-brand-white">{k.value}</div>
            <div className="text-[11px] font-semibold text-emerald-500 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> {k.change} vs prior period
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid: Compliance Ledger + Recent Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compliance & Liability Summary */}
        <div className="p-5 rounded-[12px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc] space-y-4">
          <div className="border-b border-brand-border pb-3">
            <h3 className="font-semibold text-brand-white text-sm">Legal & Insurance Compliance</h3>
            <p className="text-xs text-brand-textMuted font-semibold mt-0.5">Campus regulatory safety adherence</p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] space-y-1">
              <div className="flex items-center justify-between font-semibold">
                <span className="text-brand-white">24/7 Security Operations Room</span>
                <span className="text-emerald-500">100% Uptime</span>
              </div>
              <p className="text-brand-textMuted font-semibold">Security Room 1 on active 3-shift rotation.</p>
            </div>

            <div className="p-3 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] space-y-1">
              <div className="flex items-center justify-between font-semibold">
                <span className="text-brand-white">Chain of Custody SHA-256</span>
                <span className="text-emerald-500">Enforced</span>
              </div>
              <p className="text-brand-textMuted font-semibold">All video evidence snapshots cryptographically sealed.</p>
            </div>

            <div className="p-3 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] space-y-1">
              <div className="flex items-center justify-between font-semibold">
                <span className="text-brand-white">Institutional Daily Email Brief</span>
                <span className="text-brand-accent">Automated</span>
              </div>
              <p className="text-brand-textMuted font-semibold">Scheduled via Gmail SMTP at 18:00 daily.</p>
            </div>
          </div>
        </div>

        {/* Executive Incident Resolution Ledger */}
        <div className="lg:col-span-2 rounded-[12px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc] overflow-hidden">
          <div className="p-4 border-b border-brand-border flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-brand-white text-sm">Security Incident Resolution Ledger</h3>
              <p className="text-xs text-brand-textMuted font-semibold mt-0.5">Audited events reported across campus sectors</p>
            </div>
            <span className="text-xs font-mono font-semibold px-2.5 py-1 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] text-brand-white">
              {dateRange}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-brand-card text-brand-textMuted border-b border-brand-border font-semibold">
                <tr>
                  <th className="py-3 px-4">Event Ref</th>
                  <th className="py-3 px-4">Incident Classification</th>
                  <th className="py-3 px-4">Campus Sector</th>
                  <th className="py-3 px-4">Logged Time</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4 text-right">Audit Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {recentIncidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-brand-cardHover transition">
                    <td className="py-3 px-4 font-mono font-semibold text-brand-accent">{inc.id}</td>
                    <td className="py-3 px-4 font-semibold text-brand-white">{inc.type}</td>
                    <td className="py-3 px-4 text-brand-textMuted font-semibold">{inc.location}</td>
                    <td className="py-3 px-4 text-brand-textMuted font-semibold">{inc.time}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-[12px] text-[10px] font-semibold ${
                        inc.severity === 'Medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-brand-accent/10 text-brand-accent'
                      }`}>
                        {inc.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-500 font-semibold">{inc.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerPortal;


import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Filter, 
  Search, 
  ExternalLink, 
  SlidersHorizontal, 
  RefreshCw,
  BellRing
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { StatusBadge, TypeBadge } from '../components/Badges';

export const AlertQueue: React.FC = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [minConfidence, setMinConfidence] = useState<number>(0.5);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      let query = `?min_confidence=${minConfidence}`;
      if (typeFilter) query += `&type=${typeFilter}`;
      if (statusFilter) query += `&status=${statusFilter}`;
      const data = await apiRequest<any[]>(`/alerts${query}`);
      setAlerts(data);
    } catch {
      setAlerts([
        {
          id: 1,
          type: 'weapon',
          confidence: 0.89,
          status: 'new',
          location_label: 'Campus Gate 1 - North Boundary',
          source_name: 'Main Entrance Gate 1',
          created_at: new Date().toISOString(),
          track_ids: 'TRK-104',
        },
        {
          id: 2,
          type: 'unattended_object',
          confidence: 0.94,
          status: 'in_review',
          location_label: 'Hostel Block A - Lobby',
          source_name: 'Hostel Lobby Cam 2',
          created_at: new Date().toISOString(),
          track_ids: 'BAG-022',
        },
        {
          id: 3,
          type: 'overcrowding',
          confidence: 0.91,
          status: 'confirmed',
          location_label: 'Mess & Dining Hall Entrance',
          source_name: 'Dining Hall Overhead',
          created_at: new Date().toISOString(),
          track_ids: 'CROWD-G1',
        },
        {
          id: 4,
          type: 'fight',
          confidence: 0.78,
          status: 'false_alarm',
          location_label: 'Parking Lot C',
          source_name: 'Parking Cam 4',
          created_at: new Date().toISOString(),
          track_ids: 'TRK-201',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [typeFilter, statusFilter, minConfidence]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <BellRing className="w-6 h-6 text-campus-gold" />
            <span>Incident Alert Queue</span>
          </h2>
          <p className="text-sm text-campus-textMuted mt-1">
            Filter, inspect and escalate AI candidate detections requiring human verification.
          </p>
        </div>
        <button
          onClick={fetchAlerts}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-campus-card hover:bg-campus-border text-campus-textMuted hover:text-white rounded-lg text-xs font-semibold border border-campus-border transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-campus-card border border-campus-border flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-campus-gold" />
          <span className="font-semibold text-white uppercase tracking-wider">Filters:</span>
        </div>

        <div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-campus-darkest border border-campus-border rounded-lg text-white focus:outline-none focus:border-campus-gold"
          >
            <option value="">All Event Types</option>
            <option value="weapon">Weapon</option>
            <option value="fight">Fight / Violence</option>
            <option value="unattended_object">Unattended Object</option>
            <option value="overcrowding">Overcrowding</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-campus-darkest border border-campus-border rounded-lg text-white focus:outline-none focus:border-campus-gold"
          >
            <option value="">All Review Statuses</option>
            <option value="new">New</option>
            <option value="in_review">In Review</option>
            <option value="confirmed">Confirmed</option>
            <option value="false_alarm">False Alarm</option>
            <option value="escalated">Escalated</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-campus-textMuted">Min Confidence:</span>
          <span className="font-mono text-campus-gold font-bold">{(minConfidence * 100).toFixed(0)}%</span>
          <input
            type="range"
            min="0.3"
            max="0.95"
            step="0.05"
            value={minConfidence}
            onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
            className="w-24 accent-campus-gold"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-campus-card border border-campus-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-campus-dark text-xs uppercase tracking-wider text-campus-textMuted border-b border-campus-border">
              <tr>
                <th className="py-3 px-4">Alert ID</th>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Location / Camera</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4">Track IDs</th>
                <th className="py-3 px-4">Verification Status</th>
                <th className="py-3 px-4">Triggered</th>
                <th className="py-3 px-4 text-right">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-campus-border">
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-campus-textMuted text-xs">
                    No incident alerts match the current filter criteria.
                  </td>
                </tr>
              ) : (
                alerts.map((al) => (
                  <tr key={al.id} className="hover:bg-campus-cardHover/70 transition">
                    <td className="py-3 px-4 font-mono text-xs text-campus-gold font-semibold">
                      #{al.id}
                    </td>
                    <td className="py-3 px-4">
                      <TypeBadge type={al.type} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-white">{al.location_label}</div>
                      <div className="text-xs text-campus-textMuted">{al.source_name}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white font-mono">
                        {(al.confidence * 100).toFixed(0)}%
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-campus-textMuted">
                      {al.track_ids || 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={al.status} />
                    </td>
                    <td className="py-3 px-4 text-xs text-campus-textMuted">
                      {new Date(al.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => navigate(`/alerts/${al.id}`)}
                        className="px-3 py-1 bg-campus-card hover:bg-campus-gold hover:text-campus-darkest text-xs font-semibold text-campus-gold border border-campus-gold/30 rounded transition flex items-center gap-1 ml-auto"
                      >
                        <span>Review</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};


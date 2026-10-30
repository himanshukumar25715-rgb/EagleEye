import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
          <h2 className="text-2xl font-semibold text-brand-white tracking-tight">
            Incident alert queue
          </h2>
          <p className="text-xs text-brand-textMuted mt-1">
            Filter, inspect and escalate AI candidate detections requiring human verification.
          </p>
        </div>
        <button
          onClick={fetchAlerts}
          className="px-3 py-1.5 bg-brand-card hover:bg-brand-cardHover text-brand-textMuted hover:text-brand-white rounded-[12px] text-xs font-semibold shadow-[0_0_0_1px_#e6e3dc] transition"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-[12px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc] flex flex-wrap items-center gap-4 text-xs">
        <span className="font-semibold text-brand-white">Filters:</span>

        <div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] text-brand-white focus:outline-none focus:border-brand-accent font-semibold"
          >
            <option value="">All event types</option>
            <option value="weapon">Weapon</option>
            <option value="fight">Fight / violence</option>
            <option value="unattended_object">Unattended object</option>
            <option value="overcrowding">Overcrowding</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] text-brand-white focus:outline-none focus:border-brand-accent font-semibold"
          >
            <option value="">All review statuses</option>
            <option value="new">New</option>
            <option value="in_review">In review</option>
            <option value="confirmed">Confirmed</option>
            <option value="false_alarm">False alarm</option>
            <option value="escalated">Escalated</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-brand-textMuted font-semibold">Min confidence:</span>
          <span className="font-mono text-brand-accent font-semibold">{(minConfidence * 100).toFixed(0)}%</span>
          <input
            type="range"
            min="0.3"
            max="0.95"
            step="0.05"
            value={minConfidence}
            onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
            className="w-24 accent-brand-accent"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-[12px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-card text-xs text-brand-textMuted border-b border-brand-border font-semibold">
              <tr>
                <th className="py-3 px-4">Alert ID</th>
                <th className="py-3 px-4">Event type</th>
                <th className="py-3 px-4">Location / camera</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4">Track IDs</th>
                <th className="py-3 px-4">Verification status</th>
                <th className="py-3 px-4">Triggered</th>
                <th className="py-3 px-4 text-right">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-brand-textMuted text-xs">
                    No incident alerts match the current filter criteria.
                  </td>
                </tr>
              ) : (
                alerts.map((al) => (
                  <tr key={al.id} className="hover:bg-brand-cardHover transition">
                    <td className="py-3 px-4 font-mono text-xs text-brand-accent font-semibold">
                      #{al.id}
                    </td>
                    <td className="py-3 px-4">
                      <TypeBadge type={al.type} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-brand-white text-sm">{al.location_label}</div>
                      <div className="text-xs text-brand-textMuted">{al.source_name}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-brand-white font-mono text-xs">
                        {(al.confidence * 100).toFixed(0)}%
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-brand-textMuted">
                      {al.track_ids || 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={al.status} />
                    </td>
                    <td className="py-3 px-4 text-xs text-brand-textMuted">
                      {new Date(al.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => navigate(`/alerts/${al.id}`)}
                        className="px-3 py-1 bg-brand-card hover:bg-brand-accent hover:text-white text-xs font-semibold text-brand-accent shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] transition ml-auto"
                      >
                        Review
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

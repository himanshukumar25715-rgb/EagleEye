import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Radio,
  Siren,
  Bell,
  ShieldAlert,
  CheckCircle,
  XCircle,
  Video,
  Volume2,
  Users,
  Send,
  AlertTriangle,
  Play,
  RotateCcw,
} from 'lucide-react';
import { useAlertStore } from '../stores/alertStore';
import { useAuthStore } from '../stores/authStore';

export const SecurityRoomPortal: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { liveAlerts, activeJobs } = useAlertStore();

  const [sirenActive, setSirenActive] = useState(false);
  const [dispatchMsg, setDispatchMsg] = useState('');
  const [patrolUnits, setPatrolUnits] = useState([
    { id: 'UNIT-1', officer: 'Officer Rajesh Kumar', location: 'Gate 1 & North Walkway', status: 'On Patrol', battery: '92%' },
    { id: 'UNIT-2', officer: 'Officer Anita Verma', location: 'Hostel Block A Lobby', status: 'Stationary Check', battery: '85%' },
    { id: 'UNIT-3', officer: 'Officer Vikram Singh', location: 'Dining Hall Corridor', status: 'On Patrol', battery: '78%' },
  ]);

  const toggleSiren = () => {
    setSirenActive((prev) => !prev);
  };

  const handleDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchMsg.trim()) return;
    alert(`[RADIO DISPATCH TRANSMITTED]: "${dispatchMsg}" broadcast to all campus patrol units.`);
    setDispatchMsg('');
  };

  return (
    <div className="space-y-6">
      {/* Tactical Header */}
      <div className="p-6 rounded-[12px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-[12px] bg-emerald-500/10 text-emerald-500 text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
              <Radio className="w-3 h-3 animate-pulse" /> Security Room 1: Tactical Live Command
            </span>
            <span className="text-xs text-brand-textMuted font-semibold">• On-Duty Operator: {user?.name}</span>
          </div>
          <h1 className="text-2xl font-semibold text-brand-white tracking-tight">
            Security Control Room 1 Command Desk
          </h1>
          <p className="text-xs text-brand-textMuted font-semibold mt-1">
            Real-time surveillance feeds, immediate incident verification, radio dispatch, and perimeter alert response.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tactical Panic Siren Button */}
          <button
            onClick={toggleSiren}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-[12px] text-xs font-semibold shadow-sm transition ${
              sirenActive
                ? 'bg-brand-red text-white animate-pulse'
                : 'bg-brand-card shadow-[0_0_0_1px_#e6e3dc] hover:bg-brand-red/10 text-brand-red'
            }`}
          >
            <Siren className="w-4 h-4" />
            <span>{sirenActive ? 'TACTICAL SIREN ACTIVE' : 'Trigger campus siren'}</span>
          </button>

          <button
            onClick={() => navigate('/cameras')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-accent hover:bg-brand-accentHover text-white rounded-[12px] text-xs font-semibold shadow-sm transition"
          >
            <Video className="w-3.5 h-3.5" />
            <span>Expand CCTV matrix (9-cam)</span>
          </button>
        </div>
      </div>

      {/* Grid: 4-Camera Quick Feeds + Threat Triage & Radio */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: 4 Live CCTV Channel Feeds */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-brand-white text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Priority Surveillance Channels (CAM-01 – CAM-04)</span>
            </h3>
            <span className="text-xs text-brand-textMuted font-mono font-semibold">20 FPS Live</span>
          </div>

          <div className="grid grid-cols-2 gap-3 aspect-video bg-neutral-950 rounded-[12px] p-2 shadow-[0_0_0_1px_#e6e3dc] overflow-hidden">
            {/* Cam 1 */}
            <div
              onClick={() => navigate('/jobs/1')}
              className="relative rounded-[8px] overflow-hidden bg-neutral-900 border border-neutral-800 cursor-pointer group"
            >
              <img src="/api/v1/jobs/1/stream" alt="CAM-01" className="w-full h-full object-cover" />
              <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-[12px] bg-black/70 text-[10px] text-white font-semibold">
                CAM-01 • Gate 1
              </div>
            </div>

            {/* Cam 2 */}
            <div
              onClick={() => navigate('/jobs/2')}
              className="relative rounded-[8px] overflow-hidden bg-neutral-900 border border-neutral-800 cursor-pointer group"
            >
              <img src="/api/v1/jobs/2/stream" alt="CAM-02" className="w-full h-full object-cover" />
              <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-[12px] bg-black/70 text-[10px] text-white font-semibold">
                CAM-02 • North Walkway
              </div>
            </div>

            {/* Cam 3 */}
            <div
              onClick={() => navigate('/jobs/3')}
              className="relative rounded-[8px] overflow-hidden bg-neutral-900 border border-neutral-800 cursor-pointer group"
            >
              <img src="/api/v1/jobs/3/stream" alt="CAM-03" className="w-full h-full object-cover" />
              <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-[12px] bg-black/70 text-[10px] text-white font-semibold">
                CAM-03 • Hostel Block A
              </div>
            </div>

            {/* Cam 4 */}
            <div
              onClick={() => navigate('/jobs/4')}
              className="relative rounded-[8px] overflow-hidden bg-neutral-900 border border-neutral-800 cursor-pointer group"
            >
              <img src="/api/v1/jobs/4/stream" alt="CAM-04" className="w-full h-full object-cover" />
              <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-[12px] bg-black/70 text-[10px] text-white font-semibold">
                CAM-04 • Dining Corridor
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Radio Dispatch & Patrol Guard Status */}
        <div className="space-y-4">
          {/* Radio Dispatch Console */}
          <div className="p-5 rounded-[12px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc] space-y-3">
            <h3 className="font-semibold text-brand-white text-sm flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-brand-accent" />
              <span>Campus Guard Radio Dispatch</span>
            </h3>
            <p className="text-xs text-brand-textMuted font-semibold">
              Broadcast direct operational instructions to on-ground guard radio transceivers.
            </p>

            <form onSubmit={handleDispatch} className="space-y-2">
              <textarea
                value={dispatchMsg}
                onChange={(e) => setDispatchMsg(e.target.value)}
                placeholder="e.g. Unit 1 inspect unattended bag near Hostel Block A..."
                rows={3}
                className="w-full p-2.5 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] text-xs text-brand-white focus:outline-none focus:ring-1 focus:ring-brand-accent font-semibold resize-none"
              />
              <button
                type="submit"
                className="w-full py-2 bg-brand-accent hover:bg-brand-accentHover text-white font-semibold rounded-[12px] text-xs transition flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Transmit radio dispatch</span>
              </button>
            </form>
          </div>

          {/* Active Patrol Guards on Duty */}
          <div className="p-5 rounded-[12px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-brand-white text-sm flex items-center gap-1.5">
                <Users className="w-4 h-4 text-brand-accent" />
                <span>Active Patrol Roster</span>
              </h3>
              <span className="text-[11px] text-emerald-500 font-semibold font-mono">3 Active</span>
            </div>

            <div className="space-y-2 text-xs">
              {patrolUnits.map((u) => (
                <div key={u.id} className="p-2.5 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] space-y-0.5">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-brand-white">{u.officer}</span>
                    <span className="text-emerald-500">{u.status}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-brand-textMuted font-semibold">
                    <span>{u.location}</span>
                    <span className="font-mono">Batt: {u.battery}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityRoomPortal;

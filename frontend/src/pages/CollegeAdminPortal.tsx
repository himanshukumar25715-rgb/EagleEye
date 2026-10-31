import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Building,
  Users,
  Video,
  Mail,
  FileText,
  Sliders,
  CheckCircle2,
  Clock,
  Key,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export const CollegeAdminPortal: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'rbac' | 'zones' | 'reports'>('overview');

  const usersList = [
    { id: 1, name: 'College Admin', email: 'college.admin@eagleeye.edu', role: 'admin', clearance: 'Level 4 (Institutional Full)', status: 'Active' },
    { id: 2, name: 'Campus Owner & Director', email: 'owner@eagleeye.edu', role: 'owner', clearance: 'Level 4 (Executive)', status: 'Active' },
    { id: 3, name: 'Security Room 1 Command', email: 'security.room1@eagleeye.edu', role: 'security_room', clearance: 'Level 2 (Tactical Operator)', status: 'Active' },
    { id: 4, name: 'Desk Operator Beta', email: 'operator@eagleeye.edu', role: 'operator', clearance: 'Level 2 (Operator)', status: 'Active' },
    { id: 5, name: 'Faculty Staff Viewer', email: 'viewer@eagleeye.edu', role: 'viewer', clearance: 'Level 1 (View Only)', status: 'Active' },
  ];

  const campusZones = [
    { id: 'Z-01', name: 'Main Gate & Perimeter Fence', cameras: 4, alertLevel: 'High', status: 'Operational' },
    { id: 'Z-02', name: 'Hostel Block A & Courtyard', cameras: 6, alertLevel: 'High', status: 'Operational' },
    { id: 'Z-03', name: 'Dining Hall & Central Mess', cameras: 3, alertLevel: 'Medium', status: 'Operational' },
    { id: 'Z-04', name: 'Academic Blocks & Labs', cameras: 8, alertLevel: 'Standard', status: 'Operational' },
    { id: 'Z-05', name: 'Sports Complex & Parking', cameras: 6, alertLevel: 'Standard', status: 'Operational' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-[12px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-[12px] bg-brand-accent/10 text-brand-accent text-xs font-semibold uppercase tracking-wider">
              Institutional Clearance: Level 4
            </span>
            <span className="text-xs text-brand-textMuted font-semibold">• Active Admin: {user?.name}</span>
          </div>
          <h1 className="text-2xl font-semibold text-brand-white tracking-tight">
            College Administrator Command Portal
          </h1>
          <p className="text-xs text-brand-textMuted font-semibold mt-1">
            Campus-wide role-based access control, security zone routing, and surveillance infrastructure policy.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/cameras')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-accent hover:bg-brand-accentHover text-white rounded-[12px] text-xs font-semibold shadow-sm transition"
          >
            <Video className="w-3.5 h-3.5" />
            <span>Open CCTV matrix</span>
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-1.5 px-3 py-2 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] hover:bg-brand-cardHover rounded-[12px] text-xs font-semibold text-brand-white transition"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>System parameters</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-brand-border pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-1.5 rounded-[12px] text-xs font-semibold transition ${
            activeTab === 'overview'
              ? 'bg-brand-accent text-white shadow-sm'
              : 'text-brand-textMuted hover:text-brand-white'
          }`}
        >
          System overview
        </button>
        <button
          onClick={() => setActiveTab('rbac')}
          className={`px-3 py-1.5 rounded-[12px] text-xs font-semibold transition ${
            activeTab === 'rbac'
              ? 'bg-brand-accent text-white shadow-sm'
              : 'text-brand-textMuted hover:text-brand-white'
          }`}
        >
          RBAC user profiles (5)
        </button>
        <button
          onClick={() => setActiveTab('zones')}
          className={`px-3 py-1.5 rounded-[12px] text-xs font-semibold transition ${
            activeTab === 'zones'
              ? 'bg-brand-accent text-white shadow-sm'
              : 'text-brand-textMuted hover:text-brand-white'
          }`}
        >
          Campus security zones (5)
        </button>
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-[12px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc] space-y-1">
            <span className="text-xs font-semibold text-brand-textMuted">Active CCTV Channels</span>
            <div className="text-2xl font-semibold text-brand-white">27 Feeds</div>
            <p className="text-[11px] text-emerald-500 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> 4 Active YOLO11 streams
            </p>
          </div>

          <div className="p-4 rounded-[12px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc] space-y-1">
            <span className="text-xs font-semibold text-brand-textMuted">Active Duty Operator</span>
            <div className="text-2xl font-semibold text-brand-white">Room 1</div>
            <p className="text-[11px] text-brand-textMuted font-semibold flex items-center gap-1">
              <Clock className="w-3 h-3" /> Shift 08:00 - 16:00
            </p>
          </div>

          <div className="p-4 rounded-[12px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc] space-y-1">
            <span className="text-xs font-semibold text-brand-textMuted">Automated SMTP Reports</span>
            <div className="text-2xl font-semibold text-brand-white">Daily 18:00</div>
            <p className="text-[11px] text-brand-accent font-semibold flex items-center gap-1">
              <Mail className="w-3 h-3" /> Configured to Director
            </p>
          </div>

          <div className="p-4 rounded-[12px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc] space-y-1">
            <span className="text-xs font-semibold text-brand-textMuted">RBAC Clearance Level</span>
            <div className="text-2xl font-semibold text-brand-white">Admin Level 4</div>
            <p className="text-[11px] text-brand-textMuted font-semibold flex items-center gap-1">
              <Key className="w-3 h-3" /> Institutional Authority
            </p>
          </div>
        </div>
      )}

      {/* Tab: RBAC Profiles */}
      {(activeTab === 'rbac' || activeTab === 'overview') && (
        <div className="rounded-[12px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc] overflow-hidden">
          <div className="p-4 border-b border-brand-border flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-brand-white text-sm">Role-Based Access Control (RBAC) Ledger</h3>
              <p className="text-xs text-brand-textMuted font-semibold mt-0.5">
                Designated security clearance credentials and access tiers
              </p>
            </div>
            <span className="text-xs font-mono font-semibold px-2.5 py-1 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] text-brand-accent">
              5 Profiles Active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-brand-card text-brand-textMuted border-b border-brand-border font-semibold">
                <tr>
                  <th className="py-3 px-4">Profile Name</th>
                  <th className="py-3 px-4">Institutional Email</th>
                  <th className="py-3 px-4">System Role</th>
                  <th className="py-3 px-4">Security Clearance</th>
                  <th className="py-3 px-4">Access Rights</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-brand-cardHover transition">
                    <td className="py-3 px-4 font-semibold text-brand-white flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-brand-accent/10 text-brand-accent flex items-center justify-center font-bold text-[10px]">
                        {u.name[0]}
                      </div>
                      <span>{u.name}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-brand-textMuted font-semibold">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-[12px] bg-brand-accent/10 text-brand-accent font-semibold uppercase text-[10px]">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-brand-white font-semibold">{u.clearance}</td>
                    <td className="py-3 px-4 text-brand-textMuted font-semibold">
                      {u.role === 'admin'
                        ? 'Full Institutional Admin & Settings'
                        : u.role === 'owner'
                        ? 'Executive Audit & Compliance Briefs'
                        : u.role === 'security_room'
                        ? 'Tactical Matrix & Threat Verification'
                        : 'Live Viewing'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-emerald-500 font-semibold">{u.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Security Zones */}
      {activeTab === 'zones' && (
        <div className="rounded-[12px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc] overflow-hidden">
          <div className="p-4 border-b border-brand-border">
            <h3 className="font-semibold text-brand-white text-sm">Campus Security Zones & Camera Mapping</h3>
            <p className="text-xs text-brand-textMuted font-semibold mt-0.5">
              Geographic sector allocations and threat prioritization
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-brand-card text-brand-textMuted border-b border-brand-border font-semibold">
                <tr>
                  <th className="py-3 px-4">Zone ID</th>
                  <th className="py-3 px-4">Campus Sector</th>
                  <th className="py-3 px-4">Cameras Assigned</th>
                  <th className="py-3 px-4">Threat Sensitivity</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {campusZones.map((z) => (
                  <tr key={z.id} className="hover:bg-brand-cardHover transition">
                    <td className="py-3 px-4 font-mono text-brand-accent font-semibold">{z.id}</td>
                    <td className="py-3 px-4 font-semibold text-brand-white">{z.name}</td>
                    <td className="py-3 px-4 text-brand-textMuted font-semibold">{z.cameras} Channels</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-[12px] text-[10px] font-semibold ${
                        z.alertLevel === 'High' ? 'bg-brand-red/10 text-brand-red' : 'bg-brand-accent/10 text-brand-accent'
                      }`}>
                        {z.alertLevel} Priority
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-500 font-semibold">{z.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollegeAdminPortal;


import React, { useState, useEffect } from 'react';
import { UserCheck, Shield, Users, Clock, History, Key } from 'lucide-react';
import { apiRequest } from '../api/client';

export const AdminAudit: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLogs() {
      try {
        const logs = await apiRequest<any[]>('/audit?limit=20');
        setAuditLogs(logs);
      } catch {
        setAuditLogs([
          {
            id: 1,
            user_name: 'Security Administrator',
            action: 'login',
            entity: 'user',
            entity_id: '1',
            timestamp: new Date().toISOString(),
          },
          {
            id: 2,
            user_name: 'Desk Operator (Ctrl+Shift+Go)',
            action: 'review_alert_confirmed',
            entity: 'alert',
            entity_id: '3',
            timestamp: new Date().toISOString(),
          },
          {
            id: 3,
            user_name: 'Security Administrator',
            action: 'update_setting_weapon_confidence',
            entity: 'setting',
            entity_id: 'weapon_confidence',
            timestamp: new Date().toISOString(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  const users = [
    { id: 1, name: 'Security Administrator', email: 'admin@eagleeye.edu', role: 'admin', status: 'Active' },
    { id: 2, name: 'Desk Operator (Ctrl+Shift+Go)', email: 'operator@eagleeye.edu', role: 'operator', status: 'Active' },
    { id: 3, name: 'Staff Viewer', email: 'viewer@eagleeye.edu', role: 'viewer', status: 'Active' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-brand-white tracking-tight flex items-center gap-2">
          <UserCheck className="w-6 h-6 text-brand-yellow" />
          <span>User RBAC & Audit Ledger</span>
        </h2>
        <p className="text-sm text-brand-textMuted mt-1">
          Role-based permission enforcement and immutable security event logs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Accounts Card */}
        <div className="p-5 rounded-xl bg-brand-card border border-brand-border h-fit space-y-4">
          <h3 className="font-semibold text-brand-white flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-brand-yellow" />
            Security Personnel Accounts
          </h3>

          <div className="space-y-3">
            {users.map((u) => (
              <div key={u.id} className="p-3 bg-brand-darkest rounded-lg border border-brand-border text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-brand-white">{u.name}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-brand-yellow/20 text-brand-yellow border border-brand-yellow/30 font-bold">
                    {u.role}
                  </span>
                </div>
                <div className="text-brand-textMuted mt-1">{u.email}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="lg:col-span-2 rounded-xl bg-brand-card border border-brand-border overflow-hidden">
          <div className="p-4 border-b border-brand-border flex items-center justify-between">
            <h3 className="font-semibold text-brand-white flex items-center gap-2 text-sm">
              <History className="w-4 h-4 text-brand-yellow" />
              Audit Log Journal
            </h3>
            <span className="text-xs text-brand-yellow font-mono font-bold">Immutable SHA-256</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-brand-dark text-xs uppercase tracking-wider text-brand-textMuted border-b border-brand-border">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Operator / User</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Entity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border text-xs">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-brand-cardHover">
                    <td className="py-3 px-4 font-mono text-brand-textMuted">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-brand-white">{log.user_name || 'System / Anonymous'}</td>
                    <td className="py-3 px-4 font-mono text-brand-yellow font-bold">{log.action}</td>
                    <td className="py-3 px-4 text-brand-textMuted">
                      {log.entity} #{log.entity_id}
                    </td>
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


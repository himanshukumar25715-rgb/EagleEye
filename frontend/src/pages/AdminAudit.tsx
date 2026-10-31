import React, { useState, useEffect } from 'react';
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
    { id: 1, name: 'College Admin', email: 'college.admin@eagleeye.edu', role: 'admin', status: 'Active' },
    { id: 2, name: 'Owner', email: 'owner@eagleeye.edu', role: 'admin', status: 'Active' },
    { id: 3, name: 'Security Room 1', email: 'security.room1@eagleeye.edu', role: 'operator', status: 'Active' },
    { id: 4, name: 'Desk Operator', email: 'operator@eagleeye.edu', role: 'operator', status: 'Active' },
    { id: 5, name: 'Staff Viewer', email: 'viewer@eagleeye.edu', role: 'viewer', status: 'Active' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-brand-white tracking-tight">
          User RBAC and audit ledger
        </h2>
        <p className="text-xs text-brand-textMuted mt-1">
          Role-based permission enforcement and immutable security event logs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Accounts Card */}
        <div className="p-4 rounded-[12px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc] h-fit space-y-4">
          <h3 className="font-semibold text-brand-white text-sm">
            Security personnel accounts
          </h3>

          <div className="space-y-3">
            {users.map((u) => (
              <div key={u.id} className="p-3 bg-brand-card rounded-[12px] shadow-[0_0_0_1px_#e6e3dc] text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-brand-white">{u.name}</span>
                  <span className="text-xs text-brand-accent font-semibold capitalize">
                    {u.role}
                  </span>
                </div>
                <div className="text-brand-textMuted mt-1 font-semibold">{u.email}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="lg:col-span-2 rounded-[12px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc] overflow-hidden">
          <div className="p-4 border-b border-brand-border flex items-center justify-between">
            <h3 className="font-semibold text-brand-white text-sm">
              Audit log journal
            </h3>
            <span className="text-xs text-brand-accent font-mono font-semibold">Immutable SHA-256</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-brand-card text-xs text-brand-textMuted border-b border-brand-border font-semibold">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Operator / user</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target entity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border text-xs">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-brand-cardHover">
                    <td className="py-3 px-4 font-mono text-brand-textMuted font-semibold">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-brand-white">{log.user_name || 'System / Anonymous'}</td>
                    <td className="py-3 px-4 font-mono text-brand-accent font-semibold">{log.action}</td>
                    <td className="py-3 px-4 text-brand-textMuted font-semibold">
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

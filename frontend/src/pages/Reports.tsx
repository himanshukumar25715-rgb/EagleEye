import React, { useState, useEffect } from 'react';
import {
  FileText,
  Mail,
  Send,
  Calendar,
  Clock,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Printer,
  RefreshCw,
  Sliders,
  History,
  Eye,
  Server,
  Camera,
  Check,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { apiRequest } from '../api/client';

interface Incident {
  id: number;
  type: string;
  confidence: number;
  status: string;
  camera_name: string;
  location: string;
  created_at: string;
}

interface ReportData {
  title: string;
  period: string;
  period_label: string;
  period_start: string;
  period_end: string;
  generated_at: string;
  total_alerts: number;
  critical_threats: number;
  breakdown_by_type: Record<string, number>;
  breakdown_by_status: Record<string, number>;
  breakdown_by_camera: Record<string, number>;
  reviewed_count: number;
  false_alarm_rate: number;
  resolution_rate: number;
  active_cameras: number;
  recent_incidents: Incident[];
  trend: Record<string, number>;
  system_status: string;
}

interface ReportRecord {
  id: number;
  report_type: string;
  title: string;
  period_start: string;
  period_end: string;
  recipient_email: string;
  status: string;
  total_alerts: number;
  summary_json?: string;
  html_content?: string;
  error_message?: string;
  sent_at?: string;
  created_at: string;
}

interface ReportConfig {
  auto_enabled: boolean;
  default_recipient: string;
  scheduled_hour: number;
  scheduled_minute: number;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  from_name: string;
}

export const Reports: React.FC = () => {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [activeTab, setActiveTab] = useState<'overview' | 'preview' | 'settings' | 'history'>('overview');
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [testingSmtp, setTestingSmtp] = useState<boolean>(false);

  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [htmlPreview, setHtmlPreview] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [historyList, setHistoryList] = useState<ReportRecord[]>([]);

  // Config settings (dynamically populated from backend .env)
  const [config, setConfig] = useState<ReportConfig>({
    auto_enabled: true,
    default_recipient: '',
    scheduled_hour: 23,
    scheduled_minute: 59,
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_user: '',
    from_name: 'Eagle Eye Surveillance',
  });
  const [savingConfig, setSavingConfig] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Fetch report preview for selected period
  const fetchReportPreview = async (selectedPeriod: 'day' | 'week' | 'month') => {
    setLoading(true);
    try {
      const res = await apiRequest<{ status: string; data: ReportData; html_preview: string }>(
        `/reports/preview?period=${selectedPeriod}`
      );
      setReportData(res.data);
      setHtmlPreview(res.html_preview);
    } catch (err: any) {
      showNotification('error', `Failed to load report: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch past reports history
  const fetchHistory = async () => {
    try {
      const list = await apiRequest<ReportRecord[]>('/reports/history?limit=25');
      setHistoryList(list);
    } catch (err) {
      console.error('Failed to load history', err);
    }
  };

  // Fetch scheduler configuration
  const fetchConfig = async () => {
    try {
      const cfg = await apiRequest<ReportConfig>('/reports/config');
      setConfig(cfg);
      if (cfg.default_recipient) {
        setRecipientEmail(cfg.default_recipient);
      }
    } catch (err) {
      console.error('Failed to load report config', err);
    }
  };

  useEffect(() => {
    fetchReportPreview(period);
  }, [period]);

  useEffect(() => {
    fetchHistory();
    fetchConfig();
  }, []);

  // Send report via email
  const handleSendReport = async (overridePeriod?: string) => {
    setSending(true);
    try {
      const targetPeriod = overridePeriod || period;
      await apiRequest<ReportRecord>('/reports/send', {
        method: 'POST',
        body: JSON.stringify({
          period: targetPeriod,
          recipient_email: recipientEmail,
        }),
      });
      showNotification(
        'success',
        `End of ${targetPeriod} report successfully emailed to ${recipientEmail} via Gmail SMTP!`
      );
      fetchHistory();
    } catch (err: any) {
      showNotification('error', `Dispatch failed: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  // Send test SMTP email
  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    try {
      await apiRequest('/reports/test-smtp', {
        method: 'POST',
        body: JSON.stringify({ recipient_email: recipientEmail }),
      });
      showNotification('success', `Test verification email sent successfully to ${recipientEmail}!`);
    } catch (err: any) {
      showNotification('error', `SMTP test failed: ${err.message}`);
    } finally {
      setTestingSmtp(false);
    }
  };

  // Save scheduler configuration
  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const updated = await apiRequest<ReportConfig>('/reports/config', {
        method: 'PUT',
        body: JSON.stringify({
          auto_enabled: config.auto_enabled,
          default_recipient: config.default_recipient,
          scheduled_hour: Number(config.scheduled_hour),
          scheduled_minute: Number(config.scheduled_minute),
        }),
      });
      setConfig(updated);
      showNotification('success', 'Automated End-of-Day report configuration updated!');
    } catch (err: any) {
      showNotification('error', `Failed to save settings: ${err.message}`);
    } finally {
      setSavingConfig(false);
    }
  };

  // Print report
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlPreview);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background text-brand-black p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* Toast Notification Banner */}
      {notification && (
        <div
          className={`flex items-center justify-between p-4 rounded-[12px] shadow-[0_0_0_1px_#e6e3dc] text-xs font-semibold ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-l-4 border-emerald-600'
              : 'bg-red-50 text-red-900 border-l-4 border-red-600'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-neutral-500 hover:text-neutral-900 text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-brand-accent/10 rounded-[12px] text-brand-accent">
              <FileText className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-semibold text-brand-white">Surveillance reports</h1>
            <span className="px-2 py-0.5 rounded-[12px] text-[11px] font-semibold bg-emerald-100 text-emerald-800">
              SMTP Active
            </span>
          </div>
          <p className="text-xs text-brand-textMuted font-semibold mt-1">
            Automated security intelligence digests, threat analytics, and scheduled end-of-day email reporting
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => fetchReportPreview(period)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] hover:bg-brand-cardHover text-brand-white rounded-[12px] text-xs font-semibold transition"
            title="Refresh preview data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] hover:bg-brand-cardHover text-brand-white rounded-[12px] text-xs font-semibold transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Export / Print</span>
          </button>

          <button
            onClick={() => handleSendReport()}
            disabled={sending}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-brand-accent hover:bg-brand-accentHover text-white rounded-[12px] text-xs font-semibold transition disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{sending ? 'Sending email...' : 'Send report to email'}</span>
          </button>
        </div>
      </div>

      {/* Period Selector & Quick Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Period Segmented Control */}
        <div className="flex items-center gap-1 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] p-1 rounded-[12px] w-fit">
          <button
            onClick={() => setPeriod('day')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[12px] text-xs font-semibold transition ${
              period === 'day'
                ? 'bg-brand-accent text-white shadow-sm'
                : 'text-brand-textMuted hover:text-brand-white hover:bg-brand-cardHover'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>End of day report</span>
          </button>

          <button
            onClick={() => setPeriod('week')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[12px] text-xs font-semibold transition ${
              period === 'week'
                ? 'bg-brand-accent text-white shadow-sm'
                : 'text-brand-textMuted hover:text-brand-white hover:bg-brand-cardHover'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>This week</span>
          </button>

          <button
            onClick={() => setPeriod('month')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[12px] text-xs font-semibold transition ${
              period === 'month'
                ? 'bg-brand-accent text-white shadow-sm'
                : 'text-brand-textMuted hover:text-brand-white hover:bg-brand-cardHover'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>This month</span>
          </button>
        </div>

        {/* Module Sub-tabs */}
        <div className="flex items-center gap-1 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] p-1 rounded-[12px] w-fit">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-[12px] text-xs font-semibold transition ${
              activeTab === 'overview'
                ? 'bg-brand-accent text-white shadow-sm'
                : 'text-brand-textMuted hover:text-brand-white hover:bg-brand-cardHover'
            }`}
          >
            Report intelligence
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-[12px] text-xs font-semibold transition ${
              activeTab === 'preview'
                ? 'bg-brand-accent text-white shadow-sm'
                : 'text-brand-textMuted hover:text-brand-white hover:bg-brand-cardHover'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Email preview</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-[12px] text-xs font-semibold transition ${
              activeTab === 'settings'
                ? 'bg-brand-accent text-white shadow-sm'
                : 'text-brand-textMuted hover:text-brand-white hover:bg-brand-cardHover'
            }`}
          >
            <Sliders className="w-3 h-3" />
            <span>Automated dispatch</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-[12px] text-xs font-semibold transition ${
              activeTab === 'history'
                ? 'bg-brand-accent text-white shadow-sm'
                : 'text-brand-textMuted hover:text-brand-white hover:bg-brand-cardHover'
            }`}
          >
            <History className="w-3 h-3" />
            <span>Dispatch logs</span>
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-brand-textMuted">
            <span>Total alerts</span>
            <FileText className="w-4 h-4 text-brand-accent" />
          </div>
          <div className="mt-2 text-2xl font-semibold text-brand-white">
            {reportData?.total_alerts ?? 0}
          </div>
          <span className="text-[11px] text-brand-textMuted font-semibold mt-1">
            {period === 'day' ? 'Last 24 hours' : period === 'week' ? 'Past 7 days' : 'Past 30 days'}
          </span>
        </div>

        <div className="p-4 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-brand-textMuted">
            <span>Critical threats</span>
            <ShieldAlert className="w-4 h-4 text-brand-red" />
          </div>
          <div className="mt-2 text-2xl font-semibold text-brand-red">
            {reportData?.critical_threats ?? 0}
          </div>
          <span className="text-[11px] text-brand-textMuted font-semibold mt-1">
            Weapons & physical violence
          </span>
        </div>

        <div className="p-4 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-brand-textMuted">
            <span>Resolution rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-semibold text-emerald-600">
            {reportData?.resolution_rate ?? 100}%
          </div>
          <span className="text-[11px] text-brand-textMuted font-semibold mt-1">
            Confirmed threat accuracy
          </span>
        </div>

        <div className="p-4 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-brand-textMuted">
            <span>Active channels</span>
            <Camera className="w-4 h-4 text-brand-accent" />
          </div>
          <div className="mt-2 text-2xl font-semibold text-brand-white">
            {reportData?.active_cameras ?? 9} / 9
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1">
            100% online stream feeds
          </span>
        </div>
      </div>

      {/* TAB CONTENT 1: REPORT OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Dispatch Bar */}
          <div className="p-4 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-brand-accent/10 rounded-[12px] text-brand-accent">
                <Mail className="w-4 h-4" />
              </span>
              <div>
                <p className="text-xs font-semibold text-brand-white">
                  Dispatch {period === 'day' ? 'end of day' : period} report to email
                </p>
                <p className="text-[11px] font-semibold text-brand-textMuted">
                  Delivered from {config.smtp_user} via Google SMTP (Port 587 TLS)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="recipient@example.com"
                className="px-3 py-1.5 bg-background shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] text-xs font-semibold text-brand-white w-full sm:w-64 focus:outline-none focus:ring-1 focus:ring-brand-accent"
              />
              <button
                onClick={() => handleSendReport()}
                disabled={sending}
                className="px-4 py-1.5 bg-brand-accent hover:bg-brand-accentHover text-white rounded-[12px] text-xs font-semibold transition shrink-0 disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Send now'}
              </button>
            </div>
          </div>

          {/* Breakdown Section: Types & Hotspots */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Incident Type Breakdown */}
            <div className="p-5 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-brand-white">
                  Incident classification breakdown
                </h3>
                <span className="text-[11px] font-semibold text-brand-textMuted">
                  {reportData?.total_alerts ?? 0} total
                </span>
              </div>

              <div className="space-y-3.5">
                {Object.entries(reportData?.breakdown_by_type || {}).map(([type, count]) => {
                  const total = reportData?.total_alerts || 1;
                  const pct = Math.round((count / total) * 100);
                  const isCritical = type === 'weapon' || type === 'fight';

                  return (
                    <div key={type} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="capitalize text-brand-white">{type.replace('_', ' ')}</span>
                        <span className={isCritical && count > 0 ? 'text-brand-red' : 'text-brand-textMuted'}>
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCritical ? 'bg-brand-red' : 'bg-brand-accent'
                          }`}
                          style={{ width: `${Math.max(pct, count > 0 ? 6 : 0)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Camera Hotspots Breakdown */}
            <div className="p-5 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-brand-white">
                  Monitored camera hotspots
                </h3>
                <span className="text-[11px] font-semibold text-brand-textMuted">
                  9 active feeds
                </span>
              </div>

              <div className="space-y-2.5">
                {Object.entries(reportData?.breakdown_by_camera || {}).map(([camName, count]) => (
                  <div
                    key={camName}
                    className="flex items-center justify-between p-2.5 bg-background shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] text-xs font-semibold"
                  >
                    <div className="flex items-center gap-2">
                      <Camera className="w-3.5 h-3.5 text-brand-accent" />
                      <span className="text-brand-white">{camName}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-[12px] bg-neutral-100 text-neutral-800 text-[11px]">
                      {count} {count === 1 ? 'incident' : 'incidents'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Priority Incidents Table */}
          <div className="p-5 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-brand-white">
                  Flagged surveillance incidents
                </h3>
                <p className="text-[11px] font-semibold text-brand-textMuted mt-0.5">
                  Chronological security events captured during this reporting period
                </p>
              </div>
              <span className="text-xs font-semibold text-brand-textMuted">
                {reportData?.recent_incidents?.length || 0} events listed
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-semibold">
                <thead>
                  <tr className="border-b border-brand-border text-brand-textMuted text-[11px] uppercase">
                    <th className="py-2.5 px-3">ID</th>
                    <th className="py-2.5 px-3">Camera / location</th>
                    <th className="py-2.5 px-3">Threat type</th>
                    <th className="py-2.5 px-3">Confidence</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/40">
                  {reportData?.recent_incidents && reportData.recent_incidents.length > 0 ? (
                    reportData.recent_incidents.map((inc) => (
                      <tr key={inc.id} className="hover:bg-brand-cardHover transition">
                        <td className="py-2.5 px-3 font-mono text-brand-textMuted">#{inc.id}</td>
                        <td className="py-2.5 px-3 text-brand-white font-semibold">
                          {inc.camera_name}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-[12px] text-[11px] font-semibold ${
                              inc.type === 'weapon' || inc.type === 'fight'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {inc.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-brand-white font-mono">
                          {inc.confidence}%
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-[12px] text-[11px] font-semibold ${
                              inc.status === 'confirmed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : inc.status === 'false_alarm'
                                ? 'bg-neutral-100 text-neutral-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {inc.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-brand-textMuted font-mono text-[11px]">
                          {inc.created_at}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-brand-textMuted">
                        No security incidents recorded during this timeframe.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: EMAIL PREVIEW */}
      {activeTab === 'preview' && (
        <div className="space-y-4">
          <div className="p-4 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-brand-white">
                Interactive email template preview
              </h3>
              <p className="text-[11px] font-semibold text-brand-textMuted">
                This exact responsive HTML layout will be sent to {recipientEmail}
              </p>
            </div>
            <button
              onClick={() => handleSendReport()}
              disabled={sending}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-brand-accent hover:bg-brand-accentHover text-white rounded-[12px] text-xs font-semibold transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{sending ? 'Sending...' : 'Send this to my inbox'}</span>
            </button>
          </div>

          <div className="bg-white shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] overflow-hidden min-h-[600px] p-4 flex justify-center">
            <iframe
              srcDoc={htmlPreview}
              title="Report Email Preview"
              className="w-full max-w-[720px] h-[750px] border-0 rounded-[12px]"
            />
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: AUTOMATED DISPATCH SETTINGS */}
      {activeTab === 'settings' && (
        <div className="max-w-3xl space-y-5">
          {/* Daily Schedule Configuration Card */}
          <div className="p-6 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] space-y-5">
            <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
              <div>
                <h3 className="text-xs font-semibold text-brand-white">
                  Automated end-of-the-day email report
                </h3>
                <p className="text-[11px] font-semibold text-brand-textMuted">
                  Automatically compiles and sends the 24-hour campus security report at your chosen time
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.auto_enabled}
                  onChange={(e) => setConfig({ ...config, auto_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-accent" />
              </label>
            </div>

            {/* Recipient Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-brand-white">
                Primary recipient email address
              </label>
              <input
                type="email"
                value={config.default_recipient}
                onChange={(e) => setConfig({ ...config, default_recipient: e.target.value })}
                className="w-full px-3 py-2 bg-background shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] text-xs font-semibold text-brand-white focus:outline-none focus:ring-1 focus:ring-brand-accent"
              />
              <span className="text-[11px] font-semibold text-brand-textMuted">
                Daily, weekly, and monthly security briefs will be delivered here
              </span>
            </div>

            {/* Scheduled Hour / Minute */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-brand-white">
                  Scheduled dispatch hour (00-23)
                </label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={config.scheduled_hour}
                  onChange={(e) => setConfig({ ...config, scheduled_hour: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-background shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] text-xs font-semibold text-brand-white focus:outline-none focus:ring-1 focus:ring-brand-accent"
                />
                <span className="text-[11px] font-semibold text-brand-textMuted">
                  23 = 11 PM local time
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-brand-white">
                  Scheduled dispatch minute (00-59)
                </label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={config.scheduled_minute}
                  onChange={(e) => setConfig({ ...config, scheduled_minute: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-background shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] text-xs font-semibold text-brand-white focus:outline-none focus:ring-1 focus:ring-brand-accent"
                />
                <span className="text-[11px] font-semibold text-brand-textMuted">
                  59 = end of the day
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                onClick={handleSaveConfig}
                disabled={savingConfig}
                className="px-4 py-2 bg-brand-accent hover:bg-brand-accentHover text-white rounded-[12px] text-xs font-semibold transition disabled:opacity-50"
              >
                {savingConfig ? 'Saving...' : 'Save schedule preferences'}
              </button>
            </div>
          </div>

          {/* Active SMTP Connection Card */}
          <div className="p-6 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] space-y-4">
            <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-brand-accent" />
                <h3 className="text-xs font-semibold text-brand-white">
                  SMTP configuration (Google Mail)
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-[12px] text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                Connected
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-semibold">
              <div className="p-3 bg-background shadow-[0_0_0_1px_#e6e3dc] rounded-[12px]">
                <div className="text-brand-textMuted text-[11px]">SMTP Host</div>
                <div className="text-brand-white font-mono mt-0.5">{config.smtp_host}</div>
              </div>
              <div className="p-3 bg-background shadow-[0_0_0_1px_#e6e3dc] rounded-[12px]">
                <div className="text-brand-textMuted text-[11px]">Port & Security</div>
                <div className="text-brand-white font-mono mt-0.5">{config.smtp_port} (TLS / STARTTLS)</div>
              </div>
              <div className="p-3 bg-background shadow-[0_0_0_1px_#e6e3dc] rounded-[12px]">
                <div className="text-brand-textMuted text-[11px]">Auth User</div>
                <div className="text-brand-white font-mono mt-0.5">{config.smtp_user}</div>
              </div>
              <div className="p-3 bg-background shadow-[0_0_0_1px_#e6e3dc] rounded-[12px]">
                <div className="text-brand-textMuted text-[11px]">From Name</div>
                <div className="text-brand-white mt-0.5">{config.from_name}</div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] font-semibold text-brand-textMuted">
                Verified with app password credentials
              </span>
              <button
                onClick={handleTestSmtp}
                disabled={testingSmtp}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] hover:bg-brand-cardHover text-brand-white rounded-[12px] text-xs font-semibold transition disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{testingSmtp ? 'Sending test...' : 'Send test verification email'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: DISPATCH HISTORY */}
      {activeTab === 'history' && (
        <div className="p-5 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-brand-white">
                Dispatched reports history
              </h3>
              <p className="text-[11px] font-semibold text-brand-textMuted">
                Audit trail of reports compiled and sent via SMTP
              </p>
            </div>
            <button
              onClick={fetchHistory}
              className="flex items-center gap-1 px-3 py-1 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] hover:bg-brand-cardHover text-brand-white rounded-[12px] text-xs font-semibold transition"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh history</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold">
              <thead>
                <tr className="border-b border-brand-border text-brand-textMuted text-[11px] uppercase">
                  <th className="py-2.5 px-3">Report ID</th>
                  <th className="py-2.5 px-3">Period</th>
                  <th className="py-2.5 px-3">Title</th>
                  <th className="py-2.5 px-3">Recipient</th>
                  <th className="py-2.5 px-3">Alerts</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Dispatched at</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40">
                {historyList && historyList.length > 0 ? (
                  historyList.map((rep) => (
                    <tr key={rep.id} className="hover:bg-brand-cardHover transition">
                      <td className="py-2.5 px-3 font-mono text-brand-textMuted">#{rep.id}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-[12px] text-[11px] font-semibold bg-neutral-100 text-neutral-800 capitalize">
                          {rep.report_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-brand-white font-semibold max-w-[240px] truncate">
                        {rep.title}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-brand-textMuted">
                        {rep.recipient_email}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-brand-white">
                        {rep.total_alerts}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-[12px] text-[11px] font-semibold ${
                            rep.status === 'sent'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rep.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-neutral-100 text-neutral-800'
                          }`}
                        >
                          {rep.status === 'sent' ? 'Sent via SMTP' : rep.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-brand-textMuted font-mono text-[11px]">
                        {rep.sent_at || rep.created_at}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-brand-textMuted">
                      No reports dispatched yet. Click "Send report to email" to generate your first audit!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};


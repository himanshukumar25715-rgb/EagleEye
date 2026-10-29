import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  ArrowUpRight, 
  ShieldAlert, 
  Clock, 
  MapPin, 
  Hash, 
  FileText,
  Lock
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { StatusBadge, TypeBadge } from '../components/Badges';
import { useAuthStore } from '../stores/authStore';

export const AlertReview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [alert, setAlert] = useState<any>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadAlert() {
      try {
        const data = await apiRequest<any>(`/alerts/${id}`);
        setAlert(data);
        if (data.review_note) setReviewNote(data.review_note);
      } catch {
        setAlert({
          id: Number(id) || 1,
          type: 'weapon',
          confidence: 0.89,
          status: 'new',
          location_label: 'Campus Gate 1 - North Boundary',
          source_name: 'Main Entrance Gate 1',
          track_ids: 'TRK-104',
          frame_start: 120,
          frame_end: 135,
          ts_start: 4.8,
          ts_end: 5.4,
          created_at: new Date().toISOString(),
          evidence_items: [
            {
              id: 101,
              kind: 'frame',
              path: '/evidence/sample_weapon.jpg',
              sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            },
          ],
        });
      } finally {
        setLoading(false);
      }
    }
    loadAlert();
  }, [id]);

  const handleDecision = async (status: 'confirmed' | 'false_alarm' | 'escalated') => {
    if (!id) return;
    setSubmitting(true);
    setSuccessMsg(null);
    try {
      const updated = await apiRequest<any>(`/alerts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          review_note: reviewNote,
        }),
      });
      setAlert(updated);
      setSuccessMsg(`Incident successfully marked as ${status.replace('_', ' ').toUpperCase()}`);
    } catch (e: any) {
      alert(`Error updating review: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const isViewer = user?.role === 'viewer';

  if (loading || !alert) {
    return <div className="text-sm text-campus-textMuted">Loading incident record...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top back navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/alerts')}
          className="flex items-center gap-2 text-xs font-semibold text-campus-gold hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Alert Queue</span>
        </button>

        <div className="flex items-center gap-3">
          <TypeBadge type={alert.type} />
          <StatusBadge status={alert.status} />
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-950/70 border border-emerald-600 rounded-lg text-xs font-semibold text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Review Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Evidence Visual Panel (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl bg-campus-card border border-campus-border p-4">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-campus-gold" />
                Captured Evidence Snapshot
              </span>
              <span className="text-xs font-mono text-campus-textMuted">
                Timestamp: {alert.ts_start?.toFixed(1) || '0.0'}s (Frame #{alert.frame_start})
              </span>
            </h3>

            {/* Evidence Visual Canvas */}
            <div className="relative aspect-video rounded-lg bg-campus-darkest border border-campus-border flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/20 to-black/80 flex items-center justify-center p-6 text-center">
                <div className="space-y-2">
                  <div className="w-16 h-16 mx-auto rounded-full bg-red-950/60 border border-red-500 flex items-center justify-center text-red-400">
                    <ShieldAlert className="w-8 h-8" />
                  </div>
                  <h4 className="font-bold text-white text-base">Candidate Incident Flagged</h4>
                  <p className="text-xs text-campus-textMuted max-w-md">
                    AI bounding track detected at {alert.location_label}. Multi-frame rule satisfied.
                  </p>
                  <div className="inline-block px-3 py-1 rounded bg-black/60 border border-campus-border text-[11px] font-mono text-campus-gold">
                    AI Confidence: {(alert.confidence * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Simulated Bounding Box Overlay */}
              <div className="absolute border-2 border-red-500 bg-red-500/10 rounded w-48 h-36 top-1/4 left-1/3 flex flex-col justify-between p-1.5 pointer-events-none">
                <span className="bg-red-600 text-white text-[10px] font-bold px-1 py-0.5 rounded w-fit">
                  {alert.type.toUpperCase()} {(alert.confidence * 100).toFixed(0)}%
                </span>
                <span className="text-[10px] font-mono text-red-300 self-end">
                  {alert.track_ids || 'TRK-ID'}
                </span>
              </div>
            </div>

            {/* Cryptographic Hash Verification */}
            <div className="mt-3 p-3 bg-campus-darkest rounded-lg border border-campus-border flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 text-campus-textMuted">
                <Lock className="w-3.5 h-3.5 text-campus-gold" />
                <span>SHA-256 Chain Integrity:</span>
              </div>
              <span className="text-gray-400 truncate max-w-xs">
                {alert.evidence_items?.[0]?.sha256 || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
              </span>
            </div>
          </div>
        </div>

        {/* Verification Controls & Metadata (Right 1 col) */}
        <div className="space-y-4">
          {/* Metadata Card */}
          <div className="p-4 rounded-xl bg-campus-card border border-campus-border space-y-3 text-xs">
            <h4 className="font-semibold text-white uppercase tracking-wider text-[11px]">
              Incident Metadata
            </h4>
            <div className="flex justify-between border-b border-campus-border/60 pb-2">
              <span className="text-campus-textMuted">Incident ID:</span>
              <span className="font-mono text-white font-bold">#{alert.id}</span>
            </div>
            <div className="flex justify-between border-b border-campus-border/60 pb-2">
              <span className="text-campus-textMuted">Camera Feed:</span>
              <span className="text-white font-medium">{alert.source_name}</span>
            </div>
            <div className="flex justify-between border-b border-campus-border/60 pb-2">
              <span className="text-campus-textMuted">Campus Zone:</span>
              <span className="text-white font-medium">{alert.location_label}</span>
            </div>
            <div className="flex justify-between border-b border-campus-border/60 pb-2">
              <span className="text-campus-textMuted">Track IDs:</span>
              <span className="font-mono text-campus-gold">{alert.track_ids || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-campus-textMuted">Triggered At:</span>
              <span className="text-white">{new Date(alert.created_at).toLocaleString()}</span>
            </div>
          </div>

          {/* Verification Decision Form */}
          <div className="p-4 rounded-xl bg-campus-card border border-campus-border space-y-3">
            <h4 className="font-semibold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-campus-gold" />
              Human Operator Review
            </h4>

            {isViewer ? (
              <p className="text-xs text-campus-textMuted italic">
                Viewer accounts have read-only access. Operator or Admin credentials required to submit verification decisions.
              </p>
            ) : (
              <>
                <div>
                  <label className="block text-xs text-campus-textMuted mb-1 font-medium">
                    Reviewer Notes / Incident Context:
                  </label>
                  <textarea
                    rows={3}
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="e.g. Confirmed student carrying prohibited item; Campus security dispatched to Gate 1."
                    className="w-full px-3 py-2 bg-campus-darkest border border-campus-border rounded-lg text-xs text-white focus:outline-none focus:border-campus-gold"
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => handleDecision('confirmed')}
                    disabled={submitting}
                    className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm as Real Incident</span>
                  </button>

                  <button
                    onClick={() => handleDecision('false_alarm')}
                    disabled={submitting}
                    className="w-full py-2 px-3 rounded-lg bg-campus-dark border border-campus-border hover:bg-campus-cardHover text-gray-300 font-semibold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4 text-gray-400" />
                    <span>Dismiss as False Alarm</span>
                  </button>

                  <button
                    onClick={() => handleDecision('escalated')}
                    disabled={submitting}
                    className="w-full py-2 px-3 rounded-lg bg-purple-950/60 border border-purple-800 hover:bg-purple-900 text-purple-300 font-semibold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Escalate to Security Chief</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


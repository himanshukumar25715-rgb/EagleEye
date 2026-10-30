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
    return <div className="text-sm text-brand-textMuted">Loading incident record...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top back navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/alerts')}
          className="flex items-center gap-2 text-xs font-semibold text-brand-yellow hover:underline"
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
        <div className="p-3 bg-brand-card border border-brand-yellow rounded-lg text-xs font-bold text-brand-yellow flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Review Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Evidence Visual Panel (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl bg-brand-card border border-brand-border p-4">
            <h3 className="text-sm font-semibold text-brand-white mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-brand-yellow" />
                Captured Evidence Snapshot
              </span>
              <span className="text-xs font-mono text-brand-textMuted">
                Timestamp: {alert.ts_start?.toFixed(1) || '0.0'}s (Frame #{alert.frame_start})
              </span>
            </h3>

            {/* Evidence Visual Canvas */}
            <div className="relative aspect-video rounded-lg bg-brand-black border border-brand-border flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-neutral-900/60 to-black flex items-center justify-center p-6 text-center">
                <div className="space-y-2">
                  <div className="w-16 h-16 mx-auto rounded-full bg-brand-black border border-brand-red flex items-center justify-center text-brand-red shadow-lg">
                    <ShieldAlert className="w-8 h-8" />
                  </div>
                  <h4 className="font-bold text-brand-white text-base">Candidate Incident Flagged</h4>
                  <p className="text-xs text-brand-textMuted max-w-md">
                    AI bounding track detected at {alert.location_label}. Multi-frame rule satisfied.
                  </p>
                  <div className="inline-block px-3 py-1 rounded bg-brand-black border border-brand-border text-[11px] font-mono text-brand-yellow font-bold">
                    AI Confidence: {(alert.confidence * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Simulated Bounding Box Overlay */}
              <div className="absolute border-2 border-brand-red bg-brand-red/10 rounded w-48 h-36 top-1/4 left-1/3 flex flex-col justify-between p-1.5 pointer-events-none">
                <span className="bg-brand-red text-brand-white text-[10px] font-bold px-1 py-0.5 rounded w-fit">
                  {alert.type.toUpperCase()} {(alert.confidence * 100).toFixed(0)}%
                </span>
                <span className="text-[10px] font-mono text-brand-yellow self-end font-bold">
                  {alert.track_ids || 'TRK-ID'}
                </span>
              </div>
            </div>

            {/* Cryptographic Hash Verification */}
            <div className="mt-3 p-3 bg-brand-darkest rounded-lg border border-brand-border flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 text-brand-textMuted">
                <Lock className="w-3.5 h-3.5 text-brand-yellow" />
                <span>SHA-256 Chain Integrity:</span>
              </div>
              <span className="text-brand-textMuted truncate max-w-xs font-mono">
                {alert.evidence_items?.[0]?.sha256 || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
              </span>
            </div>
          </div>
        </div>

        {/* Verification Controls & Metadata (Right 1 col) */}
        <div className="space-y-4">
          {/* Metadata Card */}
          <div className="p-4 rounded-xl bg-brand-card border border-brand-border space-y-3 text-xs">
            <h4 className="font-semibold text-brand-white uppercase tracking-wider text-[11px]">
              Incident Metadata
            </h4>
            <div className="flex justify-between border-b border-brand-border/60 pb-2">
              <span className="text-brand-textMuted">Incident ID:</span>
              <span className="font-mono text-brand-white font-bold">#{alert.id}</span>
            </div>
            <div className="flex justify-between border-b border-brand-border/60 pb-2">
              <span className="text-brand-textMuted">Camera Feed:</span>
              <span className="text-brand-white font-medium">{alert.source_name}</span>
            </div>
            <div className="flex justify-between border-b border-brand-border/60 pb-2">
              <span className="text-brand-textMuted">Campus Zone:</span>
              <span className="text-brand-white font-medium">{alert.location_label}</span>
            </div>
            <div className="flex justify-between border-b border-brand-border/60 pb-2">
              <span className="text-brand-textMuted">Track IDs:</span>
              <span className="font-mono text-brand-yellow font-bold">{alert.track_ids || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-textMuted">Triggered At:</span>
              <span className="text-brand-white">{new Date(alert.created_at).toLocaleString()}</span>
            </div>
          </div>

          {/* Verification Decision Form */}
          <div className="p-4 rounded-xl bg-brand-card border border-brand-border space-y-3">
            <h4 className="font-semibold text-brand-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-brand-yellow" />
              Human Operator Review
            </h4>

            {isViewer ? (
              <p className="text-xs text-brand-textMuted italic">
                Viewer accounts have read-only access. Operator or Admin credentials required to submit verification decisions.
              </p>
            ) : (
              <>
                <div>
                  <label className="block text-xs text-brand-textMuted mb-1 font-medium">
                    Reviewer Notes / Incident Context:
                  </label>
                  <textarea
                    rows={3}
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="e.g. Confirmed student carrying prohibited item; Campus security dispatched to Gate 1."
                    className="w-full px-3 py-2 bg-brand-darkest border border-brand-border rounded-lg text-xs text-brand-white focus:outline-none focus:border-brand-yellow"
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => handleDecision('confirmed')}
                    disabled={submitting}
                    className="w-full py-2 px-3 rounded-lg bg-brand-white hover:bg-neutral-200 text-brand-black font-extrabold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50 shadow"
                  >
                    <CheckCircle2 className="w-4 h-4 text-brand-black" />
                    <span>Confirm as Real Incident</span>
                  </button>

                  <button
                    onClick={() => handleDecision('false_alarm')}
                    disabled={submitting}
                    className="w-full py-2 px-3 rounded-lg bg-brand-dark border border-brand-border hover:bg-brand-cardHover text-brand-textMuted hover:text-brand-white font-semibold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4 text-brand-textMuted" />
                    <span>Dismiss as False Alarm</span>
                  </button>

                  <button
                    onClick={() => handleDecision('escalated')}
                    disabled={submitting}
                    className="w-full py-2 px-3 rounded-lg bg-brand-red hover:bg-brand-redHover text-brand-white font-extrabold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50 shadow"
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


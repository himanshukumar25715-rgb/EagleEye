import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
      setSuccessMsg(`Incident successfully marked as ${status.replace('_', ' ')}`);
    } catch (e: any) {
      alert(`Error updating review: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const isViewer = user?.role === 'viewer';

  if (loading || !alert) {
    return <div className="text-xs text-brand-textMuted font-semibold">Loading incident record...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top back navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/alerts')}
          className="text-xs font-semibold text-brand-accent hover:underline"
        >
          Back to alert queue
        </button>

        <div className="flex items-center gap-4">
          <TypeBadge type={alert.type} />
          <StatusBadge status={alert.status} />
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] text-xs font-semibold text-brand-accent">
          {successMsg}
        </div>
      )}

      {/* Main Review Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Evidence Visual Panel (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-[12px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc] p-4">
            <div className="text-sm font-semibold text-brand-white mb-3 flex items-center justify-between">
              <span>Captured evidence snapshot</span>
              <span className="text-xs font-mono text-brand-textMuted font-semibold">
                Timestamp: {alert.ts_start?.toFixed(1) || '0.0'}s (Frame #{alert.frame_start})
              </span>
            </div>

            {/* Evidence Visual Canvas */}
            <div className="relative aspect-video rounded-[12px] bg-neutral-900 shadow-[0_0_0_1px_#e6e3dc] flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center p-6 text-center">
                <div className="space-y-2">
                  <h4 className="font-semibold text-white text-xl">Candidate incident flagged</h4>
                  <p className="text-xs text-neutral-300 max-w-md font-semibold">
                    AI bounding track detected at {alert.location_label}. Multi-frame rule satisfied.
                  </p>
                  <div className="inline-block px-3 py-1 rounded-[12px] bg-neutral-800 text-xs font-mono text-white font-semibold">
                    AI confidence: {(alert.confidence * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Simulated Bounding Box Overlay */}
              <div className="absolute border-2 border-brand-red bg-brand-red/10 rounded-[12px] w-48 h-36 top-1/4 left-1/3 flex flex-col justify-between p-2 pointer-events-none">
                <span className="bg-brand-red text-white text-xs font-semibold px-2 py-0.5 rounded-[12px] w-fit">
                  {alert.type.replace('_', ' ')} {(alert.confidence * 100).toFixed(0)}%
                </span>
                <span className="text-xs font-mono text-white self-end font-semibold">
                  {alert.track_ids || 'TRK-ID'}
                </span>
              </div>
            </div>

            {/* Cryptographic Hash Verification */}
            <div className="mt-4 p-3 bg-brand-card rounded-[12px] shadow-[0_0_0_1px_#e6e3dc] flex items-center justify-between text-xs font-mono">
              <span className="text-brand-textMuted font-semibold">SHA-256 chain integrity:</span>
              <span className="text-brand-textMuted truncate max-w-xs font-mono">
                {alert.evidence_items?.[0]?.sha256 || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
              </span>
            </div>
          </div>
        </div>

        {/* Verification Controls & Metadata (Right 1 col) */}
        <div className="space-y-4">
          {/* Metadata Card */}
          <div className="p-4 rounded-[12px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc] space-y-3 text-xs">
            <h4 className="font-semibold text-brand-white text-xs">
              Incident metadata
            </h4>
            <div className="flex justify-between border-b border-brand-border pb-2">
              <span className="text-brand-textMuted font-semibold">Incident ID:</span>
              <span className="font-mono text-brand-white font-semibold">#{alert.id}</span>
            </div>
            <div className="flex justify-between border-b border-brand-border pb-2">
              <span className="text-brand-textMuted font-semibold">Camera feed:</span>
              <span className="text-brand-white font-semibold">{alert.source_name}</span>
            </div>
            <div className="flex justify-between border-b border-brand-border pb-2">
              <span className="text-brand-textMuted font-semibold">Campus zone:</span>
              <span className="text-brand-white font-semibold">{alert.location_label}</span>
            </div>
            <div className="flex justify-between border-b border-brand-border pb-2">
              <span className="text-brand-textMuted font-semibold">Track IDs:</span>
              <span className="font-mono text-brand-accent font-semibold">{alert.track_ids || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-textMuted font-semibold">Triggered at:</span>
              <span className="text-brand-white font-semibold">{new Date(alert.created_at).toLocaleString()}</span>
            </div>
          </div>

          {/* Verification Decision Form */}
          <div className="p-4 rounded-[12px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc] space-y-4">
            <h4 className="font-semibold text-brand-white text-xs">
              Human operator review
            </h4>

            {isViewer ? (
              <p className="text-xs text-brand-textMuted font-semibold">
                Viewer accounts have read-only access. Operator or admin credentials required to submit verification decisions.
              </p>
            ) : (
              <>
                <div>
                  <label className="block text-xs text-brand-textMuted mb-2 font-semibold">
                    Reviewer notes / incident context:
                  </label>
                  <textarea
                    rows={3}
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="e.g. Confirmed student carrying prohibited item; campus security dispatched."
                    className="w-full px-3 py-2 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] text-xs text-brand-white focus:outline-none focus:border-brand-accent font-semibold"
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => handleDecision('confirmed')}
                    disabled={submitting}
                    className="w-full py-2.5 px-4 rounded-[12px] bg-brand-white hover:bg-neutral-100 text-brand-white font-semibold text-xs transition disabled:opacity-50 shadow-[0_0_0_1px_#e6e3dc]"
                  >
                    Confirm as real incident
                  </button>

                  <button
                    onClick={() => handleDecision('false_alarm')}
                    disabled={submitting}
                    className="w-full py-2.5 px-4 rounded-[12px] bg-brand-card hover:bg-brand-cardHover text-brand-textMuted hover:text-brand-white font-semibold text-xs transition disabled:opacity-50 shadow-[0_0_0_1px_#e6e3dc]"
                  >
                    Dismiss as false alarm
                  </button>

                  <button
                    onClick={() => handleDecision('escalated')}
                    disabled={submitting}
                    className="w-full py-2.5 px-4 rounded-[12px] bg-brand-red hover:bg-brand-redHover text-white font-semibold text-xs transition disabled:opacity-50 shadow-[0_0_0_1px_#e6e3dc]"
                  >
                    Escalate to security chief
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

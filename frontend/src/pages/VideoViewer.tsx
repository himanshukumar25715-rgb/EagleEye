import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Layers, 
  MapPin, 
  Cpu, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';
import { apiRequest, BASE_URL } from '../api/client';
import { useAlertStore } from '../stores/alertStore';

export const VideoViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeJobs } = useAlertStore();

  const [job, setJob] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [showOverlays, setShowOverlays] = useState(true);
  const [loading, setLoading] = useState(true);

  // Check if live job state exists in store
  const liveProgress = id ? activeJobs[Number(id)] : null;

  useEffect(() => {
    async function fetchJobAndAlerts() {
      try {
        const jobData = await apiRequest<any>(`/jobs/${id}`);
        setJob(jobData);
        const alertsData = await apiRequest<any[]>(`/alerts?source_id=${jobData.source_id || 1}`);
        setAlerts(alertsData);
      } catch {
        setJob({
          id: Number(id) || 1,
          source_name: 'Main Entrance Gate 1',
          source_location: 'Campus Gate 1 - North Boundary',
          status: 'completed',
          progress_pct: 100.0,
          processed_fps: 24.8,
        });
      } finally {
        setLoading(false);
      }
    }
    fetchJobAndAlerts();
  }, [id]);

  const handleCancel = async () => {
    if (!id) return;
    try {
      await apiRequest(`/jobs/${id}/cancel`, { method: 'POST' });
      setJob((prev: any) => ({ ...prev, status: 'cancelled' }));
    } catch (e) {
      console.error(e);
    }
  };

  const currentStatus = liveProgress?.status || job?.status || 'completed';
  const currentProgress = liveProgress?.progress_pct ?? job?.progress_pct ?? 100;
  const currentFps = liveProgress?.processed_fps ?? job?.processed_fps ?? 24.0;

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/sources')}
            className="p-2 rounded-lg bg-campus-card border border-campus-border hover:bg-campus-border text-campus-textMuted hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>{job?.source_name || `Surveillance Feed #${id}`}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-campus-gold/20 text-campus-gold border border-campus-gold/30">
                Job #{id}
              </span>
            </h2>
            <div className="flex items-center gap-2 text-xs text-campus-textMuted mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-campus-gold" />
              <span>{job?.source_location || 'Campus Perimeter'}</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowOverlays(!showOverlays)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition ${
              showOverlays
                ? 'bg-campus-gold text-campus-darkest border-campus-gold'
                : 'bg-campus-card text-campus-textMuted border-campus-border'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>AI Bounding Overlays: {showOverlays ? 'ON' : 'OFF'}</span>
          </button>

          {currentStatus === 'processing' && (
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-950/70 text-red-400 border border-red-800 hover:bg-red-900 flex items-center gap-1.5 transition"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Abort Job</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Video Stream Container */}
      <div className="relative aspect-video w-full max-w-5xl mx-auto rounded-xl bg-campus-darkest border border-campus-border overflow-hidden shadow-2xl flex items-center justify-center">
        {/* MJPEG Live Stream or Seekable Video */}
        {currentStatus === 'processing' ? (
          <img
            src={`${BASE_URL}/jobs/${id}/stream`}
            alt="Annotated MJPEG Feed"
            className="w-full h-full object-contain"
          />
        ) : (
          <video
            src={`${BASE_URL}/jobs/${id}/video`}
            controls
            autoPlay
            muted
            className="w-full h-full object-contain"
          />
        )}

        {/* Real-time HUD Status Overlay */}
        <div className="absolute top-4 left-4 bg-campus-darkest/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-campus-border text-xs flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono">
            <span className={`w-2 h-2 rounded-full ${currentStatus === 'processing' ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
            <span className="uppercase font-bold text-white">{currentStatus}</span>
          </div>
          <span className="text-campus-border">|</span>
          <div className="flex items-center gap-1 text-campus-textMuted font-mono">
            <Cpu className="w-3.5 h-3.5 text-campus-gold" />
            <span>{currentFps} FPS</span>
          </div>
        </div>
      </div>

      {/* Pipeline Progress Bar */}
      <div className="p-4 rounded-xl bg-campus-card border border-campus-border space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-campus-gold" />
            <span className="font-semibold text-white">Analysis Pipeline Progress:</span>
          </div>
          <span className="font-mono font-bold text-campus-gold">{currentProgress.toFixed(1)}%</span>
        </div>
        <div className="w-full h-2.5 bg-campus-darkest rounded-full overflow-hidden border border-campus-border">
          <div
            className="h-full bg-gradient-to-r from-campus-gold to-emerald-400 transition-all duration-300"
            style={{ width: `${currentProgress}%` }}
          />
        </div>
      </div>

      {/* Timeline Alert Markers */}
      <div className="rounded-xl bg-campus-card border border-campus-border p-4">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-campus-gold" />
          <span>Timeline Incident Annotations ({alerts.length})</span>
        </h3>

        {alerts.length === 0 ? (
          <p className="text-xs text-campus-textMuted">No security incidents flagged during this video sequence.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {alerts.map((al) => (
              <button
                key={al.id}
                onClick={() => navigate(`/alerts/${al.id}`)}
                className="px-3 py-1.5 rounded bg-campus-darkest border border-campus-border hover:border-campus-gold text-xs flex items-center gap-2 text-white transition"
              >
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="font-medium capitalize">{al.type}</span>
                <span className="text-campus-textMuted font-mono">@{al.ts_start?.toFixed(1) || '0.0'}s</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};


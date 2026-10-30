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
  ArrowLeft,
  Grid,
  Radio,
  ExternalLink,
  ShieldAlert,
  Flame,
  Briefcase,
  Users
} from 'lucide-react';
import { apiRequest, BASE_URL } from '../api/client';
import { useAlertStore } from '../stores/alertStore';
import { StatusBadge, TypeBadge } from '../components/Badges';

export const VideoViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeJobs, liveAlerts } = useAlertStore();

  const [job, setJob] = useState<any>(null);
  const [allSources, setAllSources] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [showMatrix, setShowMatrix] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const currentJobId = Number(id) || 1;
  const liveProgress = activeJobs[currentJobId];

  useEffect(() => {
    fetchJobAndAlerts();
    loadAllSources();
  }, [id]);

  async function loadAllSources() {
    try {
      const data = await apiRequest<any[]>('/sources');
      setAllSources(data);
    } catch {
      // Demo fallback
    }
  }

  async function fetchJobAndAlerts() {
    try {
      const jobData = await apiRequest<any>(`/jobs/${currentJobId}`);
      setJob(jobData);
      const alertsData = await apiRequest<any[]>(`/alerts?source_id=${jobData.source_id || currentJobId}`);
      setAlerts(alertsData);
    } catch {
      setJob({
        id: currentJobId,
        source_name: `CCTV Surveillance Feed #${currentJobId}`,
        source_location: 'Campus Security Perimeter',
        status: 'processing',
        progress_pct: 0.0,
        processed_fps: 18.5,
      });
    }
  }

  const handleStartAnalysis = async () => {
    setIsStarting(true);
    try {
      await apiRequest(`/jobs/${currentJobId}/start`, { method: 'POST' });
      setJob((prev: any) => ({ ...prev, status: 'processing', progress_pct: 0.0 }));
    } catch (e: any) {
      alert(`Error starting analysis: ${e.message}`);
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopAnalysis = async () => {
    try {
      await apiRequest(`/jobs/${currentJobId}/cancel`, { method: 'POST' });
      setJob((prev: any) => ({ ...prev, status: 'cancelled' }));
    } catch (e) {
      console.error(e);
    }
  };

  const currentStatus = liveProgress?.status || job?.status || 'processing';
  const currentProgress = liveProgress?.progress_pct ?? job?.progress_pct ?? 0.0;
  const currentFps = liveProgress?.processed_fps ?? job?.processed_fps ?? 18.0;

  // Stream URL with cache buster if restarted
  const mjpegStreamUrl = `/api/v1/jobs/${currentJobId}/stream?t=${Date.now()}`;

  return (
    <div className="space-y-6">
      {/* Top Header & Feed Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/sources')}
            className="p-2 rounded-lg bg-brand-card border border-brand-border hover:bg-brand-cardHover text-brand-textMuted hover:text-brand-white transition"
            title="Back to Camera Feeds"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-brand-white tracking-tight">
                {job?.source_name || `Camera Feed #${currentJobId}`}
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-brand-yellow/20 text-brand-yellow border border-brand-yellow/30 font-bold">
                Live Feed #{currentJobId}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-brand-textMuted mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-brand-yellow" />
              <span>{job?.source_location || 'Campus Surveillance Perimeter'}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-4">
          {/* Feed Selector Dropdown */}
          {allSources.length > 1 && (
            <select
              value={currentJobId}
              onChange={(e) => navigate(`/jobs/${e.target.value}`)}
              className="px-3 py-1.5 bg-brand-card border border-brand-border rounded-lg text-xs text-brand-white focus:outline-none focus:border-brand-yellow font-medium"
            >
              {allSources.map((s) => (
                <option key={s.id} value={s.id}>
                  Switch Feed: {s.name}
                </option>
              ))}
            </select>
          )}

          {/* Multi-view Grid Toggle */}
          <button
            onClick={() => setShowMatrix(!showMatrix)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 border transition ${
              showMatrix
                ? 'bg-brand-yellow text-white border-brand-yellow font-bold'
                : 'bg-brand-card text-brand-textMuted border-brand-border hover:text-brand-white'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Multi-Cam Matrix</span>
          </button>

          {/* Start / Restart / Cancel Button */}
          {currentStatus === 'processing' ? (
            <button
              onClick={handleStopAnalysis}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-brand-black text-brand-red border border-brand-red hover:bg-brand-red hover:text-brand-white flex items-center gap-2 transition shadow"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Stop Video</span>
            </button>
          ) : (
            <button
              onClick={handleStartAnalysis}
              disabled={isStarting}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-brand-yellow hover:bg-brand-yellowHover text-white flex items-center gap-2 transition shadow"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>{currentStatus === 'completed' ? 'Re-run Analysis' : 'Start Video Analysis'}</span>
            </button>
          )}
        </div>
      </div>

      {/* MULTI-CAMERA MATRIX VIEW (when toggled) */}
      {showMatrix && allSources.length > 1 && (
        <div className="p-4 rounded-xl bg-brand-card border border-brand-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-brand-white text-xs uppercase tracking-wider flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-brand-yellow animate-pulse" />
              <span>Concurrent CCTV Multi-Feed Matrix</span>
            </h3>
            <span className="text-[11px] text-brand-textMuted">Click any feed to focus</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allSources.map((s) => (
              <div
                key={s.id}
                onClick={() => {
                  setShowMatrix(false);
                  navigate(`/jobs/${s.id}`);
                }}
                className={`relative aspect-video rounded-lg overflow-hidden border cursor-pointer group bg-brand-black transition ${
                  s.id === currentJobId ? 'border-brand-yellow ring-1 ring-brand-yellow' : 'border-brand-border hover:border-brand-yellow/60'
                }`}
              >
                <img
                  src={`/api/v1/jobs/${s.id}/stream`}
                  alt={s.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-brand-black/90 border border-brand-border text-[10px] font-bold text-brand-white flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-yellow animate-pulse" />
                  <span>{s.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MAIN REAL-TIME SURVEILLANCE RUNNER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Video Stream & Player */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative aspect-video w-full rounded-2xl bg-brand-black border border-brand-border overflow-hidden shadow-2xl flex items-center justify-center">
            {/* Live MJPEG Stream with YOLO11 detection overlays */}
            <img
              key={`${currentJobId}-${currentStatus}`}
              src={`/api/v1/jobs/${currentJobId}/stream`}
              alt="Live YOLO11 CCTV Stream"
              className="w-full h-full object-contain"
            />

            {/* Real-time HUD Status Overlay */}
            <div className="absolute top-4 left-4 bg-brand-darkest/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-brand-border text-xs flex items-center gap-4 shadow-lg">
              <div className="flex items-center gap-2 font-mono">
                <span
                  className={`w-2 h-2 rounded-full ${
                    currentStatus === 'processing' ? 'bg-brand-red animate-ping' : 'bg-brand-yellow'
                  }`}
                />
                <span className="uppercase font-bold text-brand-white">
                  {currentStatus === 'processing' ? 'AI ANALYZING LIVE' : currentStatus}
                </span>
              </div>
              <span className="text-brand-border">|</span>
              <div className="flex items-center gap-1 text-brand-yellow font-mono font-bold">
                <Cpu className="w-3.5 h-3.5" />
                <span>{currentFps} FPS</span>
              </div>
            </div>

            {/* Live Model Badge (Top Right) */}
            <div className="absolute top-4 right-4 bg-brand-darkest/90 backdrop-blur-md px-3 py-1 rounded-lg border border-brand-border text-[11px] font-mono text-brand-yellow font-bold">
              Ultralytics YOLO11n + ByteTrack
            </div>

            {/* Completed Seekable Video Replay Banner if finished */}
            {currentStatus === 'completed' && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-brand-darkest/95 backdrop-blur-md px-4 py-2 rounded-full border border-brand-yellow/60 text-xs flex items-center gap-4">
                <CheckCircle2 className="w-4 h-4 text-brand-yellow" />
                <span className="text-brand-white font-medium">Video Analysis Sequence Completed</span>
                <button
                  onClick={handleStartAnalysis}
                  className="px-2.5 py-0.5 rounded bg-brand-yellow text-white font-bold hover:bg-brand-yellowHover"
                >
                  Restart
                </button>
              </div>
            )}
          </div>

          {/* Real-time Telemetry & Pipeline Progress */}
          <div className="p-4 rounded-xl bg-brand-card border border-brand-border space-y-4">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-brand-yellow" />
                <span className="font-semibold text-brand-white">Video Progress:</span>
                <span className="font-mono text-brand-textMuted">
                  {((currentProgress / 100) * 60).toFixed(1)}s elapsed
                </span>
              </div>
              <span className="font-mono font-bold text-brand-yellow">{currentProgress.toFixed(1)}%</span>
            </div>

            <div className="w-full h-2.5 bg-brand-darkest rounded-full overflow-hidden border border-brand-border">
              <div
                className="h-full bg-brand-yellow transition-all duration-300"
                style={{ width: `${currentProgress}%` }}
              />
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
              <div className="p-2 bg-brand-darkest rounded border border-brand-border">
                <p className="text-[10px] text-brand-textMuted uppercase font-semibold">Live Mode</p>
                <p className="font-bold text-brand-white mt-0.5">Real-Time CCTV</p>
              </div>
              <div className="p-2 bg-brand-darkest rounded border border-brand-border">
                <p className="text-[10px] text-brand-textMuted uppercase font-semibold">Threat Detection</p>
                <p className="font-bold text-brand-yellow mt-0.5">Active</p>
              </div>
              <div className="p-2 bg-brand-darkest rounded border border-brand-border">
                <p className="text-[10px] text-brand-textMuted uppercase font-semibold">Incident Flags</p>
                <p className="font-bold text-brand-white mt-0.5">{alerts.length} Flagged</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Live Real-Time Incident Stream */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-brand-card border border-brand-border h-full flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-brand-border">
              <h3 className="font-semibold text-brand-white text-xs uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-brand-yellow" />
                <span>Real-Time Incident Stream ({alerts.length})</span>
              </h3>
              <span className="text-[10px] bg-brand-black text-brand-red px-2 py-0.5 rounded border border-brand-red font-bold">
                Live Feed
              </span>
            </div>

            {/* Real-time Alert Cards Queue */}
            <div className="flex-1 overflow-y-auto space-y-2 mt-3 max-h-[520px] pr-1">
              {alerts.length === 0 ? (
                <div className="py-12 text-center text-xs text-brand-textMuted space-y-2">
                  <ShieldAlert className="w-8 h-8 text-brand-border mx-auto" />
                  <p>Surveillance video running normally.</p>
                  <p className="text-[11px] text-brand-textMuted/70">
                    Incidents (weapons, fights, unattended objects, crowds) will appear here instantly when detected.
                  </p>
                </div>
              ) : (
                alerts.map((al) => (
                  <div
                    key={al.id}
                    onClick={() => navigate(`/alerts/${al.id}`)}
                    className="p-3 bg-brand-darkest rounded-lg border border-brand-border hover:border-brand-yellow cursor-pointer transition space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <TypeBadge type={al.type} />
                      <span className="text-[10px] font-mono text-brand-yellow font-bold">
                        {(al.confidence * 100).toFixed(0)}%
                      </span>
                    </div>

                    <div className="text-xs text-brand-white font-medium truncate">
                      {al.location_label || job?.source_location}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-brand-textMuted pt-1 border-t border-brand-border/50">
                      <span>@{al.ts_start?.toFixed(1) || '0.0'}s in footage</span>
                      <span className="text-brand-yellow group-hover:underline flex items-center gap-1 font-semibold">
                        Review
                        <ExternalLink className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

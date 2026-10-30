import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAlertStore } from '../stores/alertStore';
import { TypeBadge } from '../components/Badges';

export const VideoViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeJobs } = useAlertStore();

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
        source_name: `CCTV surveillance feed #${currentJobId}`,
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

  return (
    <div className="space-y-6">
      {/* Top Header & Feed Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/sources')}
            className="px-3 py-1.5 rounded-[12px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc] hover:bg-brand-cardHover text-brand-textMuted hover:text-brand-white text-xs font-semibold transition"
          >
            Back to camera feeds
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-brand-white tracking-tight">
                {job?.source_name || `Camera feed #${currentJobId}`}
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-[12px] font-mono text-brand-accent shadow-[0_0_0_1px_#e6e3dc] bg-brand-card font-semibold">
                Live feed #{currentJobId}
              </span>
            </div>
            <div className="text-xs text-brand-textMuted mt-0.5 font-semibold">
              {job?.source_location || 'Campus surveillance perimeter'}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-4">
          {allSources.length > 1 && (
            <select
              value={currentJobId}
              onChange={(e) => navigate(`/jobs/${e.target.value}`)}
              className="px-3 py-1.5 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] text-xs text-brand-white focus:outline-none focus:border-brand-accent font-semibold"
            >
              {allSources.map((s) => (
                <option key={s.id} value={s.id}>
                  Switch feed: {s.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setShowMatrix(!showMatrix)}
            className={`px-3 py-1.5 rounded-[12px] text-xs font-semibold shadow-[0_0_0_1px_#e6e3dc] transition ${
              showMatrix
                ? 'bg-brand-accent text-white'
                : 'bg-brand-card text-brand-textMuted hover:text-brand-white'
            }`}
          >
            Multi-camera matrix
          </button>

          {currentStatus === 'processing' ? (
            <button
              onClick={handleStopAnalysis}
              className="px-3.5 py-1.5 rounded-[12px] text-xs font-semibold bg-brand-card text-brand-red shadow-[0_0_0_1px_#e6e3dc] hover:bg-brand-cardHover transition"
            >
              Stop video
            </button>
          ) : (
            <button
              onClick={handleStartAnalysis}
              disabled={isStarting}
              className="px-4 py-1.5 rounded-[12px] text-xs font-semibold bg-brand-accent hover:bg-brand-accentHover text-white transition"
            >
              {currentStatus === 'completed' ? 'Re-run analysis' : 'Start video analysis'}
            </button>
          )}
        </div>
      </div>

      {/* MULTI-CAMERA MATRIX VIEW (when toggled) */}
      {showMatrix && allSources.length > 1 && (
        <div className="p-4 rounded-[12px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-brand-white text-xs">
              Concurrent CCTV multi-feed matrix
            </h3>
            <span className="text-xs text-brand-textMuted font-semibold">Click any feed to focus</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allSources.map((s) => (
              <div
                key={s.id}
                onClick={() => {
                  setShowMatrix(false);
                  navigate(`/jobs/${s.id}`);
                }}
                className={`relative aspect-video rounded-[12px] overflow-hidden shadow-[0_0_0_1px_#e6e3dc] cursor-pointer group bg-neutral-900 transition ${
                  s.id === currentJobId ? 'ring-2 ring-brand-accent' : ''
                }`}
              >
                <img
                  src={`/api/v1/jobs/${s.id}/stream`}
                  alt={s.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-[12px] bg-black/80 text-xs font-semibold text-white">
                  {s.name}
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
          <div className="relative aspect-video w-full rounded-[12px] bg-neutral-900 shadow-[0_0_0_1px_#e6e3dc] overflow-hidden flex items-center justify-center">
            {/* Live MJPEG Stream with YOLO11 detection overlays */}
            <img
              key={`${currentJobId}-${currentStatus}`}
              src={`/api/v1/jobs/${currentJobId}/stream`}
              alt="Live YOLO11 CCTV Stream"
              className="w-full h-full object-contain"
            />

            {/* Real-time HUD Status Overlay */}
            <div className="absolute top-4 left-4 bg-white/95 px-3 py-1.5 rounded-[12px] shadow-[0_0_0_1px_#e6e3dc] text-xs flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    currentStatus === 'processing' ? 'bg-brand-red animate-ping' : 'bg-brand-accent'
                  }`}
                />
                <span className="font-semibold text-brand-white">
                  {currentStatus === 'processing' ? 'AI analyzing live' : currentStatus}
                </span>
              </div>
              <span className="text-brand-border">|</span>
              <span className="text-brand-accent font-mono font-semibold">
                {currentFps} FPS
              </span>
            </div>

            {/* Live Model Badge (Top Right) */}
            <div className="absolute top-4 right-4 bg-white/95 px-3 py-1 rounded-[12px] shadow-[0_0_0_1px_#e6e3dc] text-xs font-mono text-brand-white font-semibold">
              Ultralytics YOLO11n + ByteTrack
            </div>

            {/* Completed Seekable Video Replay Banner if finished */}
            {currentStatus === 'completed' && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/95 px-4 py-2 rounded-[12px] shadow-[0_0_0_1px_#e6e3dc] text-xs flex items-center gap-4">
                <span className="text-brand-white font-semibold">Video analysis completed</span>
                <button
                  onClick={handleStartAnalysis}
                  className="px-2.5 py-0.5 rounded-[12px] bg-brand-accent text-white font-semibold hover:bg-brand-accentHover"
                >
                  Restart
                </button>
              </div>
            )}
          </div>

          {/* Real-time Telemetry & Pipeline Progress */}
          <div className="p-4 rounded-[12px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc] space-y-4">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-brand-white">Video progress:</span>
                <span className="font-mono text-brand-textMuted font-semibold">
                  {((currentProgress / 100) * 60).toFixed(1)}s elapsed
                </span>
              </div>
              <span className="font-mono font-semibold text-brand-accent">{currentProgress.toFixed(1)}%</span>
            </div>

            <div className="w-full h-2 bg-brand-dark rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-accent transition-all duration-300"
                style={{ width: `${currentProgress}%` }}
              />
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
              <div className="p-2 bg-brand-card rounded-[12px] shadow-[0_0_0_1px_#e6e3dc]">
                <p className="text-xs text-brand-textMuted font-semibold">Live mode</p>
                <p className="font-semibold text-brand-white mt-0.5">Real-time CCTV</p>
              </div>
              <div className="p-2 bg-brand-card rounded-[12px] shadow-[0_0_0_1px_#e6e3dc]">
                <p className="text-xs text-brand-textMuted font-semibold">Threat detection</p>
                <p className="font-semibold text-brand-accent mt-0.5">Active</p>
              </div>
              <div className="p-2 bg-brand-card rounded-[12px] shadow-[0_0_0_1px_#e6e3dc]">
                <p className="text-xs text-brand-textMuted font-semibold">Incident flags</p>
                <p className="font-semibold text-brand-white mt-0.5">{alerts.length} flagged</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Live Incident Stream */}
        <div className="space-y-4">
          <div className="p-4 rounded-[12px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc] h-full flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-brand-border">
              <h3 className="font-semibold text-brand-white text-xs">
                Real-time incident stream ({alerts.length})
              </h3>
              <span className="text-xs text-brand-accent font-semibold">
                Live feed
              </span>
            </div>

            {/* Real-time Alert Cards Queue */}
            <div className="flex-1 overflow-y-auto space-y-2 mt-3 max-h-[520px] pr-1">
              {alerts.length === 0 ? (
                <div className="py-12 text-center text-xs text-brand-textMuted space-y-2 font-semibold">
                  <p>Surveillance video running normally.</p>
                  <p className="text-xs text-brand-textMuted font-semibold">
                    Incidents will appear here instantly when detected.
                  </p>
                </div>
              ) : (
                alerts.map((al) => (
                  <div
                    key={al.id}
                    onClick={() => navigate(`/alerts/${al.id}`)}
                    className="p-3 bg-brand-card rounded-[12px] shadow-[0_0_0_1px_#e6e3dc] hover:bg-brand-cardHover cursor-pointer transition space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <TypeBadge type={al.type} />
                      <span className="text-xs font-mono text-brand-accent font-semibold">
                        {(al.confidence * 100).toFixed(0)}%
                      </span>
                    </div>

                    <div className="text-xs text-brand-white font-semibold truncate">
                      {al.location_label || job?.source_location}
                    </div>

                    <div className="flex items-center justify-between text-xs text-brand-textMuted pt-2 border-t border-brand-border">
                      <span className="font-semibold">@{al.ts_start?.toFixed(1) || '0.0'}s in footage</span>
                      <span className="text-brand-accent hover:underline font-semibold">
                        Review
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

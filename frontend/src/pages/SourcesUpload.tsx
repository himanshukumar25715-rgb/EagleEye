import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { VideoOff, Upload, Smartphone, RotateCcw, CheckCircle2, AlertCircle, Radio } from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAlertStore } from '../stores/alertStore';

interface CameraFeed {
  id: number;
  name: string;
  location: string;
  status: 'active' | 'analyzing' | 'standby';
  fps: number;
  sourceId?: number;
}

const ALL_CAMERAS: CameraFeed[] = [
  // Bank 1: 1 - 9
  { id: 1, name: 'CAM-01', location: 'Main Entrance Gate 1', status: 'active', fps: 25, sourceId: 1 },
  { id: 2, name: 'CAM-02', location: 'North Perimeter Walkway', status: 'active', fps: 25, sourceId: 2 },
  { id: 3, name: 'CAM-03', location: 'Hostel Block A Lobby', status: 'active', fps: 25, sourceId: 3 },
  { id: 4, name: 'CAM-04', location: 'Dining Hall Corridor', status: 'active', fps: 30, sourceId: 4 },
  { id: 5, name: 'CAM-05', location: 'Science Block Atrium', status: 'active', fps: 25 },
  { id: 6, name: 'CAM-06', location: 'Student Center Plaza', status: 'active', fps: 30 },
  { id: 7, name: 'CAM-07', location: 'Parking Area Zone C', status: 'active', fps: 25 },
  { id: 8, name: 'CAM-08', location: 'Library East Terrace', status: 'active', fps: 25 },
  { id: 9, name: 'CAM-09', location: 'Sports Arena Entry', status: 'active', fps: 30 },

  // Bank 2: 10 - 18
  { id: 10, name: 'CAM-10', location: 'South Gate 2 Vehicular', status: 'active', fps: 25 },
  { id: 11, name: 'CAM-11', location: 'Academic Block B Ground', status: 'active', fps: 25 },
  { id: 12, name: 'CAM-12', location: 'Central Admin Lawn', status: 'active', fps: 25 },
  { id: 13, name: 'CAM-13', location: 'Hostel Block B West', status: 'active', fps: 30 },
  { id: 14, name: 'CAM-14', location: 'Engineering Workshop', status: 'active', fps: 25 },
  { id: 15, name: 'CAM-15', location: 'Cafeteria Patio', status: 'active', fps: 30 },
  { id: 16, name: 'CAM-16', location: 'Parking Deck Level 2', status: 'active', fps: 25 },
  { id: 17, name: 'CAM-17', location: 'Perimeter Fence South', status: 'active', fps: 25 },
  { id: 18, name: 'CAM-18', location: 'Bus Transit Terminal', status: 'active', fps: 30 },

  // Bank 3: 19 - 27
  { id: 19, name: 'CAM-19', location: 'East Gate 3 Pedestrian', status: 'active', fps: 25 },
  { id: 20, name: 'CAM-20', location: 'Innovation Hub Terrace', status: 'active', fps: 25 },
  { id: 21, name: 'CAM-21', location: 'Auditorium Entry Foyer', status: 'active', fps: 30 },
  { id: 22, name: 'CAM-22', location: 'Athletics Track Bleachers', status: 'active', fps: 25 },
  { id: 23, name: 'CAM-23', location: 'Research Lab Annex', status: 'active', fps: 25 },
  { id: 24, name: 'CAM-24', location: 'Delivery Bay Service Lane', status: 'active', fps: 25 },
  { id: 25, name: 'CAM-25', location: 'Medical Center Approach', status: 'active', fps: 30 },
  { id: 26, name: 'CAM-26', location: 'Utility & Substation', status: 'active', fps: 25 },
  { id: 27, name: 'CAM-27', location: 'West Boundary Trail', status: 'active', fps: 25 },
];

export const SourcesUpload: React.FC = () => {
  const navigate = useNavigate();
  const { activeJobs } = useAlertStore();

  const [page, setPage] = useState<number>(0);
  const [sources, setSources] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleTimeString());
  const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [focusedCam, setFocusedCam] = useState<CameraFeed | null>(null);
  const [loadedStreams, setLoadedStreams] = useState<Record<number, boolean>>({});

  // Phone / Live camera modal state
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [selectedCamChannel, setSelectedCamChannel] = useState(1);
  const [streamUrlInput, setStreamUrlInput] = useState('');
  const [connectingPhone, setConnectingPhone] = useState(false);
  const [phoneCamMsg, setPhoneCamMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleConnectPhoneCamera = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!streamUrlInput.trim()) {
      setPhoneCamMsg({ type: 'error', text: 'Please enter a stream URL (e.g. http://192.168.1.15:8080/video) or 0 for laptop webcam' });
      return;
    }
    setConnectingPhone(true);
    setPhoneCamMsg(null);
    try {
      const res = await apiRequest<any>(`/sources/${selectedCamChannel}/connect-live`, {
        method: 'POST',
        body: JSON.stringify({
          stream_url: streamUrlInput.trim(),
          name: `CAM-0${selectedCamChannel} (Live Camera)`,
          location_label: 'Live Mobile Demo Stream',
        }),
      });
      setPhoneCamMsg({ type: 'success', text: res.message || 'Connected live camera successfully!' });
      setLoadedStreams((prev) => ({ ...prev, [selectedCamChannel]: false }));
      setTimeout(() => {
        setLoadedStreams((prev) => ({ ...prev, [selectedCamChannel]: true }));
        setShowPhoneModal(false);
      }, 1000);
    } catch (err: any) {
      setPhoneCamMsg({ type: 'error', text: err.message || 'Failed to connect stream. Ensure phone and PC are on the same Wi-Fi.' });
    } finally {
      setConnectingPhone(false);
    }
  };

  const handleResetSample = async (camId: number) => {
    try {
      await apiRequest(`/sources/${camId}/reset-sample`, { method: 'POST' });
      setLoadedStreams((prev) => ({ ...prev, [camId]: false }));
      setTimeout(() => {
        setLoadedStreams((prev) => ({ ...prev, [camId]: true }));
      }, 1000);
      alert(`Reset CAM-0${camId} back to default surveillance video`);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [locationLabel, setLocationLabel] = useState('Campus Security Perimeter');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Live clock tick
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString());
      setCurrentDate(now.toISOString().slice(0, 10));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch real uploaded sources from backend
  useEffect(() => {
    async function loadSources() {
      try {
        const data = await apiRequest<any[]>('/sources');
        setSources(data);
      } catch {
        // Fallback demo data
      }
    }
    loadSources();
  }, []);

  // Compute the 9 visible cameras for current page
  const camerasPerPage = 9;
  const totalPages = Math.ceil(ALL_CAMERAS.length / camerasPerPage);
  const startIndex = page * camerasPerPage;
  const currentCameras = ALL_CAMERAS.slice(startIndex, startIndex + camerasPerPage);

  // Upload logic
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      setUploadError('Please select at least one CCTV video file.');
      return;
    }
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });
      formData.append('location_label', locationLabel);
      formData.append('auto_start', 'true');

      const res = await apiRequest<any>('/sources/batch', {
        method: 'POST',
        body: formData,
      });

      setUploadSuccess(res.message || 'Footage uploaded successfully!');
      setSelectedFiles([]);
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadSuccess(null);
      }, 1500);

      const refreshed = await apiRequest<any[]>('/sources');
      setSources(refreshed);
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden select-none">
      {/* Top CCTV Matrix Toolbar */}
      <div className="flex-shrink-0 flex items-center justify-between gap-4 pb-2.5">
        <h2 className="text-sm font-semibold text-brand-white">
          CCTV camera matrix
        </h2>

        {/* Bank Switcher & Upload */}
        <div className="flex items-center gap-2">
          {/* Quick Bank Tabs */}
          <div className="flex items-center gap-1 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] p-0.5">
            {Array.from({ length: totalPages }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setPage(idx)}
                className={`px-3 py-1 text-xs font-semibold rounded-[12px] transition ${
                  page === idx
                    ? 'bg-brand-accent text-white shadow-sm'
                    : 'text-brand-textMuted hover:text-brand-white hover:bg-brand-cardHover'
                }`}
              >
                Cameras {idx * 9 + 1}–{idx * 9 + 9}
              </button>
            ))}
          </div>

          {/* Connect Live Phone / IP Camera Button */}
          <button
            onClick={() => {
              setShowPhoneModal(true);
              setPhoneCamMsg(null);
            }}
            className="flex items-center gap-1.5 px-3 py-1 bg-brand-accent hover:bg-brand-accentHover text-white rounded-[12px] text-xs font-semibold shadow-sm transition"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Connect live phone / IP camera</span>
          </button>

          {/* Upload Footage Page Trigger */}
          <button
            onClick={() => navigate('/upload')}
            className="flex items-center gap-1.5 px-3 py-1 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] hover:bg-brand-accent hover:text-white text-brand-accent rounded-[12px] text-xs font-semibold transition"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload footage</span>
          </button>
        </div>
      </div>

      {/* 9 CAMERAS 3x3 GRID - 100% UN-SCROLLABLE */}
      <div className="flex-1 grid grid-cols-3 grid-rows-3 gap-2.5 min-h-0 overflow-hidden">
        {currentCameras.map((cam) => {
          const liveJob = cam.sourceId ? activeJobs[cam.sourceId] : undefined;
          const hasVideo = Boolean(cam.sourceId && loadedStreams[cam.id]);

          return (
            <div
              key={cam.id}
              onClick={() => {
                if (hasVideo && cam.sourceId) {
                  navigate(`/jobs/${cam.sourceId}`);
                } else {
                  setFocusedCam(cam);
                }
              }}
              className="relative h-full w-full rounded-[4px] overflow-hidden bg-neutral-950 shadow-[0_0_0_1px_#e6e3dc] cursor-pointer group flex flex-col justify-between p-2.5 transition"
            >
              {/* Camera Background Video or Clean No-Camera CCTV Canvas */}
              {cam.sourceId ? (
                <img
                  src={`/api/v1/jobs/${cam.sourceId}/stream`}
                  alt={cam.name}
                  className={`absolute inset-0 w-full h-full object-cover transition ${
                    hasVideo ? 'opacity-100' : 'opacity-0'
                  }`}
                  onLoad={() => {
                    setLoadedStreams((prev) => ({ ...prev, [cam.id]: true }));
                  }}
                  onError={() => {
                    setLoadedStreams((prev) => ({ ...prev, [cam.id]: false }));
                  }}
                />
              ) : null}

              {/* When there is not a video showing -> show No camera */}
              {!hasVideo && (
                <div className="absolute inset-0 bg-neutral-950 flex flex-col items-center justify-center p-3 select-none">
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
                  <div className="relative z-10 flex flex-col items-center justify-center gap-1.5">
                    <div className="w-9 h-9 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-500 shadow-sm">
                      <VideoOff className="w-4 h-4 text-neutral-500" />
                    </div>
                    <span className="text-xs font-semibold text-neutral-400 font-mono tracking-wider uppercase">
                      No camera
                    </span>
                  </div>
                </div>
              )}

              {/* Top HUD: Camera ID, Location & LIVE / NO CAMERA Status */}
              <div className="relative z-10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 bg-black/75 backdrop-blur-sm px-2 py-0.5 rounded-[12px] text-white">
                  <span className="font-semibold text-white">{cam.name}</span>
                  <span className="text-neutral-400 font-semibold">•</span>
                  <span className="text-neutral-300 font-semibold truncate max-w-[130px]">
                    {cam.location}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 bg-black/75 backdrop-blur-sm px-2 py-0.5 rounded-[12px]">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      hasVideo ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-600'
                    }`}
                  />
                  <span
                    className={`text-[11px] font-mono font-semibold ${
                      hasVideo ? 'text-white' : 'text-neutral-400'
                    }`}
                  >
                    {hasVideo ? 'LIVE' : 'NO CAMERA'}
                  </span>
                </div>
              </div>

              {/* Bottom HUD: Live Timestamp, FPS & Health */}
              <div className="relative z-10 flex items-center justify-between text-[11px] font-mono">
                <div className="bg-black/75 backdrop-blur-sm px-2 py-0.5 rounded-[12px] text-neutral-300 font-semibold">
                  {currentTime}
                </div>

                <div className="flex items-center gap-2 bg-black/75 backdrop-blur-sm px-2 py-0.5 rounded-[12px]">
                  <span className={hasVideo ? 'text-neutral-400 font-semibold' : 'text-neutral-500 font-semibold'}>
                    {hasVideo ? `${cam.fps} FPS` : '-- FPS'}
                  </span>
                  <span className="text-neutral-600">|</span>
                  <span className={`font-semibold ${hasVideo ? 'text-emerald-400' : 'text-neutral-500'}`}>
                    {hasVideo ? 'CLEAR' : 'OFFLINE'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Focus Fullscreen Modal for single camera inspection */}
      {focusedCam && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="w-full max-w-4xl bg-brand-card shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-brand-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-brand-white">
                  {focusedCam.name} — {focusedCam.location}
                </h3>
                <p className="text-xs text-brand-textMuted font-semibold mt-0.5">
                  High-definition live security surveillance feed
                </p>
              </div>
              <button
                onClick={() => setFocusedCam(null)}
                className="px-3 py-1 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] hover:bg-brand-cardHover rounded-[12px] text-xs font-semibold text-brand-white transition"
              >
                Close feed
              </button>
            </div>

            <div className="relative aspect-video bg-neutral-950 flex items-center justify-center p-6">
              {focusedCam.sourceId && loadedStreams[focusedCam.id] ? (
                <img
                  src={`/api/v1/jobs/${focusedCam.sourceId}/stream`}
                  alt={focusedCam.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-500 mx-auto">
                    <VideoOff className="w-6 h-6 text-neutral-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white uppercase font-mono tracking-wider">
                      No camera
                    </p>
                    <p className="text-xs text-neutral-400 font-semibold mt-1">
                      No active video feed connected to {focusedCam.name} ({focusedCam.location})
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        setFocusedCam(null);
                        navigate('/upload');
                      }}
                      className="px-4 py-2 bg-brand-accent hover:bg-brand-accentHover text-white rounded-[12px] text-xs font-semibold transition"
                    >
                      Upload video for this camera
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload CCTV Video Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-brand-card shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-brand-border pb-3">
              <div>
                <h3 className="text-sm font-semibold text-brand-white">Upload CCTV video footage</h3>
                <p className="text-xs text-brand-textMuted font-semibold mt-0.5">
                  Attach video file (.mp4, .avi) to ingest into camera channel
                </p>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-xs text-brand-textMuted hover:text-brand-white font-semibold"
              >
                Close
              </button>
            </div>

            {uploadError && (
              <div className="p-3 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] text-xs font-semibold text-brand-red">
                {uploadError}
              </div>
            )}
            {uploadSuccess && (
              <div className="p-3 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] text-xs font-semibold text-brand-accent">
                {uploadSuccess}
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-brand-textMuted mb-1">
                  Camera location / zone label
                </label>
                <input
                  type="text"
                  value={locationLabel}
                  onChange={(e) => setLocationLabel(e.target.value)}
                  placeholder="e.g. Campus Gate 1 - North Boundary"
                  className="w-full px-3 py-2 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] text-xs text-brand-white focus:outline-none focus:border-brand-accent font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-textMuted mb-1">
                  Select video file
                </label>
                <input
                  type="file"
                  multiple
                  accept="video/*"
                  onChange={handleFileChange}
                  className="w-full text-xs text-brand-textMuted file:mr-3 file:py-1.5 file:px-3 file:rounded-[12px] file:border-0 file:text-xs file:font-semibold file:bg-brand-accent file:text-white hover:file:bg-brand-accentHover cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-brand-border">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3 py-1.5 rounded-[12px] text-xs font-semibold text-brand-textMuted hover:text-brand-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || selectedFiles.length === 0}
                  className="px-4 py-1.5 bg-brand-accent hover:bg-brand-accentHover text-white rounded-[12px] text-xs font-semibold transition disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Upload and start stream'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    
      {/* Live Phone Camera / IP Camera Stream Ingestion Modal */}
      {showPhoneModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-brand-card shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-brand-border pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-brand-white">Connect phone camera live (Demo existing infra)</h3>
                  <p className="text-xs text-brand-textMuted font-semibold mt-0.5">
                    Demonstrates Eagle Eye's ability to ingest live CCTV / IP camera streams
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPhoneModal(false)}
                className="text-xs text-brand-textMuted hover:text-brand-white font-semibold"
              >
                ✕
              </button>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="p-3 bg-brand-card rounded-[12px] shadow-[0_0_0_1px_#e6e3dc] space-y-2 text-xs">
              <p className="font-semibold text-brand-white flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-brand-accent animate-pulse" />
                <span>How to turn your phone into a live security camera in 30 seconds:</span>
              </p>
              <ol className="list-decimal list-inside space-y-1 text-brand-textMuted font-semibold pl-1">
                <li>Connect your phone to the <strong>same Wi-Fi</strong> network as this PC.</li>
                <li>Open <strong>IP Webcam</strong> (Android) or <strong>DroidCam</strong> (iOS/Android) and tap <strong>Start server</strong>.</li>
                <li>Paste the URL shown on your phone screen below and click <strong>Connect</strong>!</li>
              </ol>
            </div>

            {phoneCamMsg && (
              <div
                className={`p-3 rounded-[12px] text-xs font-semibold flex items-center gap-2 ${
                  phoneCamMsg.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-500 shadow-[0_0_0_1px_#10b981]'
                    : 'bg-brand-red/10 text-brand-red shadow-[0_0_0_1px_#ef4444]'
                }`}
              >
                {phoneCamMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{phoneCamMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleConnectPhoneCamera} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-brand-textMuted mb-1">
                  Target camera channel on matrix
                </label>
                <select
                  value={selectedCamChannel}
                  onChange={(e) => setSelectedCamChannel(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] text-xs text-brand-white font-semibold focus:outline-none"
                >
                  <option value={1}>CAM-01: Main Entrance Gate 1</option>
                  <option value={2}>CAM-02: North Perimeter Walkway</option>
                  <option value={3}>CAM-03: Hostel Block A Lobby</option>
                  <option value={4}>CAM-04: Dining Hall Corridor</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-textMuted mb-1">
                  Live stream URL or webcam index
                </label>
                <input
                  type="text"
                  required
                  value={streamUrlInput}
                  onChange={(e) => setStreamUrlInput(e.target.value)}
                  placeholder="e.g. http://192.168.1.15:8080/video or 0"
                  className="w-full px-3 py-2 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] text-xs text-brand-white font-semibold font-mono focus:outline-none focus:ring-1 focus:ring-brand-accent"
                />
              </div>

              {/* Quick Preset Fillers */}
              <div>
                <span className="text-[11px] text-brand-textMuted font-semibold block mb-1.5">
                  Quick test presets:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setStreamUrlInput('0')}
                    className="px-2.5 py-1 text-[11px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc] hover:bg-brand-cardHover rounded-[8px] text-brand-accent font-semibold"
                  >
                    💻 Laptop Webcam
                  </button>
                  <button
                    type="button"
                    onClick={() => setStreamUrlInput('http://192.168.137.22:8080/video')}
                    className="px-2.5 py-1 text-[11px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc] hover:bg-brand-cardHover rounded-[8px] text-brand-white font-semibold"
                  >
                    📱 IP Webcam · 137.22:8080
                  </button>
                  <button
                    type="button"
                    onClick={() => setStreamUrlInput('http://192.168.137.22:4747/video')}
                    className="px-2.5 py-1 text-[11px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc] hover:bg-brand-cardHover rounded-[8px] text-brand-white font-semibold"
                  >
                    📱 DroidCam · 137.22:4747
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-brand-border">
                <button
                  type="button"
                  onClick={() => handleResetSample(selectedCamChannel)}
                  className="flex items-center gap-1 text-xs text-brand-textMuted hover:text-brand-white font-semibold"
                  title="Restore default test video"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restore sample video</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPhoneModal(false)}
                    className="px-3 py-1.5 rounded-[12px] text-xs font-semibold text-brand-textMuted hover:text-brand-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={connectingPhone}
                    className="px-4 py-1.5 bg-brand-accent hover:bg-brand-accentHover text-white rounded-[12px] text-xs font-semibold transition shadow-sm disabled:opacity-50"
                  >
                    {connectingPhone ? 'Connecting...' : 'Connect and stream live'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

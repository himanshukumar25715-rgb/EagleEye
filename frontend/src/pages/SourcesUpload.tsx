import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAlertStore } from '../stores/alertStore';

interface CameraFeed {
  id: number;
  name: string;
  location: string;
  status: 'active' | 'analyzing' | 'standby';
  fps: number;
  hasIncident?: boolean;
  incidentType?: string;
  sourceId?: number;
}

const ALL_CAMERAS: CameraFeed[] = [
  // Bank 1: 1 - 9
  { id: 1, name: 'CAM-01', location: 'Main Entrance Gate 1', status: 'analyzing', fps: 25, sourceId: 1 },
  { id: 2, name: 'CAM-02', location: 'North Perimeter Walkway', status: 'active', fps: 25 },
  { id: 3, name: 'CAM-03', location: 'Hostel Block A Lobby', status: 'active', fps: 25, hasIncident: true, incidentType: 'Unattended object' },
  { id: 4, name: 'CAM-04', location: 'Dining Hall Corridor', status: 'active', fps: 30 },
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

  const [page, setPage] = useState<number>(0); // 0 = 1-9, 1 = 10-18, 2 = 19-27
  const [sources, setSources] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleTimeString());
  const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [focusedCam, setFocusedCam] = useState<CameraFeed | null>(null);

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

  const handleNext9 = () => {
    if (page < totalPages - 1) {
      setPage(page + 1);
    }
  };

  const handlePrev9 = () => {
    if (page > 0) {
      setPage(page - 1);
    }
  };

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
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-brand-white">
            CCTV camera matrix
          </span>
          <span className="text-xs px-2.5 py-0.5 rounded-[12px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc] text-brand-accent font-semibold font-mono">
            Cameras {startIndex + 1}–{Math.min(startIndex + 9, ALL_CAMERAS.length)} of {ALL_CAMERAS.length}
          </span>
          <span className="text-xs text-brand-textMuted font-mono font-semibold">
            {currentDate} {currentTime}
          </span>
        </div>

        {/* Bank Switcher & Controls */}
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

          {/* Previous 9 / Next 9 Buttons */}
          <button
            onClick={handlePrev9}
            disabled={page === 0}
            className="px-3 py-1 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] hover:bg-brand-cardHover text-brand-white rounded-[12px] text-xs font-semibold transition disabled:opacity-40 disabled:hover:bg-brand-card"
          >
            Previous 9
          </button>
          <button
            onClick={handleNext9}
            disabled={page >= totalPages - 1}
            className="px-3 py-1 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] hover:bg-brand-cardHover text-brand-white rounded-[12px] text-xs font-semibold transition disabled:opacity-40 disabled:hover:bg-brand-card"
          >
            Next 9
          </button>

          {/* Upload Footage Modal Trigger */}
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-3 py-1 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] hover:bg-brand-accent hover:text-white text-brand-accent rounded-[12px] text-xs font-semibold transition ml-2"
          >
            Upload footage
          </button>
        </div>
      </div>

      {/* 9 CAMERAS 3x3 GRID - 100% UN-SCROLLABLE */}
      <div className="flex-1 grid grid-cols-3 grid-rows-3 gap-2.5 min-h-0 overflow-hidden">
        {currentCameras.map((cam, idx) => {
          const isRealSource = cam.sourceId && sources.some((s) => s.id === cam.sourceId);
          const liveJob = cam.sourceId ? activeJobs[cam.sourceId] : undefined;
          const isAnalyzing = liveJob?.status === 'processing' || cam.status === 'analyzing';

          return (
            <div
              key={cam.id}
              onClick={() => {
                if (cam.sourceId) {
                  navigate(`/jobs/${cam.sourceId}`);
                } else {
                  setFocusedCam(cam);
                }
              }}
              className="relative h-full w-full rounded-[12px] overflow-hidden bg-neutral-950 shadow-[0_0_0_1px_#e6e3dc] cursor-pointer group flex flex-col justify-between p-2.5 transition hover:shadow-[0_0_0_2px_#0047ab]"
            >
              {/* Camera Background Video / Simulated Feed */}
              {isRealSource ? (
                <img
                  src={`/api/v1/jobs/${cam.sourceId}/stream`}
                  alt={cam.name}
                  className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition"
                  onError={(e) => {
                    // Fallback to simulated feed if live backend stream not playing
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 flex items-center justify-center">
                  {/* Subtle CCTV grid crosshairs simulation */}
                  <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
                  <div className="w-10 h-10 border border-neutral-700/60 rounded-full flex items-center justify-center opacity-40">
                    <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full" />
                  </div>
                </div>
              )}

              {/* Simulated Bounding Box for Detected Incident */}
              {cam.hasIncident && (
                <div className="absolute inset-8 border border-brand-red bg-brand-red/10 rounded-[12px] flex items-start justify-between p-1.5 pointer-events-none animate-pulse">
                  <span className="text-[10px] bg-brand-red text-white px-1.5 py-0.2 rounded font-semibold">
                    {cam.incidentType || 'Threat flagged'}
                  </span>
                  <span className="text-[10px] text-white font-mono font-semibold">92%</span>
                </div>
              )}

              {/* Top HUD: Camera ID, Location & REC Status */}
              <div className="relative z-10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 bg-black/75 backdrop-blur-sm px-2 py-0.5 rounded-[12px] text-white">
                  <span className="font-semibold text-brand-white">{cam.name}</span>
                  <span className="text-neutral-400 font-semibold">•</span>
                  <span className="text-neutral-300 font-semibold truncate max-w-[130px]">
                    {cam.location}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 bg-black/75 backdrop-blur-sm px-2 py-0.5 rounded-[12px]">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isAnalyzing
                        ? 'bg-brand-red animate-ping'
                        : 'bg-emerald-500 animate-pulse'
                    }`}
                  />
                  <span className="text-[11px] font-mono text-white font-semibold">
                    {isAnalyzing ? 'REC • AI' : 'LIVE'}
                  </span>
                </div>
              </div>

              {/* Bottom HUD: Live Timestamp, FPS & Health */}
              <div className="relative z-10 flex items-center justify-between text-[11px] font-mono">
                <div className="bg-black/75 backdrop-blur-sm px-2 py-0.5 rounded-[12px] text-neutral-300 font-semibold">
                  {currentTime}
                </div>

                <div className="flex items-center gap-2 bg-black/75 backdrop-blur-sm px-2 py-0.5 rounded-[12px]">
                  <span className="text-neutral-400 font-semibold">{cam.fps} FPS</span>
                  <span className="text-neutral-600">|</span>
                  <span
                    className={`font-semibold ${
                      cam.hasIncident ? 'text-brand-red' : 'text-emerald-400'
                    }`}
                  >
                    {cam.hasIncident ? 'FLAGGED' : 'CLEAR'}
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
              <div className="text-center space-y-2">
                <p className="text-sm font-semibold text-white">
                  Live CCTV feed focused: {focusedCam.name}
                </p>
                <p className="text-xs text-neutral-400 font-semibold">
                  Timestamp: {currentDate} {currentTime} • {focusedCam.fps} FPS
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setFocusedCam(null);
                      navigate(`/jobs/${focusedCam.sourceId || 1}`);
                    }}
                    className="px-4 py-2 bg-brand-accent hover:bg-brand-accentHover text-white rounded-[12px] text-xs font-semibold transition"
                  >
                    Open AI detection analyzer
                  </button>
                </div>
              </div>
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
    </div>
  );
};

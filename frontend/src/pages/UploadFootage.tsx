import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Video, Play, Eye, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAlertStore } from '../stores/alertStore';

export const UploadFootage: React.FC = () => {
  const navigate = useNavigate();
  const { activeJobs } = useAlertStore();

  const [sources, setSources] = useState<any[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [locationLabel, setLocationLabel] = useState('Campus Security Perimeter');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadSources();
  }, []);

  async function loadSources() {
    try {
      const data = await apiRequest<any[]>('/sources');
      setSources(data);
    } catch {
      // Demo fallback
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadAndRun = async (autoStart: boolean = true) => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one CCTV video file to upload.');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });
      formData.append('location_label', locationLabel);
      formData.append('auto_start', autoStart ? 'true' : 'false');

      const res = await apiRequest<any>('/sources/batch', {
        method: 'POST',
        body: formData,
      });

      setSuccessMsg(res.message || `Uploaded ${selectedFiles.length} CCTV footages successfully!`);
      setSelectedFiles([]);
      await loadSources();

      if (autoStart && res.sources && res.sources.length > 0) {
        navigate(`/jobs/${res.sources[0].job_id}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload video files.');
    } finally {
      setUploading(false);
    }
  };

  const handleStartJob = async (jobId: number) => {
    try {
      await apiRequest(`/jobs/${jobId}/start`, { method: 'POST' });
      navigate(`/jobs/${jobId}`);
    } catch (e: any) {
      alert(`Error starting analysis: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-brand-white tracking-tight">
            CCTV video footage ingestion
          </h2>
          <p className="text-xs text-brand-textMuted font-semibold mt-0.5">
            Upload security surveillance files to assign to camera feeds and run real-time YOLO11 analysis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/cameras')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-accent hover:bg-brand-accentHover text-white rounded-[12px] text-xs font-semibold shadow-sm transition"
          >
            <Video className="w-3.5 h-3.5" />
            <span>Open CCTV camera matrix</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] text-xs font-semibold text-brand-accent flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] text-xs font-semibold text-brand-red flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload & Dropzone Card */}
      <div className="p-6 rounded-[12px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Dropzone Area */}
          <div className="md:col-span-2 border-2 border-dashed border-brand-border hover:border-brand-accent rounded-[12px] p-8 flex flex-col items-center justify-center text-center bg-brand-card transition group">
            <div className="w-12 h-12 rounded-full bg-brand-accent/10 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Upload className="w-5 h-5 text-brand-accent" />
            </div>
            <h4 className="font-semibold text-brand-white text-base">Select or drop CCTV video footage</h4>
            <p className="text-xs text-brand-textMuted mt-1 max-w-sm font-semibold">
              Supports single or multiple video files (.mp4, .avi, .mkv, .mov).
            </p>

            <label className="mt-4 px-4 py-2 bg-brand-accent hover:bg-brand-accentHover text-white font-semibold text-xs rounded-[12px] cursor-pointer transition shadow-sm">
              <span>Browse CCTV video files</span>
              <input
                type="file"
                multiple
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Config & Queue Controls */}
          <div className="space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-brand-textMuted mb-1.5">
                  Campus zone / camera location
                </label>
                <input
                  type="text"
                  value={locationLabel}
                  onChange={(e) => setLocationLabel(e.target.value)}
                  placeholder="e.g. North Gate & Hostel Corridor"
                  className="w-full px-3 py-2 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] rounded-[12px] text-xs text-brand-white focus:outline-none focus:ring-1 focus:ring-brand-accent font-semibold"
                />
              </div>

              {/* Selected Files Chip List */}
              <div>
                <label className="block text-xs font-semibold text-brand-textMuted mb-1.5">
                  Selected files queue ({selectedFiles.length})
                </label>
                <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-brand-card rounded-[12px] shadow-[0_0_0_1px_#e6e3dc]">
                  {selectedFiles.length === 0 ? (
                    <p className="text-xs text-brand-textMuted font-semibold p-2 text-center">
                      No video files queued yet
                    </p>
                  ) : (
                    selectedFiles.map((f, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 bg-brand-card rounded-[12px] text-xs shadow-[0_0_0_1px_#e6e3dc]"
                      >
                        <span className="truncate text-brand-white text-xs font-semibold pr-2">
                          {f.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="text-brand-textMuted hover:text-brand-red text-xs font-semibold transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={uploading || selectedFiles.length === 0}
                onClick={() => handleUploadAndRun(true)}
                className="w-full py-2.5 px-4 bg-brand-accent hover:bg-brand-accentHover text-white font-semibold rounded-[12px] text-xs transition disabled:opacity-50 shadow-sm"
              >
                {uploading ? 'Ingesting footage...' : 'Upload & start analysis live'}
              </button>

              <button
                type="button"
                disabled={uploading || selectedFiles.length === 0}
                onClick={() => handleUploadAndRun(false)}
                className="w-full py-2 px-3 bg-brand-card hover:bg-brand-cardHover text-brand-white rounded-[12px] text-xs font-semibold shadow-[0_0_0_1px_#e6e3dc] transition disabled:opacity-50"
              >
                Upload only (queue for later)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Surveillance Camera Feeds Table */}
      <div className="rounded-[12px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc] overflow-hidden">
        <div className="p-4 border-b border-brand-border flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-brand-white text-sm">Active CCTV surveillance feeds</h3>
            <p className="text-xs text-brand-textMuted font-semibold mt-0.5">
              All registered feeds and connected video sources
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-[12px] bg-brand-card shadow-[0_0_0_1px_#e6e3dc] text-brand-white font-mono font-semibold">
            {sources.length} feeds registered
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-card text-xs text-brand-textMuted border-b border-brand-border font-semibold">
              <tr>
                <th className="py-3 px-4">Feed ID</th>
                <th className="py-3 px-4">Camera source</th>
                <th className="py-3 px-4">Campus location</th>
                <th className="py-3 px-4">Analysis status</th>
                <th className="py-3 px-4">Telemetry</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {sources.map((src) => {
                const liveJob = activeJobs[src.id];
                const isRunning = liveJob?.status === 'processing';

                return (
                  <tr key={src.id} className="hover:bg-brand-cardHover transition">
                    <td className="py-3 px-4 font-mono text-xs text-brand-accent font-semibold">
                      Feed #{src.id}
                    </td>
                    <td className="py-3 px-4 font-semibold text-brand-white">
                      {src.name}
                    </td>
                    <td className="py-3 px-4 text-xs text-brand-textMuted font-semibold">
                      {src.location_label}
                    </td>
                    <td className="py-3 px-4">
                      {isRunning ? (
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-brand-accent animate-ping" />
                          <span className="text-xs font-semibold text-brand-accent">
                            Analyzing ({liveJob?.progress_pct?.toFixed(0) || 0}%)
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-brand-textMuted font-semibold">
                          Standby / ready
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-brand-white font-semibold">
                      {isRunning ? (
                        <span className="text-brand-accent">
                          {liveJob?.processed_fps || 18.0} FPS
                        </span>
                      ) : (
                        <span className="text-brand-textMuted">YOLO11 ready</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleStartJob(src.id)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-brand-accent hover:bg-brand-accentHover text-white text-xs font-semibold rounded-[12px] transition shadow-sm"
                        >
                          <Play className="w-3 h-3" />
                          <span>{isRunning ? 'Restart' : 'Start'}</span>
                        </button>

                        <button
                          onClick={() => navigate(`/jobs/${src.id}`)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-brand-card shadow-[0_0_0_1px_#e6e3dc] hover:bg-brand-cardHover text-brand-white text-xs font-semibold rounded-[12px] transition"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UploadFootage;

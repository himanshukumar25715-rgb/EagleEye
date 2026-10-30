import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UploadCloud, 
  Video, 
  Play, 
  Plus, 
  X, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Eye
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAlertStore } from '../stores/alertStore';

export const SourcesUpload: React.FC = () => {
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-brand-white tracking-tight flex items-center gap-2">
            <UploadCloud className="w-6 h-6 text-brand-yellow" />
            <span>CCTV Video Ingestion & Real-Time Analytics</span>
          </h2>
          <p className="text-sm text-brand-textMuted mt-1">
            Upload CCTV footage. Start video analysis to run live detection while playback runs.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-brand-darkest border-2 border-brand-white rounded-lg text-xs font-bold text-brand-white flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-brand-yellow" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-brand-black border-2 border-brand-red rounded-lg text-xs font-bold text-brand-red flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload & Dropzone Card */}
      <div className="p-6 rounded-xl bg-brand-card border border-brand-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Dropzone Area */}
          <div className="md:col-span-2 border-2 border-dashed border-brand-border hover:border-brand-yellow rounded-xl p-8 flex flex-col items-center justify-center text-center bg-brand-black transition">
            <div className="w-14 h-14 rounded-2xl bg-brand-card border border-brand-yellow flex items-center justify-center text-brand-yellow mb-3">
              <UploadCloud className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-brand-white text-base">Select or Drop CCTV Video Footage</h4>
            <p className="text-xs text-brand-textMuted mt-1 max-w-sm">
              Supports single or multiple video files (.mp4, .avi, .mkv).
            </p>

            <label className="mt-4 px-4 py-2 bg-brand-yellow hover:bg-brand-yellowHover text-white font-extrabold text-xs rounded cursor-pointer shadow transition flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span>Browse CCTV Videos</span>
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
                <label className="block text-xs font-bold uppercase tracking-wider text-brand-textMuted mb-1">
                  Campus Zone / Camera Location
                </label>
                <input
                  type="text"
                  value={locationLabel}
                  onChange={(e) => setLocationLabel(e.target.value)}
                  placeholder="e.g. North Gate & Hostel Corridor"
                  className="w-full px-3 py-2 bg-brand-black border border-brand-border rounded text-xs text-brand-white focus:outline-none focus:border-brand-yellow"
                />
              </div>

              {/* Selected Files Chip List */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-brand-textMuted mb-1">
                  Selected Files Queue ({selectedFiles.length})
                </label>
                <div className="max-h-36 overflow-y-auto space-y-2 p-2 bg-brand-black rounded border border-brand-border">
                  {selectedFiles.length === 0 ? (
                    <p className="text-[11px] text-brand-textMuted italic p-1">No videos queued yet</p>
                  ) : (
                    selectedFiles.map((f, i) => (
                      <div key={i} className="flex items-center justify-between p-1.5 bg-brand-card rounded text-xs border border-brand-border">
                        <div className="flex items-center gap-2 truncate pr-2">
                          <Video className="w-3.5 h-3.5 text-brand-yellow flex-shrink-0" />
                          <span className="truncate text-brand-white text-[11px] font-semibold">{f.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="text-brand-textMuted hover:text-brand-red p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
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
                className="w-full py-2.5 px-4 bg-brand-yellow hover:bg-brand-yellowHover text-white font-black rounded text-xs transition disabled:opacity-50 flex items-center justify-center gap-2 shadow"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{uploading ? 'Ingesting Footage...' : 'Upload & Start Analysis Live'}</span>
              </button>

              <button
                type="button"
                disabled={uploading || selectedFiles.length === 0}
                onClick={() => handleUploadAndRun(false)}
                className="w-full py-2 px-3 bg-brand-black hover:bg-brand-card text-brand-white rounded text-xs font-bold border border-brand-border transition disabled:opacity-50"
              >
                Upload Only (Queue for Later)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Surveillance Camera Feeds Table */}
      <div className="rounded-xl bg-brand-card border border-brand-border overflow-hidden">
        <div className="p-4 border-b border-brand-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-yellow" />
            <h3 className="font-bold text-brand-white text-sm">Active CCTV Surveillance Feeds</h3>
          </div>
          <span className="text-xs bg-brand-black px-2.5 py-1 rounded text-brand-white border border-brand-border font-mono font-bold">
            {sources.length} Feeds Registered
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-darkest text-xs uppercase tracking-wider text-brand-textMuted border-b border-brand-border">
              <tr>
                <th className="py-3 px-4">Feed ID</th>
                <th className="py-3 px-4">Camera Source</th>
                <th className="py-3 px-4">Campus Location</th>
                <th className="py-3 px-4">Analysis Status</th>
                <th className="py-3 px-4">Telemetry</th>
                <th className="py-3 px-4 text-right">Live Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {sources.map((src) => {
                const liveJob = activeJobs[src.id];
                const isRunning = liveJob?.status === 'processing';

                return (
                  <tr key={src.id} className="hover:bg-brand-cardHover transition">
                    <td className="py-3 px-4 font-mono text-xs text-brand-yellow font-bold">
                      FEED #{src.id}
                    </td>
                    <td className="py-3 px-4 font-bold text-brand-white flex items-center gap-2">
                      <Video className="w-4 h-4 text-brand-yellow flex-shrink-0" />
                      <span>{src.name}</span>
                    </td>
                    <td className="py-3 px-4 text-xs text-brand-textMuted">{src.location_label}</td>
                    <td className="py-3 px-4">
                      {isRunning ? (
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-brand-yellow animate-ping" />
                          <span className="text-xs font-bold text-brand-yellow">
                            Analyzing ({liveJob?.progress_pct?.toFixed(0) || 0}%)
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded bg-brand-black border border-brand-border text-brand-textMuted font-semibold">
                          Standby / Ready
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-brand-white">
                      {isRunning ? (
                        <span className="text-brand-yellow font-bold">
                          {liveJob?.processed_fps || 18.0} FPS
                        </span>
                      ) : (
                        <span className="text-brand-textMuted">YOLO11 Ready</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleStartJob(src.id)}
                          className="px-2.5 py-1 bg-brand-yellow hover:bg-brand-yellowHover text-white text-xs font-black rounded flex items-center gap-1 shadow transition"
                        >
                          <Play className="w-3 h-3 fill-white" />
                          <span>{isRunning ? 'Restart' : 'Start'}</span>
                        </button>

                        <button
                          onClick={() => navigate(`/jobs/${src.id}`)}
                          className="px-2.5 py-1 bg-brand-black border border-brand-border hover:border-brand-yellow text-brand-white text-xs font-bold rounded flex items-center gap-1 transition"
                        >
                          <Eye className="w-3.5 h-3.5 text-brand-yellow" />
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

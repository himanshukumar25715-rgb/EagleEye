import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, Video, Radio, ArrowRight, CheckCircle2, AlertCircle, Play } from 'lucide-react';
import { apiRequest } from '../api/client';

export const SourcesUpload: React.FC = () => {
  const navigate = useNavigate();
  const [sources, setSources] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [sourceType, setSourceType] = useState<'video_file' | 'rtsp'>('video_file');
  const [rtspUri, setRtspUri] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSources();
  }, []);

  async function loadSources() {
    try {
      const data = await apiRequest<any[]>('/sources');
      setSources(data);
    } catch {
      setSources([
        {
          id: 1,
          name: 'Main Entrance Gate 1',
          type: 'video_file',
          location_label: 'Campus Gate 1 - North Boundary',
          created_at: new Date().toISOString(),
        },
      ]);
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !locationLabel) {
      setError('Please provide a camera source name and campus location label.');
      return;
    }
    if (sourceType === 'video_file' && !file) {
      setError('Please select a video file (.mp4, .avi, .mkv).');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('location_label', locationLabel);
      formData.append('source_type', sourceType);
      if (sourceType === 'video_file' && file) {
        formData.append('file', file);
      } else if (sourceType === 'rtsp') {
        formData.append('rtsp_uri', rtspUri);
      }

      const res = await apiRequest<any>('/sources', {
        method: 'POST',
        body: formData,
      });

      // Clear form
      setName('');
      setLocationLabel('');
      setFile(null);
      loadSources();
      navigate(`/jobs/${res.id || 1}`);
    } catch (err: any) {
      setError(err.message || 'Failed to upload CCTV source');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Camera Feeds & Video Sources</h2>
        <p className="text-sm text-campus-textMuted mt-1">
          Ingest recorded CCTV video or configure live RTSP camera feeds for AI pipeline analysis.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Form Card */}
        <div className="lg:col-span-1 p-5 rounded-xl bg-campus-card border border-campus-border h-fit">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-campus-gold" />
            Ingest Footage
          </h3>

          {error && (
            <div className="mb-4 p-3 bg-red-950/60 border border-red-800 rounded-lg text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-campus-textMuted mb-1">
                Source Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSourceType('video_file')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border flex items-center justify-center gap-2 transition ${
                    sourceType === 'video_file'
                      ? 'bg-campus-gold text-campus-darkest border-campus-gold'
                      : 'bg-campus-dark text-campus-textMuted border-campus-border hover:bg-campus-card'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  Recorded File
                </button>
                <button
                  type="button"
                  onClick={() => setSourceType('rtsp')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border flex items-center justify-center gap-2 transition ${
                    sourceType === 'rtsp'
                      ? 'bg-campus-gold text-campus-darkest border-campus-gold'
                      : 'bg-campus-dark text-campus-textMuted border-campus-border hover:bg-campus-card'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  Live RTSP
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-campus-textMuted mb-1">
                Camera Name / Label
              </label>
              <input
                type="text"
                placeholder="e.g. Hostel Corridor Cam 03"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-campus-darkest border border-campus-border rounded-lg text-sm text-white focus:outline-none focus:border-campus-gold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-campus-textMuted mb-1">
                Campus Location
              </label>
              <input
                type="text"
                placeholder="e.g. Block B - 2nd Floor Staircase"
                value={locationLabel}
                onChange={(e) => setLocationLabel(e.target.value)}
                className="w-full px-3 py-2 bg-campus-darkest border border-campus-border rounded-lg text-sm text-white focus:outline-none focus:border-campus-gold"
              />
            </div>

            {sourceType === 'video_file' ? (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-campus-textMuted mb-1">
                  Select Video (.mp4, .avi, .mov)
                </label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-xs text-campus-textMuted file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-campus-card file:text-campus-gold hover:file:bg-campus-border"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-campus-textMuted mb-1">
                  RTSP Stream URI
                </label>
                <input
                  type="text"
                  placeholder="rtsp://admin:pass@192.168.1.50:554/stream1"
                  value={rtspUri}
                  onChange={(e) => setRtspUri(e.target.value)}
                  className="w-full px-3 py-2 bg-campus-darkest border border-campus-border rounded-lg text-sm text-white focus:outline-none focus:border-campus-gold font-mono"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={uploading}
              className="w-full py-2.5 px-4 bg-campus-gold hover:bg-campus-goldHover text-campus-darkest font-semibold rounded-lg text-sm transition disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {uploading ? 'Processing & Ingesting...' : 'Upload & Start Pipeline'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Sources Catalog Table */}
        <div className="lg:col-span-2 rounded-xl bg-campus-card border border-campus-border overflow-hidden">
          <div className="p-4 border-b border-campus-border flex items-center justify-between">
            <h3 className="font-semibold text-white">Registered Surveillance Feeds</h3>
            <span className="text-xs bg-campus-dark px-2.5 py-1 rounded text-campus-textMuted border border-campus-border">
              {sources.length} Sources Active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-campus-dark text-xs uppercase tracking-wider text-campus-textMuted border-b border-campus-border">
                <tr>
                  <th className="py-3 px-4">Camera Feed</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Ingested At</th>
                  <th className="py-3 px-4 text-right">Viewer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-campus-border">
                {sources.map((src) => (
                  <tr key={src.id} className="hover:bg-campus-cardHover/70 transition">
                    <td className="py-3 px-4 font-medium text-white flex items-center gap-2">
                      <Video className="w-4 h-4 text-campus-gold" />
                      {src.name}
                    </td>
                    <td className="py-3 px-4 text-campus-textMuted">{src.location_label}</td>
                    <td className="py-3 px-4">
                      <span className="text-xs uppercase font-mono px-2 py-0.5 rounded bg-campus-darkest border border-campus-border text-campus-gold">
                        {src.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-campus-textMuted">
                      {new Date(src.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => navigate(`/jobs/${src.id}`)}
                        className="p-1.5 hover:bg-campus-gold hover:text-campus-darkest text-campus-gold rounded transition border border-campus-gold/30"
                        title="Open Annotated Video Viewer"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};


import { create } from 'zustand';
import { audioAlert } from '../utils/audioAlert';

export interface LiveAlert {
  id: number;
  job_id: number;
  type: string;
  confidence: number;
  source_name: string;
  location_label: string;
  created_at: string;
}

export interface JobProgress {
  job_id: number;
  progress_pct: number;
  processed_fps?: number;
  status: string;
}

interface AlertStoreState {
  liveAlerts: LiveAlert[];
  activeJobs: Record<number, JobProgress>;
  wsConnected: boolean;
  toasts: Array<{ id: string; message: string; type: 'warning' | 'info' | 'error' }>;
  initWebSocket: () => void;
  removeToast: (id: string) => void;
  addAlertToast: (alert: LiveAlert, desc?: string) => void;
}

let socket: WebSocket | null = null;

export const useAlertStore = create<AlertStoreState>((set, get) => ({
  liveAlerts: [],
  activeJobs: {},
  wsConnected: false,
  toasts: [],

  removeToast: (id: string) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  addAlertToast: (newAlert: LiveAlert, desc?: string) => {
    const toastId = Math.random().toString();
    const typeUpper = newAlert.type.toUpperCase();
    const icon = newAlert.type === 'fight' ? '🥊' : newAlert.type === 'weapon' ? '🔫' : newAlert.type === 'overcrowding' ? '👥' : '🎒';
    const camTag = newAlert.job_id ? `CAM-0${newAlert.job_id}` : 'SURVEILLANCE';
    const label = newAlert.type === 'weapon'
      ? 'CRITICAL WEAPON DETECTED'
      : newAlert.type === 'fight'
      ? 'PHYSICAL FIGHT DETECTED'
      : newAlert.type === 'unattended_object'
      ? 'UNATTENDED LUGGAGE DETECTED'
      : typeUpper;
    const descText = desc ? ` — ${desc}` : '';
    const message = `${icon} [${camTag}] ${label}: ${newAlert.location_label || newAlert.source_name} (${(newAlert.confidence * 100).toFixed(0)}%)${descText}`;

    set((state) => ({
      liveAlerts: [newAlert, ...state.liveAlerts.filter(a => a.id !== newAlert.id)].slice(0, 50),
      toasts: [
        ...state.toasts.filter(t => !t.message.includes(`[${camTag}] ${label}`)),
        {
          id: toastId,
          message,
          type: 'warning',
        },
      ],
    }));
    setTimeout(() => get().removeToast(toastId), 12000);
  },

  initWebSocket: () => {
    // Start background alert polling fallback so notifications NEVER fail
    if (!(window as any).__eagleEyeAlertPollStarted) {
      (window as any).__eagleEyeAlertPollStarted = true;
      let lastAlertId = 0;
      let isFirstPoll = true;

      setInterval(async () => {
        try {
          const res = await fetch('/api/v1/alerts?limit=5');
          if (res.ok) {
            const list = await res.json();
            if (list && list.length > 0) {
              const latest = list[0];
              if (isFirstPoll) {
                lastAlertId = latest.id;
                isFirstPoll = false;
                // Only show if the alert actually arrived within the last 5 seconds
                const ageMs = Date.now() - new Date(latest.created_at).getTime();
                if (ageMs < 5000) {
                  audioAlert.playAlertSound(latest.type);
                  get().addAlertToast({
                    id: latest.id,
                    job_id: latest.job_id,
                    type: latest.type,
                    confidence: latest.confidence,
                    source_name: latest.source_name || 'CCTV Surveillance',
                    location_label: latest.location_label || 'Campus Security Zone',
                    created_at: latest.created_at
                  }, latest.description);
                }
                return;
              }

              if (latest.id > lastAlertId) {
                lastAlertId = latest.id;
                // Instantly trigger tactical pop up alert!
                audioAlert.playAlertSound(latest.type);
                get().addAlertToast({
                  id: latest.id,
                  job_id: latest.job_id,
                  type: latest.type,
                  confidence: latest.confidence,
                  source_name: latest.source_name || 'CCTV Surveillance',
                  location_label: latest.location_label || 'Campus Security Zone',
                  created_at: latest.created_at
                }, latest.description);
              }
            }
          }
        } catch {}
      }, 1000);
    }

    if (socket && socket.readyState === WebSocket.OPEN) return;

    try {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const wsUrl = import.meta.env.VITE_WS_URL || (isLocal ? 'ws://127.0.0.1:8000/ws/alerts' : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/alerts`);
      const ws = new WebSocket(wsUrl);
      socket = ws;

      ws.onopen = () => {
        set({ wsConnected: true });
        console.log('[EagleEye WS] Connected to live security feed');
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.event === 'alert.created') {
            const newAlert: LiveAlert = payload.data;
            const toastId = Math.random().toString();
            
            // Audible threat warning siren
            audioAlert.playAlertSound(newAlert.type);

            get().addAlertToast(newAlert);
          } else if (payload.event === 'job.progress') {
            const data: JobProgress = payload.data;
            set((state) => ({
              activeJobs: { ...state.activeJobs, [data.job_id]: data },
            }));
          }
        } catch (e) {
          console.error('[EagleEye WS] Error processing message:', e);
        }
      };

      ws.onclose = () => {
        set({ wsConnected: false });
        setTimeout(() => get().initWebSocket(), 5000); // retry reconnect
      };

      ws.onerror = () => {
        set({ wsConnected: false });
      };
    } catch {
      set({ wsConnected: false });
    }
  },
}));


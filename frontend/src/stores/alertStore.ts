import { create } from 'zustand';

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

  initWebSocket: () => {
    if (socket && socket.readyState === WebSocket.OPEN) return;

    try {
      const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8001/ws/alerts';
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        set({ wsConnected: true });
        console.log('[EagleEye WS] Connected to live security feed');
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.event === 'alert.created') {
            const newAlert: LiveAlert = payload.data;
            const toastId = Math.random().toString();
            set((state) => ({
              liveAlerts: [newAlert, ...state.liveAlerts].slice(0, 50),
              toasts: [
                ...state.toasts,
                {
                  id: toastId,
                  message: `🚨 ${newAlert.type.toUpperCase()} flagged at ${newAlert.location_label} (${(newAlert.confidence * 100).toFixed(0)}%)`,
                  type: 'warning',
                },
              ],
            }));
            setTimeout(() => get().removeToast(toastId), 6000);
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

      socket.onclose = () => {
        set({ wsConnected: false });
        setTimeout(() => get().initWebSocket(), 5000); // retry reconnect
      };

      socket.onerror = () => {
        set({ wsConnected: false });
      };
    } catch {
      set({ wsConnected: false });
    }
  },
}));


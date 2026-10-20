/**
 * Ap Workspace — Real-Time WebSocket & IPC Synchronizer Service
 * 
 * Provides typed bi-directional event publishing and subscription:
 * - Exponential backoff reconnection (1s -> 2s -> 4s -> 8s -> 16s + jitter)
 * - Heartbeat ping/pong (15s heartbeat, 30s timeout)
 * - Electron IPC and WebSocket dual-channel listener with deduplication
 * - Connection state tracking: 'connecting' | 'live' | 'reconnecting' | 'offline' | 'error'
 * - Authoritative snapshot reconciliation on reconnect
 * - Database-backed offline fallback
 */

import {
  RealtimeEventType,
  RealtimeConnectionState,
  RealtimeEventMap,
  RealtimeMessage,
  RealtimeEventHandler,
} from '@/types/realtime';

class RealtimeService {
  private socket: WebSocket | null = null;
  private connectionState: RealtimeConnectionState = 'offline';
  private statusListeners = new Set<(status: RealtimeConnectionState) => void>();
  private eventListeners = new Map<string, Set<RealtimeEventHandler<any>>>();
  private allListeners = new Set<(event: RealtimeEventType, payload: any, msg: RealtimeMessage<any>) => void>();
  
  // Reconnect & Backoff
  private reconnectAttempts = 0;
  private reconnectTimer: any = null;
  private isExplicitDisconnect = false;
  private maxReconnectAttempts = 20;
  private baseBackoffMs = 1000;
  private maxBackoffMs = 16000;

  // Heartbeat
  private heartbeatInterval: any = null;
  private lastPongTime = Date.now();
  private heartbeatTimeoutCheck: any = null;

  // Deduplication
  private seenMessageIds = new Set<string>();
  private messageIdQueue: string[] = [];
  private maxSeenCache = 300;

  // IPC unsubscribe
  private ipcUnsubscribe: (() => void) | null = null;

  // Config
  private wsUrl = 'ws://127.0.0.1:52140';
  private authToken = '';
  private wasConnectedOnce = false;

  constructor() {
    if (typeof window !== 'undefined') {
      // Reconnect/reconcile on window focus or resume
      window.addEventListener('focus', () => {
        this.handleWindowFocus();
      });
      window.addEventListener('online', () => {
        this.reconnect();
      });
      window.addEventListener('offline', () => {
        this.setConnectionState('offline');
      });
    }
  }

  /**
   * Initializes and starts connection to local Electron IPC and WebSocket
   */
  public async connect(): Promise<void> {
    this.isExplicitDisconnect = false;

    // 1. Hook into Electron IPC event stream if available
    this.initIpcListener();

    // 2. Obtain connection parameters
    await this.resolveConnectionInfo();

    // 3. Connect to WebSocket
    this.initWebSocket();
  }

  /**
   * Explicitly disconnects and cleans up resources
   */
  public disconnect(): void {
    this.isExplicitDisconnect = true;
    this.clearTimers();

    if (this.socket) {
      try {
        this.socket.close();
      } catch {}
      this.socket = null;
    }

    if (this.ipcUnsubscribe) {
      try {
        this.ipcUnsubscribe();
      } catch {}
      this.ipcUnsubscribe = null;
    }

    this.setConnectionState('offline');
  }

  /**
   * Returns current connection state
   */
  public getState(): RealtimeConnectionState {
    return this.connectionState;
  }

  /**
   * Subscribes to connection status changes
   */
  public onStatusChange(callback: (status: RealtimeConnectionState) => void): () => void {
    this.statusListeners.add(callback);
    callback(this.connectionState);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  /**
   * Subscribes to a specific typed Realtime event
   */
  public subscribe<K extends RealtimeEventType>(
    event: K,
    handler: RealtimeEventHandler<RealtimeEventMap[K]>
  ): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    const handlers = this.eventListeners.get(event)!;
    handlers.add(handler);

    return () => {
      handlers.delete(handler);
    };
  }

  /**
   * Subscribes to all Realtime events
   */
  public subscribeAll(
    handler: (event: RealtimeEventType, payload: any, msg: RealtimeMessage<any>) => void
  ): () => void {
    this.allListeners.add(handler);
    return () => {
      this.allListeners.delete(handler);
    };
  }

  /**
   * Publishes an event through Electron IPC and/or WebSocket
   */
  public async publish<K extends RealtimeEventType>(
    event: K,
    payload: RealtimeEventMap[K]
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const message: RealtimeMessage<RealtimeEventMap[K]> = {
      id: messageId,
      event,
      payload,
      timestamp,
    };

    // Mark as seen immediately so our own loopback doesn't double-process
    this.markMessageSeen(messageId);

    // 1. Dispatch locally to in-process subscribers
    this.dispatchLocal(event, payload, message);

    // 2. Dispatch via Electron IPC if available
    if (typeof window !== 'undefined' && window.electronAPI?.publishAnalyticsEvent) {
      try {
        await window.electronAPI.publishAnalyticsEvent(event, payload);
      } catch (err) {
        console.warn('Failed to publish analytics event via Electron IPC:', err);
      }
    }

    // 3. Dispatch via WebSocket if connected
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify(message));
      } catch (err) {
        console.warn('Failed to send event over WebSocket:', err);
      }
    }
  }

  // -------------------------------------------------------------
  // Internal Connection Implementation
  // -------------------------------------------------------------

  private async resolveConnectionInfo(): Promise<void> {
    if (typeof window !== 'undefined' && window.electronAPI?.getAnalyticsConnectionInfo) {
      try {
        const info = await window.electronAPI.getAnalyticsConnectionInfo();
        if (info?.wsUrl) {
          this.wsUrl = info.wsUrl;
          this.authToken = info.authToken || '';
        }
      } catch (err) {
        console.warn('Could not retrieve analytics connection info:', err);
      }
    }
  }

  private initIpcListener(): void {
    if (this.ipcUnsubscribe) return;

    if (typeof window !== 'undefined' && window.electronAPI?.onAnalyticsEvent) {
      try {
        this.ipcUnsubscribe = window.electronAPI.onAnalyticsEvent((msg: any) => {
          if (!msg || !msg.type) return;
          const evtType = msg.type as RealtimeEventType;
          const messageId = msg.id || `ipc-${Date.now()}`;

          if (this.isMessageSeen(messageId)) return;
          this.markMessageSeen(messageId);

          const fullMsg: RealtimeMessage<any> = {
            id: messageId,
            event: evtType,
            payload: msg.payload,
            timestamp: msg.timestamp || new Date().toISOString(),
          };

          this.dispatchLocal(evtType, msg.payload, fullMsg);
        });

        // In pure desktop environment, having verified IPC enables 'live' baseline
        if (this.connectionState === 'offline') {
          this.setConnectionState('live');
        }
      } catch (err) {
        console.warn('Failed to register IPC analytics listener:', err);
      }
    }
  }

  private initWebSocket(): void {
    if (this.isExplicitDisconnect) return;
    if (typeof window === 'undefined' || typeof WebSocket === 'undefined') return;

    this.clearTimers();
    this.setConnectionState(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

    try {
      const url = new URL(this.wsUrl);
      if (this.authToken) {
        url.searchParams.set('token', this.authToken);
      } else {
        url.searchParams.set('client', 'desktop_internal');
      }

      this.socket = new WebSocket(url.toString());

      this.socket.onopen = () => {
        this.setConnectionState('live');
        const isReconnect = this.wasConnectedOnce && this.reconnectAttempts > 0;
        this.reconnectAttempts = 0;
        this.wasConnectedOnce = true;
        this.lastPongTime = Date.now();

        // Start heartbeat ping
        this.startHeartbeat();

        // If this was a reconnect after being disconnected, trigger snapshot invalidation
        if (isReconnect) {
          this.publish('analytics:invalidated', {
            reason: 'reconnect_recovery',
            timestamp: new Date().toISOString(),
          });
        }
      };

      this.socket.onmessage = (event) => {
        this.lastPongTime = Date.now();
        try {
          const data = JSON.parse(event.data);

          // Handle system pong
          if (data.type === 'pong' || data.event === 'system:pong') {
            return;
          }

          if (data.event && data.payload) {
            const messageId = data.id || `ws-${Date.now()}`;
            if (this.isMessageSeen(messageId)) return;
            this.markMessageSeen(messageId);

            const msg: RealtimeMessage<any> = {
              id: messageId,
              event: data.event,
              payload: data.payload,
              timestamp: data.timestamp || new Date().toISOString(),
            };

            this.dispatchLocal(data.event, data.payload, msg);
          }
        } catch {}
      };

      this.socket.onerror = () => {
        // Socket errors precede onclose; transition to error/reconnecting
        if (this.reconnectAttempts > 5) {
          this.setConnectionState('error');
        } else {
          this.setConnectionState('reconnecting');
        }
      };

      this.socket.onclose = () => {
        this.stopHeartbeat();
        this.socket = null;

        if (!this.isExplicitDisconnect) {
          this.scheduleReconnect();
        }
      };
    } catch (err) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.isExplicitDisconnect) return;

    this.reconnectAttempts += 1;
    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      // Fallback: don't loop forever, maintain database-backed mode
      this.setConnectionState('offline');
      return;
    }

    this.setConnectionState('reconnecting');

    // Exponential backoff with jitter: min(16s, 1000 * 2^attempts) + random(0-500ms)
    const backoff = Math.min(
      this.maxBackoffMs,
      this.baseBackoffMs * Math.pow(2, Math.min(this.reconnectAttempts, 4))
    );
    const jitter = Math.floor(Math.random() * 500);
    const delay = backoff + jitter;

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.initWebSocket();
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        try {
          this.socket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        } catch {}
      }
    }, 15000);

    // Timeout check every 10s: if no activity for 35s, trigger reconnect
    this.heartbeatTimeoutCheck = setInterval(() => {
      if (Date.now() - this.lastPongTime > 35000 && this.socket) {
        try {
          this.socket.close();
        } catch {}
      }
    }, 10000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.heartbeatTimeoutCheck) {
      clearInterval(this.heartbeatTimeoutCheck);
      this.heartbeatTimeoutCheck = null;
    }
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();
  }

  private setConnectionState(state: RealtimeConnectionState): void {
    if (this.connectionState === state) return;
    this.connectionState = state;
    for (const listener of this.statusListeners) {
      try {
        listener(state);
      } catch {}
    }
  }

  private dispatchLocal(event: RealtimeEventType, payload: any, msg: RealtimeMessage<any>): void {
    // 1. Notify specific event subscribers
    const handlers = this.eventListeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(payload, msg);
        } catch (err) {
          console.error(`Error in realtime handler for ${event}:`, err);
        }
      }
    }

    // 2. Notify wildcard subscribers
    for (const handler of this.allListeners) {
      try {
        handler(event, payload, msg);
      } catch (err) {
        console.error(`Error in realtime wildcard handler for ${event}:`, err);
      }
    }
  }

  private isMessageSeen(id: string): boolean {
    return this.seenMessageIds.has(id);
  }

  private markMessageSeen(id: string): void {
    this.seenMessageIds.add(id);
    this.messageIdQueue.push(id);
    if (this.messageIdQueue.length > this.maxSeenCache) {
      const oldest = this.messageIdQueue.shift();
      if (oldest) {
        this.seenMessageIds.delete(oldest);
      }
    }
  }

  private handleWindowFocus(): void {
    // Check if socket is dead and needs reconnect
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.reconnect();
    } else {
      // Re-verify snapshot on window resume
      this.dispatchLocal('analytics:invalidated', {
        reason: 'reconnect_recovery',
        timestamp: new Date().toISOString(),
      }, {
        id: `focus-${Date.now()}`,
        event: 'analytics:invalidated',
        payload: { reason: 'reconnect_recovery', timestamp: new Date().toISOString() },
        timestamp: new Date().toISOString(),
      });
    }
  }

  private reconnect(): void {
    this.reconnectAttempts = 0;
    this.initWebSocket();
  }
}

export const realtimeService = new RealtimeService();

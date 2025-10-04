import { useGardenStore } from './garden-store';
import type { AgentUpdate } from '../services/garden/types';

interface WebSocketMessage {
  type: string;
  data: AgentUpdate;
  timestamp: number;
}

export class GardenWebSocket {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private isConnecting = false;

  constructor(private url: string) {
    this.connect();
  }

  private async connect() {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    const store = useGardenStore.getState();
    store.setConnectionStatus('connecting');

    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        console.log('🔌 Garden WebSocket connected');
        this.isConnecting = false;
        store.setConnectionStatus('connected');
        store.resetReconnectAttempts();
        
        // Start heartbeat
        this.startHeartbeat();
        
        // Send queued messages
        this.flushMessageQueue();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('🔌 Garden WebSocket disconnected:', event.code, event.reason);
        this.isConnecting = false;
        store.setConnectionStatus('disconnected');
        this.stopHeartbeat();
        
        // Attempt reconnection unless it was a clean close
        if (event.code !== 1000) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('🔌 Garden WebSocket error:', error);
        this.isConnecting = false;
        store.setConnectionStatus('error');
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
      store.setConnectionStatus('error');
      this.scheduleReconnect();
    }
  }

  private handleMessage(message: WebSocketMessage) {
    const store = useGardenStore.getState();
    const update = message.data;

    // Add message to store
    store.addMessage(update);

    // Handle specific update types with optimized state updates
    switch (update.type) {
      case 'phase_start':
        if (update.phase) {
          store.updatePhaseStatus(update.phase, 'active');
        }
        break;

      case 'research_finding':
        store.addResearchFinding({
          source: update.metadata?.source || 'web',
          summary: update.content,
          confidence: update.metadata?.confidence || 0.5,
          relevance: update.metadata?.relevance || 0.5,
          timestamp: new Date().toISOString()
        });
        break;

      case 'needs_human_input':
        if (update.questions) {
          store.setHumanQuestions(update.questions);
          store.setShowHumanInput(true);
          store.setShowInput(true);
        }
        break;

      case 'document_complete':
        store.updatePhaseStatus('writing', 'completed');
        store.updateQualityMetrics({
          completeness: update.metadata?.completeness || 0,
          confidence: update.metadata?.quality_score || 0,
          research_depth: store.researchFindings.length * 10
        });
        store.setShowInput(true);
        break;
    }
  }

  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // 30 second heartbeat
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;

    const store = useGardenStore.getState();
    const attempts = store.reconnectAttempts;
    
    // Exponential backoff with jitter
    const delay = Math.min(1000 * Math.pow(2, attempts), 30000) + Math.random() * 1000;
    
    console.log(`🔄 Scheduling reconnect in ${Math.round(delay)}ms (attempt ${attempts + 1})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      store.incrementReconnectAttempts();
      this.connect();
    }, delay);
  }

  public send(data: AgentUpdate) {
    const message: WebSocketMessage = {
      type: 'garden_update',
      data,
      timestamp: Date.now()
    };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message for later
      this.messageQueue.push(message);
      
      // Attempt to connect if not connected
      if (!this.isConnecting && (!this.ws || this.ws.readyState === WebSocket.CLOSED)) {
        this.connect();
      }
    }
  }

  private flushMessageQueue() {
    if (this.messageQueue.length === 0) return;

    console.log(`📤 Sending ${this.messageQueue.length} queued messages`);
    
    for (const message of this.messageQueue) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(message));
      }
    }
    
    this.messageQueue = [];
  }

  public disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  public getConnectionState() {
    return this.ws?.readyState || WebSocket.CLOSED;
  }
}

// Singleton instance
let gardenWebSocket: GardenWebSocket | null = null;

export const useGardenWebSocket = (url?: string) => {
  if (!gardenWebSocket && url) {
    gardenWebSocket = new GardenWebSocket(url);
  }
  
  return gardenWebSocket;
};

export const disconnectGardenWebSocket = () => {
  if (gardenWebSocket) {
    gardenWebSocket.disconnect();
    gardenWebSocket = null;
  }
};
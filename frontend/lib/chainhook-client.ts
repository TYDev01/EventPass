"use client";

/**
 * EventPass Chainhook Client
 * 
 * Listens to contract events in real-time via Hiro API's streaming endpoint
 * for immediate updates without polling.
 */

type EventType = 
  | "event-created"
  | "ticket-purchased"
  | "ticket-transferred"
  | "event-canceled"
  | "event-ended"
  | "refund-claimed"
  | "refund-processed"
  | "batch-payment";

interface ContractEvent {
  event: EventType;
  eventId: number;
  [key: string]: any;
}

type EventHandler = (event: ContractEvent) => void;

class ChainhookClient {
  private handlers: Map<EventType | "*", Set<EventHandler>> = new Map();
  private contractAddress: string;
  private contractName: string;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private isConnecting = false;

  constructor(contractAddress: string, contractName: string) {
    this.contractAddress = contractAddress;
    this.contractName = contractName;
  }

  /**
   * Subscribe to specific event types
   */
  on(eventType: EventType | "*", handler: EventHandler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
    
    // Auto-connect if this is the first handler
    if (this.getTotalHandlers() === 1 && !this.ws && !this.isConnecting) {
      this.connect();
    }
    
    return () => this.off(eventType, handler);
  }

  /**
   * Unsubscribe from events
   */
  off(eventType: EventType | "*", handler: EventHandler) {
    this.handlers.get(eventType)?.delete(handler);
    
    // Disconnect if no more handlers
    if (this.getTotalHandlers() === 0) {
      this.disconnect();
    }
  }

  /**
   * Connect to Hiro API websocket for real-time events
   */
  private connect() {
    if (this.isConnecting || this.ws) return;
    
    this.isConnecting = true;
    
    try {
      // Use Hiro's websocket endpoint for real-time transaction updates
      const wsUrl = `wss://api.hiro.so/extended/v1/ws`;
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log("✅ Chainhook client connected");
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        
        // Subscribe to contract events
        this.ws?.send(JSON.stringify({
          action: "subscribe",
          topic: "mempool",
          contractId: `${this.contractAddress}.${this.contractName}`
        }));
        
        this.ws?.send(JSON.stringify({
          action: "subscribe", 
          topic: "microblock",
          contractId: `${this.contractAddress}.${this.contractName}`
        }));
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error("Error parsing chainhook message:", error);
        }
      };

      this.ws.onerror = (error) => {
        console.error("Chainhook websocket error:", error);
        this.isConnecting = false;
      };

      this.ws.onclose = () => {
        console.log("Chainhook connection closed");
        this.ws = null;
        this.isConnecting = false;
        
        // Attempt reconnect if we still have handlers
        if (this.getTotalHandlers() > 0 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = this.reconnectDelay * this.reconnectAttempts;
          console.log(`Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts})`);
          setTimeout(() => this.connect(), delay);
        }
      };
    } catch (error) {
      console.error("Failed to create chainhook connection:", error);
      this.isConnecting = false;
    }
  }

  /**
   * Disconnect from websocket
   */
  private disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Handle incoming websocket messages
   */
  private handleMessage(data: any) {
    // Check if this is a contract call transaction
    if (data.contract_call?.contract_id === `${this.contractAddress}.${this.contractName}`) {
      // Try to extract event data from transaction events
      if (data.events) {
        for (const event of data.events) {
          if (event.type === "print_event") {
            try {
              const printData = JSON.parse(event.print);
              if (printData.event) {
                this.emit(printData as ContractEvent);
              }
            } catch {
              // Not a JSON print event, skip
            }
          }
        }
      }
    }
  }

  /**
   * Emit event to all registered handlers
   */
  private emit(event: ContractEvent) {
    // Call specific event handlers
    const specificHandlers = this.handlers.get(event.event);
    specificHandlers?.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error(`Error in event handler for ${event.event}:`, error);
      }
    });

    // Call wildcard handlers
    const wildcardHandlers = this.handlers.get("*");
    wildcardHandlers?.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error("Error in wildcard event handler:", error);
      }
    });
  }

  /**
   * Get total number of registered handlers
   */
  private getTotalHandlers(): number {
    let total = 0;
    this.handlers.forEach(set => total += set.size);
    return total;
  }

  /**
   * Manually trigger a reconnection
   */
  reconnect() {
    this.disconnect();
    this.reconnectAttempts = 0;
    if (this.getTotalHandlers() > 0) {
      this.connect();
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

let chainhookClientInstance: ChainhookClient | null = null;

/**
 * Get or create the singleton chainhook client instance
 */
export function getChainhookClient(contractAddress: string, contractName: string): ChainhookClient {
  if (!chainhookClientInstance || 
      chainhookClientInstance["contractAddress"] !== contractAddress ||
      chainhookClientInstance["contractName"] !== contractName) {
    chainhookClientInstance = new ChainhookClient(contractAddress, contractName);
  }
  return chainhookClientInstance;
}

/**
 * React hook for listening to contract events
 */
export function useChainhookEvents(
  contractAddress: string,
  contractName: string,
  eventType: EventType | "*",
  handler: EventHandler,
  enabled: boolean = true
) {
  if (typeof window === "undefined") return;

  const client = getChainhookClient(contractAddress, contractName);
  
  if (enabled) {
    const unsubscribe = client.on(eventType, handler);
    return unsubscribe;
  }
}

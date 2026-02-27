// ===========================================
// SSE EVENT BUS - Real-time negotiation updates
// ===========================================

import { Response } from 'express';

// Map of negotiationId -> Set of SSE connections
const connections = new Map<string, Set<Response>>();

// Event types for negotiation updates
export interface NegotiationEvent {
  type: 'status_change' | 'transcript' | 'completion' | 'error';
  data: Record<string, unknown>;
}

/**
 * Subscribe a response object to receive SSE events for a negotiation
 */
export function subscribe(negotiationId: string, res: Response): void {
  if (!connections.has(negotiationId)) {
    connections.set(negotiationId, new Set());
  }
  connections.get(negotiationId)!.add(res);
  console.log(`[SSE] Subscribed to negotiation ${negotiationId}, total connections: ${connections.get(negotiationId)!.size}`);
}

/**
 * Unsubscribe a response from SSE events
 */
export function unsubscribe(negotiationId: string, res: Response): void {
  const negotiationConnections = connections.get(negotiationId);
  if (negotiationConnections) {
    negotiationConnections.delete(res);
    if (negotiationConnections.size === 0) {
      connections.delete(negotiationId);
    }
    console.log(`[SSE] Unsubscribed from negotiation ${negotiationId}`);
  }
}

/**
 * Emit an event to all subscribers for a negotiation
 */
export function emit(negotiationId: string, event: NegotiationEvent): void {
  const negotiationConnections = connections.get(negotiationId);
  if (!negotiationConnections || negotiationConnections.size === 0) {
    console.log(`[SSE] No connections for negotiation ${negotiationId}`);
    return;
  }

  const eventData = `data: ${JSON.stringify(event.data)}\n\n`;
  
  console.log(`[SSE] Emitting ${event.type} to ${negotiationConnections.size} connections for negotiation ${negotiationId}`);
  
  for (const res of negotiationConnections) {
    try {
      res.write(eventData);
    } catch (error) {
      console.error(`[SSE] Failed to write to connection:`, error);
      // Connection might be closed, remove it
      negotiationConnections.delete(res);
    }
  }
}

/**
 * Emit a status change event
 */
export function emitStatusChange(negotiationId: string, status: string, additionalData?: Record<string, unknown>): void {
  emit(negotiationId, {
    type: 'status_change',
    data: {
      type: 'status_change',
      status,
      timestamp: new Date().toISOString(),
      ...additionalData,
    },
  });
}

/**
 * Emit a transcript event
 */
export function emitTranscript(negotiationId: string, role: 'user' | 'assistant', text: string): void {
  emit(negotiationId, {
    type: 'transcript',
    data: {
      type: 'transcript',
      role,
      text,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Emit a completion event
 */
export function emitCompletion(negotiationId: string, result: {
  success: boolean;
  newRate?: number;
  monthlySavings?: number;
  annualSavings?: number;
  message?: string;
}): void {
  emit(negotiationId, {
    type: 'completion',
    data: {
      type: 'completion',
      ...result,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Emit an error event
 */
export function emitError(negotiationId: string, error: string): void {
  emit(negotiationId, {
    type: 'error',
    data: {
      type: 'error',
      error,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Get the number of active connections for a negotiation
 */
export function getConnectionCount(negotiationId: string): number {
  return connections.get(negotiationId)?.size || 0;
}

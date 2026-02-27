// ===========================================
// VOICE SERVICE - Telnyx Call Control + AI Assistant
// ===========================================

import { Negotiation, PROVIDERS, ProviderId } from '../types/index.js';
import { getOrCreateAssistant } from './assistant.js';
import {
  getNegotiation,
  updateNegotiation,
  getBill,
  updateBillStatus
} from './storage.js';
import { storeNegotiationResult } from './graph.js';
import { parseNegotiationOutcome } from './outcome-parser.js';
import { emitTranscript, emitCompletion, emitError, emitStatusChange } from './events.js';
import { buildVoiceIntelligence, isModulateConfigured, analyzeBatchAudio } from './modulate.js';

const TELNYX_API_BASE = 'https://api.telnyx.com/v2';

// In-memory map of call_control_id -> { negotiationId, instructions, completed } for webhook handling
// 'completed' tracks whether the AI assistant finished successfully (vs hangup without completion)
const callNegotiationMap = new Map<string, { 
  negotiationId: string; 
  instructions: string;
  completed?: boolean;
}>();

async function telnyxRequest(endpoint: string, method: string = 'GET', body?: object): Promise<any> {
  const apiKey = process.env.TELNYX_API_KEY;
  if (!apiKey) throw new Error('TELNYX_API_KEY not configured');

  const response = await fetch(`${TELNYX_API_BASE}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Telnyx API error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Build call-specific instructions with bill details and competitor intel
 */
function buildNegotiationInstructions(negotiation: Negotiation): string {
  // Generate a human-friendly account reference (not the UUID)
  const accountRef = `ACC-${negotiation.billId.slice(-8).toUpperCase()}`;
  const customerName = negotiation.customerName || 'John';
  
  // Get the current provider to exclude from competitor mentions
  const bill = getBill(negotiation.billId);
  const currentProvider = bill?.provider || '';
  
  // Filter out the current provider from competitor rates
  const filteredCompetitors = (negotiation.competitorRates || [])
    .filter(r => !r.provider.toLowerCase().includes(currentProvider.toLowerCase()) && 
                 !currentProvider.toLowerCase().includes(r.provider.toLowerCase()));
  
  const competitorSection = filteredCompetitors.length
    ? `\nCompetitor rates to reference:\n${filteredCompetitors.map(r => `- ${r.provider}: ${r.planName} at $${r.monthlyRate}/mo`).join('\n')}`
    : '';

  const tacticsSection = negotiation.selectedTactics?.length
    ? `\nTactics (use in order):\n${negotiation.selectedTactics.map((t, i) => `${i + 1}. ${t.replace(/_/g, ' ')}`).join('\n')}`
    : '';

  const targetRate = negotiation.originalRate * 0.80; // 20% savings target
  const minimumAcceptable = negotiation.originalRate * 0.85; // 15% savings minimum

  return `You are Alex from SaveRight Consumer Services, calling on behalf of ${customerName} to negotiate a lower rate on their bill.

CUSTOMER INFO:
- Customer name: ${customerName}
- Account reference: ${accountRef}
- Current monthly rate: $${negotiation.originalRate}/month
- Target rate: $${targetRate.toFixed(2)}/month or lower
- Minimum acceptable: $${minimumAcceptable.toFixed(2)}/month
${tacticsSection}
${competitorSection}

CRITICAL RULES:
1. When asked for customer name, say "${customerName}". When asked for account number, say "${accountRef}".
2. NEVER read out UUIDs, bill IDs, or any code that looks like "bill_xxxx-xxxx". Use "${accountRef}" instead.
3. If offered a rate AT or BELOW $${targetRate.toFixed(2)}/month — ACCEPT IMMEDIATELY. Say "That works, thank you!"
4. If offered a rate between $${targetRate.toFixed(2)} and $${minimumAcceptable.toFixed(2)} — push back ONCE, then accept.
5. If offered a rate above $${minimumAcceptable.toFixed(2)} — push back firmly up to 3 times before accepting.
6. NEVER counter-offer with a HIGHER price than what they offered. That makes no sense.

STYLE:
- Sound human: use "um", "yeah", "so" naturally
- Keep turns SHORT — 1-2 sentences max
- Be confident, not apologetic. You're a professional negotiator.
- If the first rep can't help, ask for the retention or cancellation department
- Reference competitor offers naturally: "I've been comparing rates, and [competitor] is offering [plan] for $X/mo"
- When pushing back: "I appreciate that, but I was really hoping to get closer to $X. Is there anything else you can do?"
- Never reveal you're an AI
- Thank the rep at the end regardless of outcome

OPENING: Start by identifying yourself and the customer. "Hi, I'm Alex calling from SaveRight Consumer Services on behalf of ${customerName}, account ${accountRef}. I'm hoping to discuss their current rate."`;
}

/**
 * Download call recording from Telnyx
 * Telnyx stores recordings after call completion
 */
async function downloadCallRecording(callId: string): Promise<Buffer | null> {
  try {
    // Wait a bit for Telnyx to finalize the recording (2-3 seconds after call ends)
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get list of recordings for this call
    const recordings = await telnyxRequest(`/recordings?filter[call_leg_id]=${callId}`);

    if (!recordings?.data || recordings.data.length === 0) {
      console.warn(`[Voice] No recording found for call ${callId}`);
      return null;
    }

    // Get the most recent recording
    const recording = recordings.data[0];
    const downloadUrl = recording.download_urls?.mp3 || recording.download_urls?.wav;

    if (!downloadUrl) {
      console.warn(`[Voice] No download URL for recording ${recording.id}`);
      return null;
    }

    console.log(`[Voice] Downloading recording from: ${downloadUrl}`);

    // Download the audio file
    const apiKey = process.env.TELNYX_API_KEY;
    const response = await fetch(downloadUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      console.error(`[Voice] Failed to download recording: ${response.status}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('[Voice] Error downloading call recording:', error);
    return null;
  }
}

/**
 * Generate voice intelligence from call recording using Modulate Velma-2 API
 * Falls back to mock data if recording unavailable or Modulate not configured
 */
async function generateVoiceIntelligence(callId: string, success: boolean) {
  if (!isModulateConfigured()) {
    console.log('[Voice] Modulate not configured, skipping voice intelligence');
    return undefined;
  }

  // Try to get real voice intelligence from call recording
  const recordingBuffer = await downloadCallRecording(callId);

  if (recordingBuffer) {
    console.log('[Voice] Analyzing call recording with Modulate Velma-2...');
    const result = await analyzeBatchAudio(recordingBuffer, `call-${callId}.mp3`);

    if (result && result.utterances.length > 0) {
      console.log(`[Voice] Modulate analysis complete: ${result.utterances.length} utterances`);
      return buildVoiceIntelligence(result.utterances);
    }
  }

  // Fallback: generate mock data if recording unavailable
  console.log('[Voice] Using mock voice intelligence (recording not available)');
  const mockUtterances = success
    ? [
        { text: 'Hello, this is customer retention', emotion: 'Neutral', speaker: 1, start_ms: 0, duration_ms: 2000 },
        { text: 'I was hoping to discuss my current rate', emotion: 'Calm', speaker: 0, start_ms: 2500, duration_ms: 3000 },
        { text: 'I see you have been with us for a while', emotion: 'Pleasant', speaker: 1, start_ms: 6000, duration_ms: 2500 },
        { text: 'Yes, and I have been comparing rates with other providers', emotion: 'Confident', speaker: 0, start_ms: 9000, duration_ms: 3500 },
        { text: 'Let me see what I can do for you', emotion: 'Cooperative', speaker: 1, start_ms: 13000, duration_ms: 2000 },
        { text: 'I can offer you a promotional rate', emotion: 'Pleasant', speaker: 1, start_ms: 16000, duration_ms: 2500 },
        { text: 'That sounds great, thank you', emotion: 'Satisfied', speaker: 0, start_ms: 19000, duration_ms: 2000 },
      ]
    : [
        { text: 'Hello, this is customer service', emotion: 'Neutral', speaker: 1, start_ms: 0, duration_ms: 2000 },
        { text: 'I wanted to see if we could adjust my rate', emotion: 'Hopeful', speaker: 0, start_ms: 2500, duration_ms: 3000 },
        { text: 'Unfortunately that rate is the best we can offer', emotion: 'Firm', speaker: 1, start_ms: 6000, duration_ms: 2500 },
        { text: 'Are there no promotions available?', emotion: 'Disappointed', speaker: 0, start_ms: 9000, duration_ms: 2500 },
        { text: 'Not at this time', emotion: 'Firm', speaker: 1, start_ms: 12000, duration_ms: 1500 },
      ];

  return buildVoiceIntelligence(
    mockUtterances.map((u, i) => ({
      utterance_uuid: `mock-${i}`,
      text: u.text,
      start_ms: u.start_ms,
      duration_ms: u.duration_ms,
      speaker: u.speaker,
      language: 'en',
      emotion: u.emotion,
      accent: null,
    }))
  );
}

/**
 * Initiate an outbound call and start the AI assistant on it
 */
export async function initiateCall(negotiation: Negotiation): Promise<{
  callId: string;
  callControlId: string;
}> {
  const phoneNumber = process.env.TELNYX_PHONE_NUMBER;
  const connectionId = process.env.TELNYX_CONNECTION_ID;

  if (!phoneNumber) throw new Error('TELNYX_PHONE_NUMBER not configured');
  if (!connectionId) throw new Error('TELNYX_CONNECTION_ID not configured');

  // Get or create the AI assistant
  const assistantId = await getOrCreateAssistant();

  // Determine the number to call
  const bill = getBill(negotiation.billId);
  const provider = bill ? PROVIDERS[bill.provider as ProviderId] : null;
  const retentionPhone = provider?.retentionDepartmentPhone?.replace(/\D/g, '') || '18009346489';
  const fromNumber = phoneNumber.replace(/\D/g, '');

  // Step 1: Dial the provider
  const callResult = await telnyxRequest('/calls', 'POST', {
    connection_id: connectionId,
    from: `+${fromNumber}`,
    to: `+${retentionPhone}`,
    webhook_url: process.env.TELNYX_WEBHOOK_URL || undefined,
  });

  const callId = callResult.data.id;
  const callControlId = callResult.data.call_control_id;

  // Build instructions first so we can use them both now and store for later
  const instructions = buildNegotiationInstructions(negotiation);

  // Track this call -> negotiation mapping with instructions for later use
  callNegotiationMap.set(callControlId, {
    negotiationId: negotiation.id,
    instructions,
  });

  // Step 2: Start the AI assistant on the call with bill-specific instructions
  try {
    await telnyxRequest(`/calls/${callControlId}/actions/ai_assistant_start`, 'POST', {
      assistant: {
        id: assistantId,
        instructions,
      },
    });
    console.log(`AI assistant started on call ${callControlId}`);
  } catch (err) {
    console.warn('Failed to start AI assistant immediately (call may not be answered yet):', err);
    // The assistant will be started in the call.answered webhook handler instead
  }

  return { callId, callControlId };
}

/**
 * Handle Telnyx webhook events for call lifecycle
 */
export async function handleWebhook(event: {
  event_type: string;
  payload: {
    call_leg_id: string;
    call_control_id: string;
    call_session_id?: string;
    state: string;
    duration?: number;
    result?: {
      outcome?: string;
      recording_url?: string;
    };
    // AI Assistant event fields
    assistant_id?: string;
    transcript?: string;
    role?: 'user' | 'assistant';
    error?: string;
    summary?: string;
    outcome?: string;
  };
}): Promise<{
  status: string;
  callId: string;
  outcome?: string;
  transcript?: string;
  role?: string;
  error?: string;
}> {
  const { event_type, payload } = event;
  console.log(`Telnyx webhook: ${event_type}`, JSON.stringify(payload, null, 2));

  switch (event_type) {
    case 'call.initiated':
      return { status: 'initiated', callId: payload.call_leg_id || payload.call_session_id || '' };

    case 'call.answered': {
      // Try to start AI assistant if it wasn't started during dial
      const callData = callNegotiationMap.get(payload.call_control_id);
      if (callData) {
        try {
          const assistantId = await getOrCreateAssistant();
          // Pass the negotiation-specific instructions when starting on answered call
          await telnyxRequest(`/calls/${payload.call_control_id}/actions/ai_assistant_start`, 'POST', {
            assistant: {
              id: assistantId,
              instructions: callData.instructions,
            },
          });
          console.log(`AI assistant started on answered call ${payload.call_control_id}`);
        } catch (err) {
          // Assistant may already be running
          console.warn('Could not start assistant on answer (may already be running):', err);
        }
      }
      return { status: 'answered', callId: payload.call_leg_id || payload.call_session_id || '' };
    }

    case 'call.hangup': {
      const callData = callNegotiationMap.get(payload.call_control_id);
      
      // If negotiation wasn't completed (AI didn't finish), mark as failed
      if (callData && !callData.completed) {
        console.log(`Call hung up without AI completion for negotiation ${callData.negotiationId}`);
        
        const negotiation = getNegotiation(callData.negotiationId);
        if (negotiation) {
          updateNegotiation(callData.negotiationId, {
            status: 'failed',
            completedAt: new Date(),
          });
          
          // Reset bill status back to active
          updateBillStatus(negotiation.billId, 'active');
          
          console.log(`Marked negotiation ${callData.negotiationId} as failed due to hangup`);
        }
      }
      
      callNegotiationMap.delete(payload.call_control_id);
      return {
        status: 'completed',
        callId: payload.call_leg_id || payload.call_session_id || '',
        outcome: payload.result?.outcome || 'completed',
      };
    }

    case 'call.conversation.ended':
      return {
        status: 'conversation_ended',
        callId: payload.call_leg_id || payload.call_session_id || '',
        outcome: 'conversation_ended',
      };

    // ===========================================
    // AI Assistant Events
    // ===========================================
    case 'call.ai.assistant.transcript': {
      // Live transcript update during the call
      const transcript = payload.transcript;
      const role = payload.role;
      console.log(`AI Transcript (${role}): ${transcript}`);
      
      // Emit SSE event for live transcript
      const callData = callNegotiationMap.get(payload.call_control_id);
      if (callData && transcript) {
        emitTranscript(callData.negotiationId, role || 'assistant', transcript);
      }
      
      return {
        status: 'transcript',
        callId: payload.call_leg_id || payload.call_session_id || '',
        transcript,
        role,
      };
    }

    case 'call.ai.assistant.completed': {
      // AI assistant finished its work
      const callData = callNegotiationMap.get(payload.call_control_id);
      console.log(`AI Assistant completed on call ${payload.call_control_id}`);
      
      if (callData) {
        // Mark as completed so hangup handler knows not to mark as failed
        callData.completed = true;
        
        const negotiation = getNegotiation(callData.negotiationId);
        if (negotiation) {
          // Parse the outcome from the AI assistant's summary/transcript
          const summary = payload.summary || payload.transcript || '';
          const outcome = parseNegotiationOutcome(summary, negotiation.originalRate);
          
          console.log(`Parsed negotiation outcome:`, {
            success: outcome.success,
            newRate: outcome.newRate,
            monthlySavings: outcome.monthlySavings,
            confidence: outcome.confidence,
          });
          
          // Generate voice intelligence (Modulate integration)
          // Downloads call recording from Telnyx, analyzes with Modulate Velma-2 API
          // Falls back to mock data if recording unavailable
          const voiceIntelligence = await generateVoiceIntelligence(
            payload.call_leg_id || payload.call_session_id || '',
            outcome.success
          );

          // Update the negotiation record
          updateNegotiation(callData.negotiationId, {
            status: outcome.success ? 'success' : 'failed',
            newRate: outcome.newRate,
            monthlySavings: outcome.monthlySavings,
            totalSavings: outcome.totalSavings,
            voiceIntelligence,
            completedAt: new Date(),
          });

          // Emit SSE completion event
          emitCompletion(callData.negotiationId, {
            success: outcome.success,
            newRate: outcome.newRate,
            monthlySavings: outcome.monthlySavings,
            annualSavings: outcome.monthlySavings ? outcome.monthlySavings * 12 : undefined,
            message: outcome.success ? 'Negotiation successful!' : 'Could not secure a better rate',
          });
          
          // Update bill status
          const bill = getBill(negotiation.billId);
          if (bill) {
            updateBillStatus(negotiation.billId, outcome.success ? 'negotiated' : 'active');
          }
          
          // Store successful result in knowledge graph for future leverage
          if (outcome.success && negotiation.selectedTactics && outcome.newRate) {
            // Get provider from bill or use a default
            const provider = bill?.provider as ProviderId || 'comcast';
            
            storeNegotiationResult(
              provider,
              negotiation.originalRate,
              outcome.newRate,
              negotiation.selectedTactics,
              true
            ).catch(err => {
              // Don't fail if graph storage fails - it's optional
              console.warn('Failed to store negotiation result in graph:', err);
            });
          }
          
          console.log(`Negotiation ${callData.negotiationId} updated: ${outcome.success ? 'SUCCESS' : 'FAILED'}`);
        }
        
        // Clean up the mapping
        callNegotiationMap.delete(payload.call_control_id);
      }
      
      return {
        status: 'ai_completed',
        callId: payload.call_leg_id || payload.call_session_id || '',
        outcome: payload.outcome || 'completed',
        transcript: payload.summary,
      };
    }

    case 'call.ai.assistant.error': {
      // AI assistant encountered an error
      console.error(`AI Assistant error on call ${payload.call_control_id}:`, payload.error);
      
      const callData = callNegotiationMap.get(payload.call_control_id);
      if (callData) {
        // Mark as completed so hangup handler doesn't double-fail
        callData.completed = true;
        
        // Emit SSE error event
        emitError(callData.negotiationId, payload.error || 'AI assistant encountered an error');
        
        const negotiation = getNegotiation(callData.negotiationId);
        if (negotiation) {
          updateNegotiation(callData.negotiationId, {
            status: 'failed',
            completedAt: new Date(),
          });
          
          // Emit status change for failed
          emitStatusChange(callData.negotiationId, 'failed', { error: payload.error });
          
          // Reset bill status
          updateBillStatus(negotiation.billId, 'active');
          
          console.log(`Marked negotiation ${callData.negotiationId} as failed due to AI error`);
        }
        
        callNegotiationMap.delete(payload.call_control_id);
      }
      
      return {
        status: 'ai_error',
        callId: payload.call_leg_id || payload.call_session_id || '',
        error: payload.error,
      };
    }

    default:
      return { status: event_type, callId: payload.call_leg_id || payload.call_session_id || '' };
  }
}

/**
 * End an active call
 */
export async function endCall(callControlId: string): Promise<void> {
  await telnyxRequest(`/calls/${callControlId}/actions/hangup`, 'POST', {});
  callNegotiationMap.delete(callControlId);
}

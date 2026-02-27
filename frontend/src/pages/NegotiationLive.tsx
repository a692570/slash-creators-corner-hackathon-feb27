import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Circle, Loader2, Phone } from 'lucide-react';
import { api, type Negotiation } from '../api/client';

interface VoiceIntelligence {
  emotions: Record<string, number>;
  dominantEmotion: string;
  speakerCount: number;
  piiDetected: boolean;
  utteranceCount: number;
  durationMs: number;
  emotionTimeline: Array<{ time_ms: number; emotion: string; speaker: number; text: string }>;
}

const STEPS = [
  { id: 'pending', label: 'Initializing' },
  { id: 'researching', label: 'Researching competitors' },
  { id: 'calling', label: 'Calling provider' },
  { id: 'negotiating', label: 'Negotiating rates' },
  { id: 'success', label: 'Complete' },
];

// Transcript entry type for live conversation display
interface TranscriptEntry {
  role: 'user' | 'assistant';  // user = provider rep, assistant = Slash AI
  text: string;
  timestamp: string;
}

export function NegotiationLive() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [negotiation, setNegotiation] = useState<Negotiation | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [sseConnected, setSseConnected] = useState(false);
  const [voiceIntelligence, setVoiceIntelligence] = useState<VoiceIntelligence | null>(null);
  const [tavilyResults, setTavilyResults] = useState<any[]>([]);
  const [yutoriResults, setYutoriResults] = useState<any[]>([]);
  const [strategyReady, setStrategyReady] = useState(false);
  const [strategyData, setStrategyData] = useState<any>(null);
  const confettiRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Auto-scroll transcript to bottom
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  useEffect(() => {
    const fetchNegotiation = async () => {
      try {
        const data = await api.getNegotiation(id!);
        setNegotiation(data);
      } catch (error) {
        console.log('Using mock data - API not available');
        // Fallback: show in-progress state
        setNegotiation({
          id: id!,
          billId: 'unknown',
          status: 'researching',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchNegotiation();
  }, [id]);

  // SSE connection for real-time updates
  useEffect(() => {
    if (!id || !negotiation) return;
    
    // Don't connect if already completed
    if (negotiation.status === 'success' || negotiation.status === 'failed') return;

    const eventSource = api.getNegotiationStream(id);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('[SSE] Connected to negotiation stream');
      setSseConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Received event:', data);

        switch (data.type) {
          case 'research_complete':
            // Tavily & Yutori research results
            console.log('[SSE] Research complete:', data);
            setTavilyResults(data.tavilyResults || []);
            setYutoriResults(data.yutoriResults || []);
            setNegotiation(prev => prev ? { ...prev, competitorRates: data.competitorRates } : null);
            break;

          case 'strategy_ready':
            // Neo4j strategy selected
            console.log('[SSE] Strategy ready:', data);
            setStrategyReady(true);
            setStrategyData(data);
            setNegotiation(prev => prev ? { ...prev, selectedTactics: data.tactics } : null);
            break;

          case 'status_change':
            setNegotiation(prev => {
              if (!prev) return null;
              return {
                ...prev,
                status: data.status,
                newRate: data.newRate ?? prev.newRate,
                monthlySavings: data.monthlySavings ?? prev.monthlySavings,
                updatedAt: data.timestamp,
              };
            });
            break;

          case 'transcript':
            setTranscript(prev => [...prev, {
              role: data.role,
              text: data.text,
              timestamp: data.timestamp,
            }]);
            break;

          case 'completion':
            setNegotiation(prev => {
              if (!prev) return null;
              return {
                ...prev,
                status: data.success ? 'success' : 'failed',
                newRate: data.newRate,
                monthlySavings: data.monthlySavings,
                annualSavings: data.annualSavings,
                updatedAt: data.timestamp,
              };
            });
            break;

          case 'error':
            console.error('[SSE] Error event:', data.error);
            break;
        }
      } catch (err) {
        console.error('[SSE] Failed to parse event:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('[SSE] Connection error:', err);
      setSseConnected(false);
      // EventSource will automatically try to reconnect
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [id, negotiation?.status]);

  // Poll for updates (fallback if SSE fails)
  useEffect(() => {
    if (!negotiation || negotiation.status === 'success' || negotiation.status === 'failed') {
      return;
    }

    // Skip polling if SSE is connected
    if (sseConnected) return;

    const interval = setInterval(async () => {
      try {
        const updated = await api.getNegotiation(negotiation.id);
        setNegotiation(updated);
      } catch (error) {
        // Simulate progress for demo
        setNegotiation(prev => {
          if (!prev) return null;
          const statuses: Negotiation['status'][] = ['researching', 'calling', 'negotiating', 'success'];
          const currentIndex = statuses.indexOf(prev.status);
          if (currentIndex < statuses.length - 1) {
            const nextStatus = statuses[currentIndex + 1];
            return {
              ...prev,
              status: nextStatus,
              ...(nextStatus === 'success' && {
                originalRate: 89.99,
                newRate: 64.99,
                monthlySavings: 25.00,
                annualSavings: 300.00,
              }),
              updatedAt: new Date().toISOString(),
            };
          }
          return prev;
        });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [negotiation, sseConnected]);

  // Trigger confetti on success
  useEffect(() => {
    if (negotiation?.status === 'success' && !showConfetti) {
      setShowConfetti(true);
      createConfetti();
    }
  }, [negotiation?.status, showConfetti]);

  // Fetch voice intelligence when negotiation completes
  useEffect(() => {
    if (!id || !negotiation) return;
    if (negotiation.status !== 'success' && negotiation.status !== 'failed') return;

    const fetchVoiceIntelligence = async () => {
      try {
        const response = await fetch(`/api/negotiations/${id}/voice-intelligence`, {
          headers: {
            'x-user-id': localStorage.getItem('slash_demo_user_id') || '',
          },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setVoiceIntelligence(data.data);
          }
        }
      } catch (error) {
        console.log('Voice intelligence not available:', error);
      }
    };

    fetchVoiceIntelligence();
  }, [id, negotiation?.status]);

  const createConfetti = () => {
    const container = confettiRef.current;
    if (!container) return;

    const colors = ['#00ff88', '#00dd77', '#ffffff', '#ffaa00'];
    
    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'absolute w-2 h-2 rounded-full';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.left = `${Math.random() * 100}%`;
      confetti.style.animationDelay = `${Math.random() * 0.5}s`;
      confetti.style.animation = 'confetti-fall 3s ease-out forwards';
      container.appendChild(confetti);
      
      setTimeout(() => confetti.remove(), 3000);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getCurrentStepIndex = () => {
    if (!negotiation) return 0;
    if (negotiation.status === 'failed') return -1;
    return STEPS.findIndex(s => s.id === negotiation.status);
  };

  const currentStepIndex = getCurrentStepIndex();

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-[#888]">Loading...</div>
      </div>
    );
  }

  if (!negotiation) {
    return (
      <div className="p-8">
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold mb-2">Negotiation not found</h2>
          <button onClick={() => navigate('/')} className="text-[#00ff88] hover:underline">
            Go back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto relative">
      {/* Confetti Container */}
      <div ref={confettiRef} className="fixed inset-0 pointer-events-none overflow-hidden z-50" />

      {/* Header */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-[#888] hover:text-white mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-100%) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>

      {/* Content */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-2">
          {negotiation.status === 'success' ? '🎉 Success!' : 
           negotiation.status === 'failed' ? 'Negotiation Failed' : 
           'Negotiating Your Bill'}
        </h1>
        <p className="text-[#888]">
          {negotiation.status === 'success' ? "We've secured you a better rate!" :
           negotiation.status === 'failed' ? "We couldn't negotiate a better rate this time." :
           'Our AI is working to lower your bill'}
        </p>
        {sseConnected && (
          <span className="inline-block mt-2 text-xs text-[#00ff88] bg-[#00ff88]/10 px-2 py-1 rounded-full">
            Live updates connected
          </span>
        )}
      </div>

      {/* Progress Steps */}
      {negotiation.status !== 'failed' && (
        <div className="mb-12">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex flex-col items-center relative">
                {/* Line */}
                {index < STEPS.length - 1 && (
                  <div className="absolute top-5 left-1/2 w-full h-0.5 bg-[#262626]">
                    <div 
                      className="h-full bg-[#00ff88] transition-all duration-500"
                      style={{ 
                        width: index < currentStepIndex ? '100%' : 
                               index === currentStepIndex ? '50%' : '0%' 
                      }}
                    />
                  </div>
                )}
                
                {/* Circle */}
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 relative z-10 transition-all ${
                    index < currentStepIndex 
                      ? 'border-[#00ff88] bg-[#00ff88]' 
                      : index === currentStepIndex 
                        ? 'border-[#00ff88] bg-[#141414]' 
                        : 'border-[#262626] bg-[#141414]'
                  }`}
                >
                  {index < currentStepIndex ? (
                    <Check className="w-5 h-5 text-black" />
                  ) : index === currentStepIndex ? (
                    <Loader2 className="w-5 h-5 text-[#00ff88] animate-spin" />
                  ) : (
                    <Circle className="w-3 h-3 text-[#666]" />
                  )}
                </div>
                
                {/* Label */}
                <span className={`text-sm mt-2 ${
                  index <= currentStepIndex ? 'text-white' : 'text-[#666]'
                }`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Neo4j Strategy Panel */}
      {negotiation.selectedTactics && negotiation.selectedTactics.length > 0 && (
        <div className="mb-8 bg-[#0a0a0a] border border-[#262626] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse"></div>
              <h3 className="text-sm font-medium text-white">Negotiation Strategy</h3>
            </div>
            <div className="flex gap-2 ml-auto">
              <span className="text-xs bg-green-500/10 text-green-400 px-2 py-1 rounded-full">Neo4j Graph</span>
            </div>
          </div>

          <div className="bg-[#141414] border border-[#262626] rounded-lg p-4 mb-4">
            <div className="text-xs text-[#888] mb-2">AI-Selected Tactics (Graph Intelligence)</div>
            <div className="space-y-2">
              {negotiation.selectedTactics.map((tactic, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#00ff88]/10 text-[#00ff88] text-xs font-bold">
                    {index + 1}
                  </div>
                  <div className="text-sm text-white">
                    {tactic.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-[#666] text-center">
            Strategy built using Neo4j knowledge graph • Historical retention data • Success patterns
          </div>
        </div>
      )}

      {/* Tavily Research Results */}
      {tavilyResults.length > 0 && (
        <div className="mb-8 bg-gradient-to-br from-blue-500/5 to-transparent border border-blue-500/20 rounded-xl p-6 animate-[fadeIn_0.5s_ease-in]">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
              <h3 className="text-lg font-bold text-white">Tavily Market Search</h3>
            </div>
            <span className="ml-auto text-xs bg-blue-500 text-white px-3 py-1 rounded-full font-semibold">LIVE</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tavilyResults.map((rate, index) => (
              <div key={index} className="bg-[#141414] border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="font-semibold text-white capitalize">{rate.provider}</div>
                  <div className="text-blue-400 font-bold text-xl">${rate.monthlyRate}/mo</div>
                </div>
                <div className="text-sm text-[#aaa]">{rate.planName}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-blue-400 text-center">✓ Powered by Tavily Search API</p>
        </div>
      )}

      {/* Yutori Deep Research Results */}
      {yutoriResults.length > 0 && (
        <div className="mb-8 bg-gradient-to-br from-purple-500/5 to-transparent border border-purple-500/20 rounded-xl p-6 animate-[fadeIn_0.5s_ease-in_0.3s]">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500 animate-pulse"></div>
              <h3 className="text-lg font-bold text-white">Yutori Deep Research</h3>
            </div>
            <span className="ml-auto text-xs bg-purple-500 text-white px-3 py-1 rounded-full font-semibold">LIVE</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {yutoriResults.map((rate, index) => (
              <div key={index} className="bg-[#141414] border border-purple-500/30 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="font-semibold text-white capitalize">{rate.provider}</div>
                  <div className="text-purple-400 font-bold text-xl">${rate.monthlyRate}/mo</div>
                </div>
                <div className="text-sm text-[#aaa]">{rate.planName}</div>
                {rate.contractTerms && (
                  <div className="text-xs text-[#666] mt-2">{rate.contractTerms}</div>
                )}
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-purple-400 text-center">✓ Powered by Yutori Research Engine</p>
        </div>
      )}

      {/* Neo4j Strategy Panel */}
      {strategyReady && strategyData && (
        <div className="mb-8 bg-gradient-to-br from-green-500/5 to-transparent border border-green-500/20 rounded-xl p-6 animate-[fadeIn_0.5s_ease-in_0.6s]">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
              <h3 className="text-lg font-bold text-white">Neo4j Strategy Selection</h3>
            </div>
            <span className="ml-auto text-xs bg-green-500 text-white px-3 py-1 rounded-full font-semibold">READY</span>
          </div>
          <div className="space-y-3">
            <div className="text-sm text-[#aaa] mb-3">{strategyData.reasoning}</div>
            {strategyData.tactics && strategyData.tactics.map((tactic: string, index: number) => (
              <div key={index} className="flex items-center gap-3 bg-[#141414] border border-green-500/30 rounded-lg p-3">
                <div className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-sm font-bold">{index + 1}</div>
                <div className="text-white font-medium capitalize">{tactic.replace(/_/g, ' ')}</div>
              </div>
            ))}
            <div className="text-sm text-[#666] mt-3">Expected savings: ${strategyData.expectedSavings?.toFixed(2) || 0}/mo</div>
          </div>
          <p className="mt-4 text-xs text-green-400 text-center">✓ Powered by Neo4j Knowledge Graph</p>
        </div>
      )}

      {/* Live Transcript Panel */}
      {transcript.length > 0 && (
        <div className="mb-8 bg-[#0a0a0a] border border-[#262626] rounded-xl p-4">
          <h3 className="text-sm font-medium text-[#888] mb-3">Live Conversation</h3>
          <div 
            ref={transcriptRef}
            className="max-h-[400px] overflow-y-auto space-y-3"
          >
            {transcript.map((entry, index) => (
              <div key={index} className="flex gap-3">
                <span 
                  className={`text-sm font-medium shrink-0 ${
                    entry.role === 'assistant' ? 'text-[#00ff88]' : 'text-white'
                  }`}
                >
                  {entry.role === 'assistant' ? 'Slash AI' : 'Provider'}:
                </span>
                <span className="text-sm text-[#ccc]">{entry.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Telnyx Call Status Panel */}
      {(negotiation.status === 'calling' || negotiation.status === 'negotiating') && (
        <div className="mb-8 bg-gradient-to-br from-cyan-500/5 to-transparent border border-cyan-500/20 rounded-xl p-6 animate-[fadeIn_0.5s_ease-in]">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-500 animate-pulse"></div>
              <h3 className="text-lg font-bold text-white">
                {negotiation.status === 'calling' ? 'Initiating Call' : 'Live Negotiation'}
              </h3>
            </div>
            <span className="ml-auto text-xs bg-cyan-500 text-white px-3 py-1 rounded-full font-semibold flex items-center gap-2">
              <Phone className="w-3 h-3" />
              {negotiation.status === 'calling' ? 'CALLING' : 'ON CALL'}
            </span>
          </div>
          <div className="bg-[#141414] border border-cyan-500/30 rounded-lg p-4">
            <div className="text-white font-medium mb-2">📞 Calling +1 720-680-5202</div>
            <div className="text-sm text-[#aaa]">
              {negotiation.status === 'calling'
                ? 'Connecting via Telnyx AI Assistant...'
                : 'AI agent negotiating in real-time using selected tactics'}
            </div>
            {negotiation.telnyxCallId && (
              <div className="text-xs text-cyan-400 mt-2">Call ID: {negotiation.telnyxCallId}</div>
            )}
          </div>
          <p className="mt-4 text-xs text-cyan-400 text-center">✓ Powered by Telnyx Voice AI Platform</p>
        </div>
      )}

      {/* Success Result */}
      {negotiation.status === 'success' && negotiation.originalRate && (
        <div className="bg-[#141414] border border-[#00ff88]/30 rounded-2xl p-8">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-[#888] text-sm mb-2">Original Rate</div>
              <div className="text-3xl font-bold line-through text-[#666]">
                {formatCurrency(negotiation.originalRate)}
              </div>
              <div className="text-[#666] text-sm">per month</div>
            </div>
            <div>
              <div className="text-[#888] text-sm mb-2">New Rate</div>
              <div className="text-3xl font-bold text-[#00ff88]">
                {formatCurrency(negotiation.newRate!)}
              </div>
              <div className="text-[#00ff88] text-sm">per month</div>
            </div>
            <div>
              <div className="text-[#888] text-sm mb-2">Monthly Savings</div>
              <div className="text-3xl font-bold text-[#00ff88]">
                {formatCurrency(negotiation.monthlySavings!)}
              </div>
              <div className="text-[#00ff88] text-sm">per month</div>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-[#262626] text-center">
            <div className="text-[#888] text-sm mb-1">Annual Savings</div>
            <div className="text-4xl font-bold text-[#00ff88]">
              {formatCurrency(negotiation.annualSavings!)}
            </div>
            <p className="text-[#888] text-sm mt-2">saved every year</p>
          </div>
        </div>
      )}

      {/* Voice Intelligence Panel (Modulate Integration) */}
      {voiceIntelligence && (negotiation.status === 'success' || negotiation.status === 'failed') && (
        <div className="mb-8 bg-gradient-to-br from-orange-500/5 to-transparent border border-orange-500/20 rounded-xl p-6 animate-[fadeIn_0.5s_ease-in]">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse"></div>
              <h3 className="text-lg font-bold text-white">Modulate Voice Intelligence</h3>
            </div>
            <span className="ml-auto text-xs bg-orange-500 text-white px-3 py-1 rounded-full font-semibold">ANALYZED</span>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-[#0a0a0a] border border-[#262626] rounded-xl p-4">
              <div className="text-[#888] text-sm mb-1">Dominant Emotion</div>
              <div className="text-2xl font-bold text-[#00ff88]">
                {voiceIntelligence.dominantEmotion}
              </div>
            </div>
            <div className="bg-[#0a0a0a] border border-[#262626] rounded-xl p-4">
              <div className="text-[#888] text-sm mb-1">Speakers</div>
              <div className="text-2xl font-bold">{voiceIntelligence.speakerCount}</div>
            </div>
            <div className="bg-[#0a0a0a] border border-[#262626] rounded-xl p-4">
              <div className="text-[#888] text-sm mb-1">Duration</div>
              <div className="text-2xl font-bold">
                {Math.floor(voiceIntelligence.durationMs / 1000)}s
              </div>
            </div>
            <div className="bg-[#0a0a0a] border border-[#262626] rounded-xl p-4">
              <div className="text-[#888] text-sm mb-1">Utterances</div>
              <div className="text-2xl font-bold">{voiceIntelligence.utteranceCount}</div>
            </div>
          </div>

          <div className="bg-[#0a0a0a] border border-[#262626] rounded-xl p-4 mb-4">
            <div className="text-sm font-medium text-[#888] mb-3">Emotion Distribution</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(voiceIntelligence.emotions).map(([emotion, count]) => (
                <div
                  key={emotion}
                  className="flex items-center gap-2 bg-[#141414] px-3 py-2 rounded-lg"
                >
                  <span className="text-sm">{emotion}</span>
                  <span className="text-xs bg-[#00ff88]/10 text-[#00ff88] px-2 py-0.5 rounded-full">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {voiceIntelligence.piiDetected && (
            <div className="bg-[#ffaa00]/10 border border-[#ffaa00]/30 rounded-xl p-4 text-sm text-[#ffaa00] mb-4">
              ⚠️ PII/PHI detected in conversation - redacted per compliance requirements
            </div>
          )}
          <p className="mt-4 text-xs text-orange-400 text-center">✓ Powered by Modulate Velma-2 Batch API</p>
        </div>
      )}

      {/* Failed State */}
      {negotiation.status === 'failed' && (
        <div className="bg-[#141414] border border-[#ff4444]/30 rounded-2xl p-8 text-center">
          <div className="text-4xl mb-4">😔</div>
          <h3 className="text-xl font-semibold mb-2">We couldn't lower your rate</h3>
          <p className="text-[#888] mb-6">
            This can happen if your current rate is already competitive or the provider has strict policies.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-[#1a1a1a] border border-[#262626] px-6 py-3 rounded-xl hover:bg-[#222] transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      )}

      {/* In Progress Animation */}
      {['researching', 'calling', 'negotiating'].includes(negotiation.status) && (
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-8 text-center">
          <div className="inline-flex items-center gap-3 bg-[#ffaa00]/10 text-[#ffaa00] px-4 py-2 rounded-full mb-4">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="font-medium capitalize">{negotiation.status}...</span>
          </div>
          <p className="text-[#888]">
            Our AI agent is actively working on your behalf. This typically takes 2-5 minutes.
          </p>
        </div>
      )}
    </div>
  );
}

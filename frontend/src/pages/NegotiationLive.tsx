import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Circle, Loader2 } from 'lucide-react';
import { api, type Negotiation } from '../api/client';

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

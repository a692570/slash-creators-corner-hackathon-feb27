import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Play, CheckCircle, XCircle } from 'lucide-react';
import { ProviderLogo } from '../components/ProviderLogo';
import { StatusBadge } from '../components/StatusBadge';
import { api, type Bill, type Negotiation } from '../api/client';

export function BillDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [bill, setBill] = useState<Bill | null>(null);
  const [negotiation, setNegotiation] = useState<Negotiation | null>(null);
  const [loading, setLoading] = useState(true);
  const [negotiating, setNegotiating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const foundBill = await api.getBill(id!);
        if (foundBill) {
          setBill(foundBill);
        }
        // Check for existing negotiations
        const negs = await api.getNegotiations();
        const existing = negs.find(n => n.billId === id);
        if (existing) {
          setNegotiation(existing);
        }
      } catch (error) {
        console.log('API not available:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);

  // Poll for negotiation updates
  useEffect(() => {
    if (!negotiation || negotiation.status === 'success' || negotiation.status === 'failed') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const updatedNegotiation = await api.getNegotiation(negotiation.id);
        setNegotiation(updatedNegotiation);
        
        if (updatedNegotiation.status === 'success' || updatedNegotiation.status === 'failed') {
          clearInterval(interval);
        }
      } catch (error) {
        console.log('Polling failed - using mock data');
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [negotiation]);

  const handleNegotiate = async () => {
    if (!bill) return;
    
    setNegotiating(true);
    
    try {
      const result = await api.negotiateBill(bill.id);
      const negId = result.negotiationId || (result as any).id;
      navigate(`/negotiations/${negId}`);
    } catch (error) {
      console.error('Failed to start negotiation:', error);
    } finally {
      setNegotiating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-[#888]">Loading...</div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="p-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#888] hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold mb-2">Bill not found</h2>
          <p className="text-[#888] mb-4">The bill you're looking for doesn't exist.</p>
          <Link to="/" className="text-[#00ff88] hover:underline">
            Go back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-[#888] hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Bill Info Card */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <ProviderLogo provider={bill.provider} />
            <h1 className="text-2xl font-bold mt-2">{bill.planName || 'Bill'}</h1>
            <p className="text-[#888] text-sm mt-1">Added {formatDate(bill.createdAt)}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{formatCurrency(bill.currentRate)}</div>
            <div className="text-[#888] text-sm">per month</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 py-4 border-t border-[#262626]">
          <div>
            <div className="text-[#888] text-sm mb-1">Account Number</div>
            <div className="font-mono">{bill.accountNumber}</div>
          </div>
          <div>
            <div className="text-[#888] text-sm mb-1">Provider</div>
            <div>{bill.provider}</div>
          </div>
        </div>
      </div>

      {/* Negotiation Section */}
      {negotiation ? (
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Negotiation Status</h2>
            <StatusBadge status={negotiation.status} />
          </div>

          {negotiation.status === 'success' && (
            <div className="bg-[#00ff88]/10 border border-[#00ff88]/30 rounded-xl p-5 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle className="w-6 h-6 text-[#00ff88]" />
                <span className="text-[#00ff88] font-semibold">Negotiation Successful!</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-[#888] text-sm">Original Rate</div>
                  <div className="text-xl font-bold line-through text-[#888]">
                    {formatCurrency(negotiation.originalRate!)}/mo
                  </div>
                </div>
                <div>
                  <div className="text-[#888] text-sm">New Rate</div>
                  <div className="text-xl font-bold text-[#00ff88]">
                    {formatCurrency(negotiation.newRate!)}/mo
                  </div>
                </div>
                <div>
                  <div className="text-[#888] text-sm">Monthly Savings</div>
                  <div className="text-xl font-bold text-[#00ff88]">
                    {formatCurrency(negotiation.monthlySavings!)}
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-[#00ff88]/30">
                <span className="text-[#00ff88] font-semibold">
                  Annual Savings: {formatCurrency(negotiation.annualSavings!)}
                </span>
              </div>
            </div>
          )}

          {negotiation.status === 'failed' && (
            <div className="bg-[#ff4444]/10 border border-[#ff4444]/30 rounded-xl p-5 mb-4">
              <div className="flex items-center gap-3">
                <XCircle className="w-6 h-6 text-[#ff4444]" />
                <span className="text-[#ff4444] font-semibold">Negotiation Failed</span>
              </div>
              <p className="text-[#888] mt-2">We couldn't negotiate a better rate this time. Try again later.</p>
            </div>
          )}

          {(negotiation.status === 'researching' || negotiation.status === 'calling' || negotiation.status === 'negotiating') && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-2 border-[#ffaa00] border-t-transparent rounded-full mx-auto mb-4"></div>
                <div className="text-[#ffaa00] font-medium capitalize">{negotiation.status}...</div>
                <p className="text-[#888] text-sm mt-1">This may take a few minutes</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={handleNegotiate}
          disabled={negotiating}
          className="w-full bg-[#00ff88] text-black py-4 rounded-xl font-medium hover:bg-[#00dd77] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5" />
          {negotiating ? 'Starting...' : 'Negotiate This Bill'}
        </button>
      )}
    </div>
  );
}

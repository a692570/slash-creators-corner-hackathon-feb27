import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, TrendingUp, Percent, Receipt, Plus, ArrowRight, Phone } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { ProviderLogo } from '../components/ProviderLogo';
import { api, type DashboardStats, type Bill, type Negotiation } from '../api/client';

const defaultStats: DashboardStats = {
  totalSavings: 0,
  activeNegotiations: 0,
  successRate: 0,
  billsTracked: 0,
};

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [bills, setBills] = useState<Bill[]>([]);
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, billsData, negsData] = await Promise.all([
          api.getDashboardStats().catch(() => defaultStats),
          api.getBills().catch(() => []),
          api.getNegotiations().catch(() => []),
        ]);
        setStats(statsData);
        setBills(billsData);
        setNegotiations(negsData);
        // Sponsor status removed from UI - integration proof is in the negotiation flow
      } catch (error) {
        console.log('Using default data - API not available');
      }
    };
    
    fetchData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
          <p className="text-[#888]">Track your bill negotiations and savings</p>
        </div>
        <Link
          to="/add-bill"
          className="flex items-center gap-2 bg-[#00ff88] text-black px-4 py-2.5 rounded-lg font-medium hover:bg-[#00dd77] transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Bill
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Savings"
          value={formatCurrency(stats.totalSavings)}
          icon={DollarSign}
          color="success"
        />
        <StatCard
          title="Active Negotiations"
          value={stats.activeNegotiations}
          icon={TrendingUp}
          color="warning"
        />
        <StatCard
          title="Success Rate"
          value={`${Math.round(stats.successRate)}%`}
          icon={Percent}
          color="success"
        />
        <StatCard
          title="Bills Tracked"
          value={stats.billsTracked}
          icon={Receipt}
        />
      </div>

      {/* Sponsor integration status removed - too technical for demo */}

      {/* Bills List */}
      {bills.length > 0 && (
        <div className="bg-[#141414] border border-[#262626] rounded-xl mb-6">
          <div className="p-5 border-b border-[#262626] flex items-center justify-between">
            <h2 className="font-semibold">Your Bills</h2>
          </div>
          
          <div className="divide-y divide-[#262626]">
            {bills.filter(bill => bill && bill.id).map((bill) => (
              <Link
                key={bill.id}
                to={`/bills/${bill.id}`}
                className="p-4 flex items-center justify-between hover:bg-[#1a1a1a] transition-colors block"
              >
                <div className="flex items-center gap-4">
                  <ProviderLogo provider={bill.provider || 'Unknown'} />
                  <div>
                    <div className="font-medium">{bill.planName || bill.provider}</div>
                    <div className="text-sm text-[#888] capitalize">{bill.category?.replace('_', ' ')}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(bill.currentRate)}/mo</div>
                    {bill.status && <StatusBadge status={bill.status as any} />}
                  </div>
                  <Phone className="w-4 h-4 text-[#888]" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Negotiations */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl">
        <div className="p-5 border-b border-[#262626] flex items-center justify-between">
          <h2 className="font-semibold">Recent Negotiations</h2>
          <Link to="/bills" className="text-sm text-[#888] hover:text-white flex items-center gap-1">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        
        <div className="divide-y divide-[#262626]">
          {negotiations.map((negotiation) => (
            <Link
              key={negotiation.id}
              to={`/negotiations/${negotiation.id}`}
              className="p-4 flex items-center justify-between hover:bg-[#1a1a1a] transition-colors block"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#1a1a1a] flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-[#888]" />
                </div>
                <div>
                  <div className="font-medium">Bill #{negotiation.billId?.slice(-6) || negotiation.billId}</div>
                  <div className="text-sm text-[#888]">{formatDate(negotiation.createdAt)}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                {negotiation.status === 'success' && negotiation.monthlySavings && (
                  <div className="text-right">
                    <div className="text-[#00ff88] font-medium">
                      {formatCurrency(negotiation.monthlySavings)}/mo saved
                    </div>
                  </div>
                )}
                <StatusBadge status={negotiation.status} />
              </div>
            </Link>
          ))}
          
          {negotiations.length === 0 && (
            <div className="p-8 text-center text-[#888]">
              No negotiations yet. Click a bill and hit "Negotiate" to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

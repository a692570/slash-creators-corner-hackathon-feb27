import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { api, type Bill } from '../api/client';
import { ProviderLogo } from '../components/ProviderLogo';
import { StatusBadge } from '../components/StatusBadge';

export function Bills() {
  const [bills, setBills] = useState<Bill[]>([]);

  useEffect(() => {
    api.getBills().then(setBills).catch(() => setBills([]));
  }, []);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Your Bills</h1>
          <p className="text-[#888]">All tracked subscriptions and negotiable bills</p>
        </div>
        <Link
          to="/add-bill"
          className="rounded-lg bg-[#00ff88] px-4 py-2.5 font-medium text-black hover:bg-[#00dd77] transition-colors"
        >
          Add Bill
        </Link>
      </div>

      <div className="rounded-xl border border-[#262626] bg-[#141414]">
        {bills.length === 0 ? (
          <div className="p-8 text-center text-[#888]">No bills yet. Add your first bill to begin.</div>
        ) : (
          <div className="divide-y divide-[#262626]">
            {bills.map((bill) => (
              <Link
                key={bill.id}
                to={`/bills/${bill.id}`}
                className="block p-4 hover:bg-[#1a1a1a] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <ProviderLogo provider={bill.provider} />
                    <div>
                      <div className="font-medium">{bill.planName || bill.provider}</div>
                      <div className="text-sm capitalize text-[#888]">{bill.category?.replace('_', ' ')}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(bill.currentRate)}/mo</div>
                      {bill.status && <StatusBadge status={bill.status as any} />}
                    </div>
                    <ArrowRight className="h-4 w-4 text-[#666]" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

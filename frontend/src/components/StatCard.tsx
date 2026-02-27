import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  color?: 'default' | 'success' | 'warning';
}

export function StatCard({ title, value, icon: Icon, trend, color = 'default' }: StatCardProps) {
  const colorClasses = {
    default: 'text-white',
    success: 'text-[#00ff88]',
    warning: 'text-[#ffaa00]',
  };

  return (
    <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 hover:border-[#333] transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[#888] text-sm font-medium">{title}</span>
        <Icon className={`w-5 h-5 ${colorClasses[color]}`} />
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      {trend && (
        <div className="text-sm text-[#00ff88]">{trend}</div>
      )}
    </div>
  );
}

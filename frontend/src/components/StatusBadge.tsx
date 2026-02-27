type Status = 'pending' | 'researching' | 'calling' | 'negotiating' | 'success' | 'failed';

interface StatusBadgeProps {
  status: Status;
}

const statusConfig: Record<Status, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-[#333] text-[#888]' },
  researching: { label: 'Researching', className: 'bg-[#ffaa00]/20 text-[#ffaa00]' },
  calling: { label: 'Calling', className: 'bg-[#ffaa00]/20 text-[#ffaa00]' },
  negotiating: { label: 'Negotiating', className: 'bg-[#ffaa00]/20 text-[#ffaa00]' },
  success: { label: 'Success', className: 'bg-[#00ff88]/20 text-[#00ff88]' },
  failed: { label: 'Failed', className: 'bg-[#ff4444]/20 text-[#ff4444]' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

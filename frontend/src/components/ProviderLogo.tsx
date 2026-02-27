interface ProviderLogoProps {
  provider: string;
  size?: 'sm' | 'md';
}

const providerColors: Record<string, string> = {
  'Comcast/Xfinity': '#0066cc',
  'Spectrum': '#0066cc',
  'AT&T': '#00a8e0',
  'Verizon': '#cd040b',
  'Cox': '#0066cc',
  'Optimum': '#ff6600',
};

export function ProviderLogo({ provider, size = 'md' }: ProviderLogoProps) {
  const color = providerColors[provider] || '#666';
  const sizeClasses = size === 'sm' ? 'w-2 h-2' : 'w-3 h-3';
  
  return (
    <div className="flex items-center gap-2">
      <span 
        className={`${sizeClasses} rounded-full`} 
        style={{ backgroundColor: color }}
      />
      <span className="font-medium">{provider}</span>
    </div>
  );
}

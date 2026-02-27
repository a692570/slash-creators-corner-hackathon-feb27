import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Wifi, Smartphone, Shield, Heart } from 'lucide-react';
import { ProviderLogo } from '../components/ProviderLogo';
import { api, type CreateBillRequest } from '../api/client';
import { PROVIDERS_BY_CATEGORY, CATEGORY_NAMES, type BillCategory } from '../../../src/types/index';

const CATEGORY_ICONS: Record<BillCategory, React.ReactNode> = {
  internet: <Wifi className="w-5 h-5" />,
  cell_phone: <Smartphone className="w-5 h-5" />,
  insurance: <Shield className="w-5 h-5" />,
  medical: <Heart className="w-5 h-5" />,
};

const CATEGORIES: BillCategory[] = ['internet', 'cell_phone', 'insurance', 'medical'];

export function AddBill() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<BillCategory | null>(null);
  const [formData, setFormData] = useState<CreateBillRequest>({
    provider: '',
    category: '' as BillCategory,
    currentRate: 0,
    accountNumber: '',
    planName: '',
    providerName: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleCategorySelect = (category: BillCategory) => {
    setSelectedCategory(category);
    setFormData({ ...formData, category, provider: '', providerName: '' });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!selectedCategory) {
      newErrors.category = 'Please select a category';
    }
    if (!formData.provider && selectedCategory !== 'medical') {
      newErrors.provider = 'Please select a provider';
    }
    if (!formData.providerName && selectedCategory === 'medical') {
      newErrors.providerName = 'Please enter the provider name';
    }
    if (!formData.currentRate || formData.currentRate <= 0) {
      newErrors.currentRate = 'Please enter a valid rate';
    }
    if (!formData.accountNumber) {
      newErrors.accountNumber = 'Please enter your account number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setSubmitting(true);
    
    try {
      const bill = await api.createBill(formData);
      navigate(`/bills/${bill.id}`);
    } catch (error) {
      console.error('Failed to create bill:', error);
      // For demo purposes, navigate with mock ID
      navigate('/bills/mock-1');
    } finally {
      setSubmitting(false);
    }
  };

  const providers = selectedCategory ? PROVIDERS_BY_CATEGORY[selectedCategory] : [];

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* Header */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-[#888] hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>
      
      <h1 className="text-2xl font-bold mb-2">Add a New Bill</h1>
      <p className="text-[#888] mb-8">Select a category, then enter your bill details</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Category Selection */}
        <div>
          <label className="block text-sm font-medium mb-3">Category</label>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => handleCategorySelect(category)}
                className={`p-4 rounded-xl border transition-all flex items-center gap-3 ${
                  selectedCategory === category
                    ? 'border-[#00ff88] bg-[#00ff88]/10'
                    : 'border-[#262626] bg-[#141414] hover:border-[#333]'
                }`}
              >
                <span className={selectedCategory === category ? 'text-[#00ff88]' : 'text-[#888]'}>
                  {CATEGORY_ICONS[category]}
                </span>
                <span className={selectedCategory === category ? 'text-white' : 'text-[#888]'}>
                  {CATEGORY_NAMES[category]}
                </span>
                {selectedCategory === category && (
                  <Check className="w-5 h-5 text-[#00ff88] ml-auto" />
                )}
              </button>
            ))}
          </div>
          {errors.category && (
            <p className="text-[#ff4444] text-sm mt-2">{errors.category}</p>
          )}
        </div>

        {/* Provider Selection - only for non-medical */}
        {selectedCategory && selectedCategory !== 'medical' && (
          <div>
            <label className="block text-sm font-medium mb-3">Provider</label>
            <div className="grid grid-cols-2 gap-3">
              {providers.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, provider: provider.id })}
                  className={`p-4 rounded-xl border transition-all ${
                    formData.provider === provider.id
                      ? 'border-[#00ff88] bg-[#00ff88]/10'
                      : 'border-[#262626] bg-[#141414] hover:border-[#333]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <ProviderLogo provider={provider.displayName} />
                    {formData.provider === provider.id && (
                      <Check className="w-5 h-5 text-[#00ff88]" />
                    )}
                  </div>
                </button>
              ))}
            </div>
            {errors.provider && (
              <p className="text-[#ff4444] text-sm mt-2">{errors.provider}</p>
            )}
          </div>
        )}

        {/* Provider Name - only for medical */}
        {selectedCategory === 'medical' && (
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="providerName">
              Provider Name
            </label>
            <input
              id="providerName"
              type="text"
              placeholder="e.g., Stanford Medical Center"
              value={formData.providerName || ''}
              onChange={(e) => setFormData({ ...formData, providerName: e.target.value, provider: 'medical_generic' })}
              className="w-full bg-[#141414] border border-[#262626] rounded-xl px-4 py-3 text-white placeholder-[#666] focus:outline-none focus:border-[#00ff88] transition-colors"
            />
            {errors.providerName && (
              <p className="text-[#ff4444] text-sm mt-2">{errors.providerName}</p>
            )}
          </div>
        )}

        {/* Current Rate */}
        <div>
          <label className="block text-sm font-medium mb-2" htmlFor="rate">
            Current {selectedCategory === 'medical' ? 'Bill Amount' : 'Monthly Rate'}
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#888]">$</span>
            <input
              id="rate"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.currentRate || ''}
              onChange={(e) => setFormData({ ...formData, currentRate: parseFloat(e.target.value) })}
              className="w-full bg-[#141414] border border-[#262626] rounded-xl px-4 py-3 pl-8 text-white placeholder-[#666] focus:outline-none focus:border-[#00ff88] transition-colors"
            />
          </div>
          {errors.currentRate && (
            <p className="text-[#ff4444] text-sm mt-2">{errors.currentRate}</p>
          )}
        </div>

        {/* Account Number */}
        <div>
          <label className="block text-sm font-medium mb-2" htmlFor="account">
            {selectedCategory === 'medical' ? 'Invoice/Reference Number' : 'Account Number'}
          </label>
          <input
            id="account"
            type="text"
            placeholder={selectedCategory === 'medical' ? 'e.g., INV-12345' : 'Enter your account number'}
            value={formData.accountNumber}
            onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
            className="w-full bg-[#141414] border border-[#262626] rounded-xl px-4 py-3 text-white placeholder-[#666] focus:outline-none focus:border-[#00ff88] transition-colors"
          />
          {errors.accountNumber && (
            <p className="text-[#ff4444] text-sm mt-2">{errors.accountNumber}</p>
          )}
        </div>

        {/* Plan Name (Optional) */}
        <div>
          <label className="block text-sm font-medium mb-2" htmlFor="plan">
            {selectedCategory === 'medical' ? 'Service Description' : 'Plan Name'} <span className="text-[#666]">(optional)</span>
          </label>
          <input
            id="plan"
            type="text"
            placeholder={selectedCategory === 'medical' ? 'e.g., Emergency Room Visit' : 'e.g., Performance Pro Internet'}
            value={formData.planName || ''}
            onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
            className="w-full bg-[#141414] border border-[#262626] rounded-xl px-4 py-3 text-white placeholder-[#666] focus:outline-none focus:border-[#00ff88] transition-colors"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[#00ff88] text-black py-3.5 rounded-xl font-medium hover:bg-[#00dd77] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Adding Bill...' : 'Add Bill'}
        </button>
      </form>
    </div>
  );
}

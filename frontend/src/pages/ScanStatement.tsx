import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, FileText, Check, X, Loader2 } from 'lucide-react';
import { api, type CreateBillRequest } from '../api/client';
import { CATEGORY_NAMES, type DetectedBill } from '../../../src/types/index';

export function ScanStatement() {
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [detectedBills, setDetectedBills] = useState<DetectedBill[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [addingBillId, setAddingBillId] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFile = (selectedFile: File) => {
    if (selectedFile.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }
    
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be under 10MB');
      return;
    }
    
    setFile(selectedFile);
    setError(null);
    setDetectedBills([]);
  };

  const handleScan = async () => {
    if (!file) return;
    
    setUploading(true);
    setScanning(true);
    setError(null);
    
    try {
      const results = await api.scanStatement(file);
      setDetectedBills(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan statement');
    } finally {
      setUploading(false);
      setScanning(false);
    }
  };

  const handleAddBill = async (detectedBill: DetectedBill) => {
    const billKey = `${detectedBill.provider}-${detectedBill.amount}`;
    setAddingBillId(billKey);
    
    try {
      const billData: CreateBillRequest = {
        provider: detectedBill.provider as string,
        category: detectedBill.category,
        currentRate: detectedBill.amount,
        accountNumber: `SCANNED-${Date.now()}`,
        providerName: detectedBill.category === 'medical' ? detectedBill.provider : undefined,
      };
      
      await api.createBill(billData);
      
      // Remove from detected list after adding
      setDetectedBills(prev => prev.filter(b => 
        `${b.provider}-${b.amount}` !== billKey
      ));
    } catch (err) {
      console.error('Failed to add bill:', err);
    } finally {
      setAddingBillId(null);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-[#00ff88]';
    if (confidence >= 0.6) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High confidence';
    if (confidence >= 0.6) return 'Medium confidence';
    return 'Low confidence';
  };

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
      
      <h1 className="text-2xl font-bold mb-2">Scan Credit Card Statement</h1>
      <p className="text-[#888] mb-8">Upload your CC statement PDF and we'll detect recurring bills</p>

      {/* Upload Zone */}
      {!detectedBills.length && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
            dragActive
              ? 'border-[#00ff88] bg-[#00ff88]/5'
              : 'border-[#333] bg-[#141414]'
          }`}
        >
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileText className="w-8 h-8 text-[#00ff88]" />
              <div className="text-left">
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-[#888]">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="p-2 hover:bg-[#262626] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[#888]" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 text-[#666] mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">Drop your PDF here</p>
              <p className="text-[#888]">or click to browse</p>
            </>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
          {error}
        </div>
      )}

      {/* Scan Button */}
      {file && !detectedBills.length && (
        <button
          onClick={handleScan}
          disabled={uploading}
          className="mt-6 w-full bg-[#00ff88] text-black py-3.5 rounded-xl font-medium hover:bg-[#00dd77] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {scanning ? 'Scanning...' : 'Uploading...'}
            </>
          ) : (
            <>
              <FileText className="w-5 h-5" />
              Scan Statement
            </>
          )}
        </button>
      )}

      {/* Detected Bills */}
      {detectedBills.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-medium mb-4">
            Detected {detectedBills.length} negotiable {detectedBills.length === 1 ? 'bill' : 'bills'}
          </h2>
          
          <div className="space-y-3">
            {detectedBills.map((bill, index) => {
              const billKey = `${bill.provider}-${bill.amount}`;
              const isAdding = addingBillId === billKey;
              
              return (
                <div
                  key={index}
                  className="p-4 bg-[#141414] border border-[#262626] rounded-xl"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">
                          {typeof bill.provider === 'string' && bill.provider.includes('_') 
                            ? bill.provider.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
                            : bill.provider}
                        </h3>
                        <span className="px-2 py-0.5 text-xs bg-[#262626] rounded-full text-[#888]">
                          {CATEGORY_NAMES[bill.category]}
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-[#00ff88]">
                        ${bill.amount.toFixed(2)}
                      </p>
                      <p className="text-sm text-[#888] mt-1">
                        {bill.description}
                      </p>
                      <p className="text-xs text-[#666] mt-1">
                        Transaction date: {bill.transactionDate}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <p className={`text-sm ${getConfidenceColor(bill.confidence)}`}>
                        {getConfidenceLabel(bill.confidence)}
                      </p>
                      <p className="text-xs text-[#666]">
                        {(bill.confidence * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleAddBill(bill)}
                    disabled={isAdding}
                    className="mt-4 w-full bg-[#00ff88] text-black py-2.5 rounded-lg font-medium hover:bg-[#00dd77] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {isAdding ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Add to Slash
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
          
          <button
            onClick={() => {
              setFile(null);
              setDetectedBills([]);
            }}
            className="mt-6 w-full bg-[#262626] text-white py-3 rounded-xl font-medium hover:bg-[#333] transition-colors"
          >
            Scan Another Statement
          </button>
        </div>
      )}
    </div>
  );
}

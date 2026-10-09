import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useUI } from '../../context/UIContext';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';
import {
  FileCheck,
  UploadCloud,
  Download,
  Plus,
  Trash2,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  FolderOpen,
  Loader2,
  Eye,
  FileText,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  verifyAndUploadDocumentWithAI,
  fileToDataUrl,
  getCloudinaryDownloadUrl,
  deleteCloudinaryDocument,
  getCloudinaryViewUrl,
} from '../../services/cloudinaryService';

export interface VaultDoc {
  id: string;
  name: string;
  type: string;
  fileName: string;
  fileSize?: string;
  fileUrl?: string;
  cloudinaryPublicId?: string;
  cloudinaryFolder?: string;
  previewDataUrl?: string;
  status: 'VERIFIED' | 'SUBMITTED' | 'NEEDS_REVIEW' | 'EXPIRED';
  uploadedAt: string;
  issueDate?: string;
  validityPeriod: string;
  expiryDate: string;
  documentNumber?: string;
}

export const getDaysRemaining = (expiryDateStr?: string): number | null => {
  if (!expiryDateStr || expiryDateStr.includes('Lifetime') || expiryDateStr.includes('Not applicable')) return null;
  const expiry = new Date(expiryDateStr);
  if (isNaN(expiry.getTime())) return null;
  const now = new Date();
  const diffTime = expiry.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const formatRemainingValidity = (expiryDateStr?: string, validityPeriodStr?: string): string => {
  if (validityPeriodStr?.toLowerCase().includes('lifetime') || expiryDateStr?.includes('Lifetime')) {
    return 'Lifetime Validity';
  }
  if (!expiryDateStr || expiryDateStr.includes('Not applicable')) {
    return 'No Expiry Date / Permanent';
  }
  const days = getDaysRemaining(expiryDateStr);
  if (days === null) return validityPeriodStr || 'Valid';
  if (days <= 0) return 'Expired';
  if (days < 30) return `${days} Days Remaining`;

  const years = Math.floor(days / 365);
  const remainingMonths = Math.floor((days % 365) / 30);
  if (years > 0) {
    return `Approximately ${years} year${years > 1 ? 's' : ''}${remainingMonths > 0 ? ` and ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}` : ''}`;
  }
  return `Approximately ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
};

const SUPPORTED_DOCUMENT_TYPES = [
  'Aadhaar Card',
  'Income Certificate',
  'Caste Certificate',
  'Domicile Certificate',
  'Birth Certificate',
  'Driving License',
  'PAN Card',
  'Ration Card',
];

export const UserDocumentsPage: React.FC = () => {
  const { uiMode } = useUI();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const isSimple = uiMode === 'simple';

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Income Certificate');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');

  // Step-by-step progress state
  const [isUploading, setIsUploading] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const verificationSteps = [
    'Uploading document to verification server...',
    'Extracting text using OCR engine...',
    'Checking document type with Gemini AI...',
    'Extracting dates and certificate metadata...',
    'Evaluating validity rules and expiry date...',
    'Saving approved document asset...',
  ];

  const [viewingDoc, setViewingDoc] = useState<VaultDoc | null>(null);

  // DELETE CONFIRMATION STATE
  const [deletingDoc, setDeletingDoc] = useState<VaultDoc | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const storageKey = currentUser?.id ? `nagrikq_vault_${currentUser.id}` : 'nagrikq_vault_guest';

  const [documents, setDocuments] = useState<VaultDoc[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(documents));
    } catch {
      // Ignore
    }
  }, [documents, storageKey]);

  // Check for any document expiring in <= 15 days
  const expiringSoonDocs = useMemo(() => {
    return documents.filter((d) => {
      const rem = getDaysRemaining(d.expiryDate);
      return rem !== null && rem <= 15;
    });
  }, [documents]);

  const handleOpenFileDialog = () => {
    setFileError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setFileError('File size exceeds 10MB limit. Please select a smaller file.');
      return;
    }

    setSelectedFile(file);
    setFileError('');
  };

  const handleVerifyAndSaveDocument = async () => {
    if (!selectedFile) {
      setFileError('Please select a document file from your computer.');
      return;
    }

    setIsUploading(true);
    setFileError('');
    setCurrentStepIndex(0);

    // Simulate step progression visually for citizen transparency
    const stepInterval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev < verificationSteps.length - 1 ? prev + 1 : prev));
    }, 600);

    try {
      let safePreviewDataUrl: string | undefined;

      if (selectedFile.size < 2 * 1024 * 1024) {
        try {
          safePreviewDataUrl = await fileToDataUrl(selectedFile);
        } catch {
          // Ignore preview failure
        }
      }

      // Backend verification pipeline call
      const uploadResult = await verifyAndUploadDocumentWithAI(selectedFile, selectedCategory, currentUser?.id);

      clearInterval(stepInterval);
      setCurrentStepIndex(verificationSteps.length - 1);

      const sizeInMb = (selectedFile.size / (1024 * 1024)).toFixed(1) + ' MB';
      const docId = `vault-${Date.now()}`;

      const extracted = uploadResult.extractedInfo || {};
      const docTitle = extracted.documentType || selectedCategory;
      const extractedIssue = extracted.issueDate || '2025-01-01';
      const extractedExpiry = extracted.expiryDate || (selectedCategory === 'Aadhaar Card' ? 'Lifetime Validity' : '2028-01-01');
      const validityPolicy = selectedCategory === 'Aadhaar Card' ? 'Lifetime Validity' : 'Valid for 3 Years';

      const newDoc: VaultDoc = {
        id: docId,
        name: docTitle,
        type: selectedCategory,
        fileName: selectedFile.name,
        fileSize: sizeInMb,
        fileUrl: uploadResult.secureUrl,
        cloudinaryPublicId: uploadResult.publicId,
        cloudinaryFolder: uploadResult.folder,
        previewDataUrl: safePreviewDataUrl,
        status: uploadResult.verificationStatus === 'VERIFIED' ? 'VERIFIED' : 'SUBMITTED',
        uploadedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        issueDate: extractedIssue,
        validityPeriod: validityPolicy,
        expiryDate: extractedExpiry,
        documentNumber: extracted.documentNumber ? `XXXX-XXXX-${extracted.documentNumber.slice(-4)}` : undefined,
      };

      setDocuments((prev) => [newDoc, ...prev]);
      setSelectedFile(null);
      setFileError('');
      setIsUploadModalOpen(false);
    } catch (err: any) {
      clearInterval(stepInterval);
      console.error('[Document Verification Error]', err);

      const status = err.verificationStatus || 'REJECTED';

      if (status === 'EXPIRED') {
        setFileError(`Your ${selectedCategory} has expired. Please upload a valid, non-expired certificate.`);
      } else if (status === 'REJECTED' || err.message?.includes('category')) {
        setFileError(`Document type mismatch! You selected "${selectedCategory}", but the uploaded document does not match this category. Please upload the correct document.`);
      } else if (err.message?.includes('Duplicate')) {
        setFileError(err.message);
      } else {
        setFileError(`Verification Service Warning: ${err.message || 'Verification failed. Please retry.'}`);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!deletingDoc) return;
    setIsDeleting(true);
    try {
      if (deletingDoc.cloudinaryPublicId) {
        await deleteCloudinaryDocument(deletingDoc.cloudinaryPublicId);
      }
      setDocuments((prev) => prev.filter((d) => d.id !== deletingDoc.id));
      setDeletingDoc(null);
    } catch (err) {
      console.warn('[Cloudinary Delete Note]', err);
      setDocuments((prev) => prev.filter((d) => d.id !== deletingDoc.id));
      setDeletingDoc(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadDoc = async (doc: VaultDoc, e: React.MouseEvent) => {
    e.stopPropagation();
    if (doc.cloudinaryPublicId) {
      try {
        const downloadUrl = await getCloudinaryDownloadUrl(doc.cloudinaryPublicId, 'pdf', doc.fileName);
        window.open(downloadUrl, '_blank');
        return;
      } catch {
        // Fallback
      }
    }
    if (doc.fileUrl) {
      window.open(doc.fileUrl, '_blank');
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isSimple ? '16px' : '24px' }}>
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1 style={{ fontSize: isSimple ? '1.8rem' : '1.6rem', color: 'var(--color-neutral-900)', margin: '0 0 6px 0', fontWeight: 800 }}>
            Official Citizen Document Vault
          </h1>
          <p style={{ color: 'var(--color-neutral-600)', margin: 0, fontSize: isSimple ? '1.05rem' : '0.95rem' }}>
            AI-verified government certificates with dynamic validity tracking.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            setSelectedFile(null);
            setFileError('');
            setIsUploadModalOpen(true);
          }}
          icon={<Plus size={18} />}
          style={{ fontSize: isSimple ? '1.1rem' : '0.95rem', padding: '12px 20px', borderRadius: '10px' }}
        >
          Upload New Document
        </Button>
      </div>

      {/* 15-Day Expiry Alert Banner */}
      {expiringSoonDocs.length > 0 && (
        <div
          style={{
            backgroundColor: '#FEF3C7',
            border: '2px solid #F59E0B',
            borderRadius: '14px',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <AlertTriangle size={24} style={{ color: '#D97706', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <strong style={{ color: '#92400E', fontSize: '1rem', display: 'block' }}>
              Action Required: {expiringSoonDocs.length} Document(s) Expiring Soon!
            </strong>
            <span style={{ color: '#B45309', fontSize: '0.88rem' }}>
              Renew your certificates before booking services requiring current validity.
            </span>
          </div>
        </div>
      )}

      {/* Vault Grid */}
      {documents.length === 0 ? (
        <EmptyState
          icon={<FolderOpen size={48} />}
          title="Your Vault is Empty"
          description="Upload your official certificates (Income, Aadhaar, Caste) to enable instant token booking."
          actionText="Upload Document Now"
          onAction={() => setIsUploadModalOpen(true)}
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '20px',
          }}
        >
          {documents.map((doc) => {
            const daysRemaining = getDaysRemaining(doc.expiryDate);
            const isExpiringSoon = daysRemaining !== null && daysRemaining <= 15 && daysRemaining > 0;
            const isExpired = daysRemaining !== null && daysRemaining <= 0;
            const remainingText = formatRemainingValidity(doc.expiryDate, doc.validityPeriod);

            return (
              <Card
                key={doc.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                  borderRadius: '16px',
                  border: isExpiringSoon
                    ? '2px solid #F59E0B'
                    : isExpired
                    ? '2px solid #EF4444'
                    : '1px solid var(--color-border)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Top Bar with Icon & Status Badges */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: 'var(--color-primary-100)', color: 'var(--color-primary-700)', flexShrink: 0 }}>
                      <FileCheck size={22} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1 }}>
                      {doc.fileUrl && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.74rem',
                            backgroundColor: '#E0F2FE',
                            color: '#0369A1',
                            border: '1px solid #BAE6FD',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontWeight: 700,
                          }}
                        >
                          <UploadCloud size={12} />
                          Cloudinary
                        </span>
                      )}
                      {isExpiringSoon ? (
                        <Badge variant="warning">⚠️ Expiring Soon</Badge>
                      ) : isExpired ? (
                        <Badge variant="danger">Expired</Badge>
                      ) : (
                        <StatusBadge status={doc.status} />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingDoc(doc);
                        }}
                        title="Delete from vault"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--color-neutral-400)',
                          padding: '4px',
                          borderRadius: '6px',
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Title & Type */}
                  <div>
                    <h3 style={{ fontSize: isSimple ? '1.3rem' : '1.15rem', color: 'var(--color-neutral-900)', margin: '0 0 4px 0', fontWeight: 800 }}>
                      {doc.name}
                    </h3>
                    <span style={{ fontSize: '0.82rem', color: 'var(--color-neutral-500)', display: 'block' }}>
                      Category: {doc.type} • Uploaded {doc.uploadedAt}
                    </span>
                  </div>

                  {/* Document Expiry & Remaining Validity Details Box */}
                  <div
                    style={{
                      backgroundColor: isExpiringSoon
                        ? '#FEF3C7'
                        : isExpired
                        ? '#FEE2E2'
                        : 'var(--color-neutral-50)',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      fontSize: '0.84rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ color: 'var(--color-neutral-600)' }}>Validity Policy:</span>
                      <strong>{doc.validityPeriod}</strong>
                    </div>
                    {doc.issueDate && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ color: 'var(--color-neutral-600)' }}>Extracted Issue Date:</span>
                        <span>{doc.issueDate}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ color: 'var(--color-neutral-600)' }}>Expiry Date:</span>
                      <strong style={{ color: isExpiringSoon ? '#B45309' : isExpired ? '#DC2626' : 'var(--color-neutral-900)' }}>
                        {doc.expiryDate}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', borderTop: '1px dashed rgba(0,0,0,0.1)', paddingTop: '6px' }}>
                      <span style={{ color: 'var(--color-neutral-600)' }}>Remaining Validity:</span>
                      <strong style={{ color: isExpired ? '#DC2626' : '#059669' }}>
                        {remainingText}
                      </strong>
                    </div>
                  </div>

                  {/* File Name Row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.83rem',
                      color: 'var(--color-neutral-600)',
                      backgroundColor: 'rgba(0,0,0,0.02)',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      wordBreak: 'break-all',
                    }}
                  >
                    <FileText size={15} style={{ color: 'var(--color-primary-600)', flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, flex: 1 }}>{doc.fileName}</span>
                    {doc.fileSize && <span style={{ color: 'var(--color-neutral-400)', fontSize: '0.78rem', flexShrink: 0 }}>({doc.fileSize})</span>}
                  </div>
                </div>

                {/* Actions Row: View, Download, Delete (NO EDIT) */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '8px',
                    borderTop: '1px solid var(--color-neutral-200)',
                    paddingTop: '14px',
                    marginTop: 'auto',
                  }}
                >
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setViewingDoc(doc)}
                    icon={<Eye size={14} />}
                    style={{ flex: '1 1 auto', minWidth: '85px', justifyContent: 'center' }}
                  >
                    View
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => handleDownloadDoc(doc, e)}
                    icon={<Download size={14} />}
                    style={{ flex: '1 1 auto', minWidth: '100px', justifyContent: 'center' }}
                  >
                    Download
                  </Button>
                  {isExpiringSoon && (
                    <Button
                      variant="saffron"
                      size="sm"
                      onClick={() => navigate('/user/services')}
                      icon={<RotateCcw size={14} />}
                      style={{ flex: '1 1 auto', minWidth: '85px', justifyContent: 'center' }}
                    >
                      Renew
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* UPLOAD DOCUMENT MODAL (AUTOMATIC OCR + GEMINI VERIFICATION) */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => !isUploading && setIsUploadModalOpen(false)}
        title="Upload Document for Automatic AI Verification"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Hidden native file input */}
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            onChange={handleFileChange}
          />

          {/* Mandatory Document Type Selection Dropdown */}
          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, marginBottom: '6px', color: 'var(--color-neutral-900)' }}>
              Select Expected Document Category <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <select
              value={selectedCategory}
              disabled={isUploading}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: '10px',
                border: '1.5px solid var(--color-primary-400)',
                backgroundColor: 'white',
                fontSize: '0.95rem',
                fontWeight: 600,
                color: 'var(--color-neutral-900)',
              }}
            >
              {SUPPORTED_DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-neutral-500)', marginTop: '4px', display: 'block' }}>
              Gemini AI will automatically inspect your document file to verify category matching, extract dates, and calculate validity.
            </span>
          </div>

          {/* Interactive File Drop Zone */}
          <div
            onClick={!isUploading ? handleOpenFileDialog : undefined}
            style={{
              border: selectedFile ? '2px solid var(--color-success-500)' : '2px dashed var(--color-primary-400)',
              borderRadius: '12px',
              padding: '24px 18px',
              textAlign: 'center',
              cursor: isUploading ? 'not-allowed' : 'pointer',
              backgroundColor: selectedFile ? 'var(--color-success-50)' : 'var(--color-primary-50)',
              transition: 'all 0.2s ease',
              opacity: isUploading ? 0.7 : 1,
            }}
          >
            {selectedFile ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={36} style={{ color: 'var(--color-success-600)' }} />
                <span style={{ fontWeight: 700, color: 'var(--color-neutral-900)', fontSize: '0.98rem' }}>
                  {selectedFile.name}
                </span>
                <span style={{ fontSize: '0.82rem', color: 'var(--color-neutral-600)' }}>
                  Size: {(selectedFile.size / 1024).toFixed(1)} KB • Ready for AI OCR verification
                </span>
                {!isUploading && (
                  <Button
                    variant="outline"
                    size="sm"
                    style={{ marginTop: '6px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenFileDialog();
                    }}
                    icon={<FolderOpen size={14} />}
                  >
                    Change File
                  </Button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <UploadCloud size={38} style={{ color: 'var(--color-primary-700)' }} />
                <span style={{ fontWeight: 700, color: 'var(--color-neutral-900)', fontSize: '0.98rem' }}>
                  Click to select document file
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-neutral-500)' }}>
                  Supported formats: PDF, PNG, JPG, JPEG (Max 10MB)
                </span>
              </div>
            )}
          </div>

          {/* Step-by-Step AI Verification Progress */}
          {isUploading && (
            <div
              style={{
                backgroundColor: '#F0F9FF',
                border: '1.5px solid #0284C7',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Loader2 size={20} className="animate-spin" style={{ color: '#0284C7', flexShrink: 0 }} />
                <strong style={{ color: '#0369A1', fontSize: '0.92rem' }}>
                  AI Verification & Cloudinary Storage Processing...
                </strong>
              </div>
              <span style={{ fontSize: '0.84rem', color: '#075985', fontWeight: 600 }}>
                Step {currentStepIndex + 1} of {verificationSteps.length}: {verificationSteps[currentStepIndex]}
              </span>
              <div style={{ width: '100%', backgroundColor: '#E0F2FE', height: '6px', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${((currentStepIndex + 1) / verificationSteps.length) * 100}%`,
                    backgroundColor: '#0284C7',
                    height: '100%',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          )}

          {/* Verification Error / Mismatch / Expired Warning Banner */}
          {fileError && (
            <div
              style={{
                backgroundColor: '#FEF2F2',
                border: '1.5px solid #EF4444',
                borderRadius: '12px',
                padding: '14px 16px',
                color: '#991B1B',
                fontSize: '0.88rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <AlertTriangle size={20} style={{ color: '#DC2626', flexShrink: 0, marginTop: '2px' }} />
                <div style={{ flex: 1 }}>
                  <strong>Verification Warning:</strong>
                  <p style={{ margin: '4px 0 0 0', lineHeight: 1.4 }}>{fileError}</p>
                </div>
              </div>

              {/* Retry Button Option */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleVerifyAndSaveDocument}
                  icon={<RefreshCw size={14} />}
                  style={{ borderColor: '#DC2626', color: '#991B1B' }}
                >
                  Retry Verification
                </Button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '6px' }}>
            <Button
              variant="outline"
              disabled={isUploading}
              onClick={() => setIsUploadModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={isUploading || !selectedFile}
              onClick={handleVerifyAndSaveDocument}
              icon={isUploading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            >
              {isUploading ? 'Verifying with Gemini AI...' : 'Verify & Upload Document'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* VIEW DOCUMENT MODAL */}
      {viewingDoc && (
        <Modal
          isOpen={Boolean(viewingDoc)}
          onClose={() => setViewingDoc(null)}
          title={`Document View: ${viewingDoc.name}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                backgroundColor: 'var(--color-neutral-100)',
                borderRadius: '12px',
                padding: '16px',
                minHeight: '260px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {viewingDoc.previewDataUrl || viewingDoc.fileUrl ? (
                <iframe
                  src={getCloudinaryViewUrl(viewingDoc.fileUrl || viewingDoc.previewDataUrl || '')}
                  title={viewingDoc.name}
                  style={{ width: '100%', height: '380px', border: 'none', borderRadius: '8px' }}
                />
              ) : (
                <FileText size={48} style={{ color: 'var(--color-neutral-400)' }} />
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <Button variant="outline" onClick={() => setViewingDoc(null)}>
                Close Viewer
              </Button>
              <Button
                variant="primary"
                onClick={(e) => handleDownloadDoc(viewingDoc, e)}
                icon={<Download size={16} />}
              >
                Download Document
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingDoc && (
        <Modal
          isOpen={Boolean(deletingDoc)}
          onClose={() => !isDeleting && setDeletingDoc(null)}
          title="Confirm Document Deletion"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertTriangle size={32} style={{ color: '#DC2626' }} />
              <div>
                <strong style={{ color: 'var(--color-neutral-900)' }}>
                  Are you sure you want to delete "{deletingDoc.name}"?
                </strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: 'var(--color-neutral-600)' }}>
                  This action will delete the verified document from your vault and Cloudinary storage.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <Button
                variant="outline"
                disabled={isDeleting}
                onClick={() => setDeletingDoc(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={isDeleting}
                onClick={handleDeleteDocument}
                icon={isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              >
                {isDeleting ? 'Deleting...' : 'Delete Document'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

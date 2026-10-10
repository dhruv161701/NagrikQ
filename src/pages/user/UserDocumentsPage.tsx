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
  AlertCircle,
  RotateCcw,
  CheckCircle2,
  FolderOpen,
  Loader2,
  Eye,
  FileText,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Calendar,
} from 'lucide-react';
import { supabase } from '../../config/supabase';
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
  issueDate?: string | null;
  validityPeriod: string;
  expiryDate?: string | null;
  documentNumber?: string;
  holderName?: string;
  issuingAuthority?: string;
  extractedMetadata?: any;
  remainingValidity?: string;
  isExpired?: boolean;
  isExpiringSoon?: boolean;
  daysRemaining?: number | null;
}

export const formatDisplayDate = (dateStr?: string | null): string => {
  if (!dateStr) return 'Not available';
  if (dateStr === 'LIFETIME' || /lifetime|permanent/i.test(dateStr)) return 'Permanent / Lifetime Validity';
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const getDaysRemaining = (expiryDateStr?: string | null): number | null => {
  if (!expiryDateStr || expiryDateStr.includes('Lifetime') || expiryDateStr.includes('Permanent') || expiryDateStr === 'LIFETIME') return null;
  const expiry = new Date(expiryDateStr);
  if (isNaN(expiry.getTime())) return null;
  const now = new Date();
  const diffTime = expiry.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const formatRemainingValidity = (
  expiryDateStr?: string | null,
  validityPeriodStr?: string,
  serverRemainingValidity?: string
): string => {
  if (serverRemainingValidity) return serverRemainingValidity;
  if (!expiryDateStr) {
    if (validityPeriodStr?.toLowerCase().includes('lifetime')) return 'Lifetime Validity';
    return 'Needs review';
  }
  if (expiryDateStr === 'LIFETIME' || /lifetime|permanent/i.test(expiryDateStr)) {
    return 'Lifetime Validity';
  }
  const days = getDaysRemaining(expiryDateStr);
  if (days === null) return 'Needs review';
  if (days <= 0) return 'Expired';
  if (days < 30) return `${days} Day${days > 1 ? 's' : ''} Remaining`;

  const years = Math.floor(days / 365);
  const remainingMonths = Math.floor((days % 365) / 30);
  if (years > 0) {
    return `Approximately ${years} year${years > 1 ? 's' : ''}${remainingMonths > 0 ? ` and ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}` : ''} remaining`;
  }
  return `Approximately ${remainingMonths} month${remainingMonths > 1 ? 's' : ''} remaining`;
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
  'Electricity Bill',
  'Bank Passbook / Statement',
  'Disability Certificate',
  'Senior Citizen Identity Card',
  'Non-Creamy Layer (NCL) Certificate',
  'EWS Certificate',
  'Passport',
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
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string>('');
  const [documents, setDocuments] = useState<VaultDoc[]>([]);

  const fetchUserDocuments = async () => {
    setLoading(true);
    setFetchError('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (token) {
        const res = await fetch('/api/documents', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            const seen = new Set<string>();
            const uniqueDocs = json.data.filter((d: any) => {
              const key = d.storage_path || d.id;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });

            const mapped: VaultDoc[] = uniqueDocs.map((d: any) => {
              const meta = d.extracted_metadata || {};
              const isAadhaar = /aadhaar/i.test(d.requirement_name || '');
              const isIncome = /income/i.test(d.requirement_name || '');

              let policy = d.validity_period || meta.validityPolicy;
              if (!policy) {
                if (isAadhaar) policy = 'Permanent / Lifetime Validity (UIDAI)';
                else if (isIncome) policy = 'Valid for 3 Years (Gujarat Revenue Dept)';
                else policy = 'Standard Policy';
              }

              const expiryVal = d.expiry_date || (isAadhaar ? 'LIFETIME' : null);

              return {
                id: d.id,
                name: d.requirement_name || 'Verified Certificate',
                type: d.requirement_name || 'General Document',
                fileName: d.file_name || 'document.pdf',
                fileSize: d.file_size ? `${(d.file_size / (1024 * 1024)).toFixed(1)} MB` : (d.file_size_bytes ? `${(d.file_size_bytes / (1024 * 1024)).toFixed(1)} MB` : '1.2 MB'),
                fileUrl: d.storage_path,
                status: d.verification_status === 'VERIFIED' ? 'VERIFIED' : 'SUBMITTED',
                uploadedAt: new Date(d.uploaded_at || d.created_at || Date.now()).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
                issueDate: d.issue_date || null,
                validityPeriod: policy,
                expiryDate: expiryVal,
                documentNumber: meta.documentNumber || d.document_number || null,
                holderName: meta.holderName || null,
                issuingAuthority: meta.issuingAuthority || null,
                extractedMetadata: meta,
                remainingValidity: d.remaining_validity,
                isExpired: d.is_expired,
                isExpiringSoon: d.is_expiring_soon,
                daysRemaining: d.days_remaining,
              };
            });
            setDocuments(mapped);
            setLoading(false);
            return;
          }
        }
      }

      // Supabase direct query fallback
      if (currentUser?.id) {
        let { data: directDocs, error } = await supabase
          .from('documents')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('uploaded_at', { ascending: false });

        if (error) {
          const fallbackRes = await supabase
            .from('documents')
            .select('*')
            .eq('user_id', currentUser.id);
          directDocs = fallbackRes.data;
          error = fallbackRes.error;
        }

        if (!error && directDocs) {
          const seen = new Set<string>();
          const uniqueDocs = directDocs.filter((d: any) => {
            const key = d.storage_path || d.id;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

          const mapped: VaultDoc[] = uniqueDocs.map((d: any) => {
            const meta = d.extracted_metadata || {};
            const isAadhaar = /aadhaar/i.test(d.requirement_name || '');
            const isIncome = /income/i.test(d.requirement_name || '');

            let policy = d.validity_period || meta.validityPolicy;
            if (!policy) {
              if (isAadhaar) policy = 'Permanent / Lifetime Validity (UIDAI)';
              else if (isIncome) policy = 'Valid for 3 Years (Gujarat Revenue Dept)';
              else policy = 'Standard Policy';
            }

            const expiryVal = d.expiry_date || (isAadhaar ? 'LIFETIME' : null);

            return {
              id: d.id,
              name: d.requirement_name || 'Verified Certificate',
              type: d.requirement_name || 'General Document',
              fileName: d.file_name || 'document.pdf',
              fileSize: d.file_size ? `${(d.file_size / (1024 * 1024)).toFixed(1)} MB` : (d.file_size_bytes ? `${(d.file_size_bytes / (1024 * 1024)).toFixed(1)} MB` : '1.2 MB'),
              fileUrl: d.storage_path,
              status: d.verification_status === 'VERIFIED' ? 'VERIFIED' : 'SUBMITTED',
              uploadedAt: new Date(d.uploaded_at || d.created_at || Date.now()).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
              issueDate: d.issue_date || null,
              validityPeriod: policy,
              expiryDate: expiryVal,
              documentNumber: meta.documentNumber || d.document_number || null,
              holderName: meta.holderName || null,
              issuingAuthority: meta.issuingAuthority || null,
              extractedMetadata: meta,
              remainingValidity: d.remaining_validity,
              isExpired: d.is_expired,
              isExpiringSoon: d.is_expiring_soon,
              daysRemaining: d.days_remaining,
            };
          });
          setDocuments(mapped);
          setLoading(false);
          return;
        }
      }
      setDocuments([]);
    } catch (err: any) {
      console.warn('[UserDocumentsPage] Failed to fetch documents:', err);
      setFetchError('Failed to load documents from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDocuments();
  }, [currentUser?.id]);

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
      const isAadhaar = /aadhaar/i.test(selectedCategory) || /aadhaar/i.test(docTitle);
      const isIncome = /income/i.test(selectedCategory) || /income/i.test(docTitle);

      const extractedIssue = extracted.issueDate || null;
      const extractedExpiry = extracted.expiryDate || (isAadhaar ? 'LIFETIME' : null);
      let validityPolicy = extracted.validityPolicy;
      if (!validityPolicy) {
        if (isAadhaar) validityPolicy = 'Permanent / Lifetime Validity (UIDAI)';
        else if (isIncome) validityPolicy = 'Valid for 3 Years (Gujarat Revenue Dept)';
        else validityPolicy = 'Standard Policy';
      }

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
        uploadedAt: new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
        issueDate: extractedIssue,
        validityPeriod: validityPolicy,
        expiryDate: extractedExpiry,
        documentNumber: extracted.documentNumber ? `XXXX-XXXX-${extracted.documentNumber.slice(-4)}` : undefined,
        holderName: extracted.holderName || undefined,
        issuingAuthority: extracted.issuingAuthority || undefined,
        extractedMetadata: {
          holderName: extracted.holderName,
          documentNumber: extracted.documentNumber,
          issuingAuthority: extracted.issuingAuthority,
          validityPolicy: validityPolicy,
          confidenceScore: extracted.confidenceScore,
          summary: extracted.summary,
        },
      };

      // Persist to database
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (token) {
          await fetch('/api/documents', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              requirementName: selectedCategory,
              fileName: selectedFile.name,
              storagePath: uploadResult.secureUrl,
              verificationStatus: uploadResult.verificationStatus === 'VERIFIED' ? 'VERIFIED' : 'PENDING',
              fileSize: selectedFile.size,
              issueDate: extractedIssue,
              expiryDate: extractedExpiry,
              extractedMetadata: {
                holderName: extracted.holderName,
                documentNumber: extracted.documentNumber,
                issuingAuthority: extracted.issuingAuthority,
                validityPolicy: validityPolicy,
                confidenceScore: extracted.confidenceScore,
                summary: extracted.summary,
              },
            }),
          });
        }
      } catch (dbErr) {
        console.warn('[UserDocumentsPage] Database save note:', dbErr);
      }

      setDocuments((prev) => [newDoc, ...prev]);
      setSelectedFile(null);
      setFileError('');
      setIsUploadModalOpen(false);
      fetchUserDocuments();
    } catch (err: any) {
      clearInterval(stepInterval);
      console.error('[Document Verification Error]', err);

      const status = err.verificationStatus || '';
      const code = err.code || '';
      const msg = err.message || '';

      if (status === 'CATEGORY_MISMATCH' || code === 'VERIFICATION_CATEGORY_MISMATCH') {
        setFileError(msg || `Document type mismatch! You selected "${selectedCategory}", but the uploaded document does not match this category. Please upload the correct document.`);
      } else if (status === 'UNREADABLE' || code === 'UNREADABLE_DOCUMENT') {
        setFileError(msg || 'Unreadable document! The document text, seals, or stamps could not be verified clearly. Please provide a clear, sharp, unblurred scanned copy or PDF.');
      } else if (status === 'NEEDS_REVIEW' || code === 'METADATA_AMBIGUOUS') {
        setFileError(msg || 'Missing or ambiguous metadata! Certificate details could not be established reliably. Please re-upload a clear copy with visible dates and numbers.');
      } else if (status === 'EXPIRED' || code === 'DOCUMENT_EXPIRED') {
        setFileError(msg || `Document expired! Your ${selectedCategory} has expired. Please upload a currently valid, active certificate.`);
      } else if (status === 'UNSUPPORTED_CATEGORY' || code === 'UNSUPPORTED_CATEGORY') {
        setFileError(msg || `Unsupported document category! "${selectedCategory}" is not configured for automatic verification.`);
      } else if (status === 'DUPLICATE' || code === 'DUPLICATE_DOCUMENT') {
        setFileError(msg || 'Duplicate document detected! An identical verified document is already registered in your vault.');
      } else if (status === 'INVALID_FILE' || code === 'INVALID_FILE_SIGNATURE' || code === 'FILE_TOO_LARGE') {
        setFileError(msg || 'Invalid file format or file exceeds the 10 MB limit. Supported formats: PDF, PNG, JPG, JPEG.');
      } else if (code === 'GEMINI_QUOTA_ERROR' || code === 'HTTP_429') {
        setFileError('AI verification service rate limit exceeded. Please wait a few seconds and retry.');
      } else if (status === 'AUTH_ERROR' || code === 'GEMINI_AUTH_ERROR' || code === 'GEMINI_PERMISSION_ERROR') {
        setFileError('AI verification service configuration or permission notice. Verification is using server inspection engine.');
      } else if (status === 'STORAGE_ERROR' || code === 'CLOUDINARY_UPLOAD_FAILED' || code === 'CLOUDINARY_UPLOAD_ERROR') {
        setFileError(msg || 'Storage upload failure: Could not save the verified file to Cloudinary. Please try again.');
      } else {
        setFileError(msg || 'Verification failed. Please check your document and retry.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!deletingDoc) return;
    setIsDeleting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (token) {
        await fetch(`/api/documents/${deletingDoc.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      if (deletingDoc.cloudinaryPublicId) {
        await deleteCloudinaryDocument(deletingDoc.cloudinaryPublicId);
      }
      setDocuments((prev) => prev.filter((d) => d.id !== deletingDoc.id));
      setDeletingDoc(null);
    } catch (err) {
      console.warn('[Delete Document Error]', err);
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

      {/* Fetch Error Banner */}
      {fetchError && (
        <div
          style={{
            backgroundColor: 'var(--color-danger-50)',
            border: '1px solid var(--color-danger-300)',
            color: 'var(--color-danger-800)',
            padding: '12px 18px',
            borderRadius: '10px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 600,
          }}
        >
          <AlertCircle size={20} color="var(--color-danger-600)" />
          <span>{fetchError}</span>
        </div>
      )}

      {/* Vault Grid */}
      {loading ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
          <Loader2 size={36} className="spin" color="var(--color-primary-700)" />
          <p style={{ color: 'var(--color-neutral-600)', fontWeight: 600 }}>Loading verified vault documents...</p>
        </div>
      ) : documents.length === 0 ? (
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ color: 'var(--color-neutral-600)' }}>Issue Date:</span>
                      <span style={{ fontWeight: 600, color: doc.issueDate ? 'var(--color-neutral-900)' : 'var(--color-neutral-500)' }}>
                        {doc.issueDate ? formatDisplayDate(doc.issueDate) : 'Not available'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ color: 'var(--color-neutral-600)' }}>Expiry Date:</span>
                      <strong style={{ color: isExpiringSoon ? '#B45309' : isExpired ? '#DC2626' : 'var(--color-neutral-900)' }}>
                        {doc.expiryDate === 'LIFETIME'
                          ? 'Permanent / Lifetime Validity'
                          : doc.expiryDate
                          ? formatDisplayDate(doc.expiryDate)
                          : 'Not available'}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', borderTop: '1px dashed rgba(0,0,0,0.1)', paddingTop: '6px' }}>
                      <span style={{ color: 'var(--color-neutral-600)' }}>Remaining Validity:</span>
                      <strong style={{ color: isExpired ? '#DC2626' : isExpiringSoon ? '#B45309' : '#059669' }}>
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

      {/* PROPER VIEW DOCUMENT MODAL */}
      {viewingDoc && (
        <Modal
          isOpen={Boolean(viewingDoc)}
          onClose={() => setViewingDoc(null)}
          title={`Document Details: ${viewingDoc.name}`}
          maxWidth="920px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Top Info Banner */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                backgroundColor: 'var(--color-neutral-50)',
                borderRadius: '12px',
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    backgroundColor: viewingDoc.status === 'VERIFIED' ? '#ECFDF5' : '#FEF3C7',
                    color: viewingDoc.status === 'VERIFIED' ? '#047857' : '#B45309',
                    border: viewingDoc.status === 'VERIFIED' ? '1px solid #A7F3D0' : '1px solid #FDE68A',
                  }}
                >
                  <CheckCircle2 size={14} />
                  {viewingDoc.status === 'VERIFIED' ? 'AI-Verified Document' : 'Submitted'}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-neutral-600)', fontWeight: 600 }}>
                  Category: <strong>{viewingDoc.type}</strong>
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.82rem', color: 'var(--color-neutral-500)' }}>
                <span>Uploaded: {viewingDoc.uploadedAt}</span>
                {viewingDoc.fileSize && <span>• Size: {viewingDoc.fileSize}</span>}
              </div>
            </div>

            {/* Split Content: Preview on Left, Verified Details on Right */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '20px',
                alignItems: 'start',
              }}
            >
              {/* Document Preview Box */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    minHeight: '380px',
                    maxHeight: '480px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative',
                    padding: '8px',
                  }}
                >
                  {viewingDoc.previewDataUrl || viewingDoc.fileUrl ? (
                    <img
                      src={getCloudinaryViewUrl(viewingDoc.fileUrl || viewingDoc.previewDataUrl || '')}
                      alt={viewingDoc.name}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '460px',
                        objectFit: 'contain',
                        borderRadius: '8px',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                      }}
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = 'none';
                        const iframe = document.createElement('iframe');
                        iframe.src = viewingDoc.fileUrl || '';
                        iframe.style.width = '100%';
                        iframe.style.height = '420px';
                        iframe.style.border = 'none';
                        iframe.style.borderRadius = '8px';
                        target.parentElement?.appendChild(iframe);
                      }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '30px' }}>
                      <FileText size={56} style={{ color: 'var(--color-neutral-400)', margin: '0 auto 12px auto' }} />
                      <p style={{ color: 'var(--color-neutral-600)', margin: 0, fontWeight: 600 }}>No visual preview available</p>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--color-neutral-500)', padding: '0 4px' }}>
                  <span>{viewingDoc.fileName}</span>
                  {viewingDoc.fileUrl && (
                    <a
                      href={viewingDoc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--color-primary-700)', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      Open Original File <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>

              {/* Verified Document Metadata Details Panel */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  border: '1px solid var(--color-border)',
                  padding: '18px',
                }}
              >
                <div style={{ borderBottom: '1px solid var(--color-neutral-200)', paddingBottom: '10px' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--color-neutral-900)' }}>
                    Extracted Document Information
                  </h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-neutral-500)' }}>
                    Extracted from actual uploaded document payload
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.86rem' }}>
                  {/* Holder Name */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', paddingBottom: '8px', borderBottom: '1px dashed var(--color-neutral-200)' }}>
                    <span style={{ color: 'var(--color-neutral-600)' }}>Holder Name:</span>
                    <strong style={{ color: 'var(--color-neutral-900)', textAlign: 'right' }}>
                      {viewingDoc.holderName || viewingDoc.extractedMetadata?.holderName || 'Not available'}
                    </strong>
                  </div>

                  {/* Document / Certificate Number */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', paddingBottom: '8px', borderBottom: '1px dashed var(--color-neutral-200)' }}>
                    <span style={{ color: 'var(--color-neutral-600)' }}>Certificate / Doc ID:</span>
                    <strong style={{ color: 'var(--color-neutral-900)', textAlign: 'right', fontFamily: 'monospace' }}>
                      {viewingDoc.documentNumber || viewingDoc.extractedMetadata?.documentNumber || 'Not available'}
                    </strong>
                  </div>

                  {/* Issuing Authority */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', paddingBottom: '8px', borderBottom: '1px dashed var(--color-neutral-200)' }}>
                    <span style={{ color: 'var(--color-neutral-600)' }}>Issuing Authority:</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-neutral-800)', textAlign: 'right', maxWidth: '60%' }}>
                      {viewingDoc.issuingAuthority || viewingDoc.extractedMetadata?.issuingAuthority || 'Government Authority'}
                    </span>
                  </div>

                  {/* Issue Date */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', paddingBottom: '8px', borderBottom: '1px dashed var(--color-neutral-200)' }}>
                    <span style={{ color: 'var(--color-neutral-600)' }}>Official Issue Date:</span>
                    <span style={{ fontWeight: 700, color: viewingDoc.issueDate ? 'var(--color-neutral-900)' : 'var(--color-neutral-500)' }}>
                      {viewingDoc.issueDate ? formatDisplayDate(viewingDoc.issueDate) : 'Not available'}
                    </span>
                  </div>

                  {/* Expiry Date */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', paddingBottom: '8px', borderBottom: '1px dashed var(--color-neutral-200)' }}>
                    <span style={{ color: 'var(--color-neutral-600)' }}>Expiry Date:</span>
                    <strong style={{ color: viewingDoc.isExpired ? '#DC2626' : viewingDoc.isExpiringSoon ? '#B45309' : 'var(--color-neutral-900)' }}>
                      {viewingDoc.expiryDate === 'LIFETIME'
                        ? 'Permanent / Lifetime Validity'
                        : viewingDoc.expiryDate
                        ? formatDisplayDate(viewingDoc.expiryDate)
                        : 'Not available'}
                    </strong>
                  </div>

                  {/* Validity Policy */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', paddingBottom: '8px', borderBottom: '1px dashed var(--color-neutral-200)' }}>
                    <span style={{ color: 'var(--color-neutral-600)' }}>Validity Policy:</span>
                    <strong style={{ color: 'var(--color-neutral-800)', textAlign: 'right' }}>
                      {viewingDoc.validityPeriod}
                    </strong>
                  </div>

                  {/* Remaining Validity */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: viewingDoc.isExpired
                        ? '#FEE2E2'
                        : viewingDoc.isExpiringSoon
                        ? '#FEF3C7'
                        : '#ECFDF5',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: viewingDoc.isExpired ? '#991B1B' : viewingDoc.isExpiringSoon ? '#92400E' : '#065F46' }}>
                      Remaining Validity:
                    </span>
                    <strong style={{ color: viewingDoc.isExpired ? '#DC2626' : viewingDoc.isExpiringSoon ? '#B45309' : '#059669', fontSize: '0.92rem' }}>
                      {formatRemainingValidity(viewingDoc.expiryDate, viewingDoc.validityPeriod, viewingDoc.remainingValidity)}
                    </strong>
                  </div>
                </div>

                {/* AI Verification Seal */}
                <div
                  style={{
                    marginTop: 'auto',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <ShieldCheck size={20} style={{ color: '#16A34A', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.78rem', color: '#15803D', lineHeight: 1.35 }}>
                    <strong>NagrikQ Verified:</strong> Confirmed by official Indian government document inspection engine.
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', borderTop: '1px solid var(--color-neutral-200)', paddingTop: '16px' }}>
              <Button variant="outline" onClick={() => setViewingDoc(null)}>
                Close Viewer
              </Button>

              <div style={{ display: 'flex', gap: '10px' }}>
                {viewingDoc.fileUrl && (
                  <Button
                    variant="secondary"
                    onClick={() => window.open(viewingDoc.fileUrl, '_blank')}
                    icon={<ExternalLink size={16} />}
                  >
                    Open Full Document
                  </Button>
                )}
                <Button
                  variant="primary"
                  onClick={(e) => handleDownloadDoc(viewingDoc, e)}
                  icon={<Download size={16} />}
                >
                  Download Document
                </Button>
              </div>
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

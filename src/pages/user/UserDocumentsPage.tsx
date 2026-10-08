import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useUI } from '../../context/UIContext';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
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
  Edit3,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  uploadDocumentToCloudinary,
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
  status: 'VERIFIED' | 'SUBMITTED';
  uploadedAt: string;
  issueDate: string;
  validityPeriod: string;
  expiryDate: string;
}

export const calculateExpiryDate = (issueDateStr: string, validityPeriodStr: string): string => {
  if (
    validityPeriodStr.toLowerCase().includes('lifetime') ||
    validityPeriodStr.toLowerCase().includes('permanent')
  ) {
    return 'Lifetime Validity';
  }
  const date = new Date(issueDateStr || Date.now());
  if (isNaN(date.getTime())) return 'Valid for 3 Years';

  if (validityPeriodStr.includes('3 Year')) {
    date.setFullYear(date.getFullYear() + 3);
  } else if (validityPeriodStr.includes('1 Year') || validityPeriodStr.includes('Financial Year')) {
    date.setFullYear(date.getFullYear() + 1);
  } else if (validityPeriodStr.includes('5 Year')) {
    date.setFullYear(date.getFullYear() + 5);
  } else {
    date.setFullYear(date.getFullYear() + 3);
  }
  return date.toISOString().split('T')[0];
};

export const getDaysRemaining = (expiryDateStr?: string): number | null => {
  if (!expiryDateStr || expiryDateStr.includes('Lifetime')) return null;
  const expiry = new Date(expiryDateStr);
  if (isNaN(expiry.getTime())) return null;
  const now = new Date();
  const diffTime = expiry.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const UserDocumentsPage: React.FC = () => {
  const { uiMode } = useUI();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const isSimple = uiMode === 'simple';

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [docName, setDocName] = useState('');
  const [issueDate, setIssueDate] = useState(() => {
    // Default to a date for testing
    const d = new Date();
    d.setFullYear(d.getFullYear() - 2);
    d.setMonth(d.getMonth() - 11);
    d.setDate(d.getDate() - 20);
    return d.toISOString().split('T')[0];
  });
  const [validityPeriod, setValidityPeriod] = useState('3 Years');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');

  const storageKey = currentUser?.id ? `nagrikq_vault_${currentUser.id}` : 'nagrikq_vault_guest';

  // Seed with Income Certificate expiring in ~10 days to demonstrate 15-day expiry alert
  const [documents, setDocuments] = useState<VaultDoc[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore
    }
    const tenDaysFromNow = new Date();
    tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10);

    const pastThreeYearsMinus10Days = new Date();
    pastThreeYearsMinus10Days.setFullYear(pastThreeYearsMinus10Days.getFullYear() - 3);
    pastThreeYearsMinus10Days.setDate(pastThreeYearsMinus10Days.getDate() + 10);

    return [
      {
        id: 'vault-init-income',
        name: 'Income Certificate',
        type: 'Revenue Certificate',
        fileName: 'income_certificate_2023.pdf',
        fileSize: '1.4 MB',
        status: 'VERIFIED',
        uploadedAt: 'Active In Vault',
        issueDate: pastThreeYearsMinus10Days.toISOString().split('T')[0],
        validityPeriod: 'Valid for 3 Years',
        expiryDate: tenDaysFromNow.toISOString().split('T')[0],
      },
      {
        id: 'vault-init-aadhaar',
        name: 'Aadhaar Card',
        type: 'Identity Proof',
        fileName: 'aadhaar_card_masked.pdf',
        fileSize: '1.2 MB',
        status: 'VERIFIED',
        uploadedAt: 'Active In Vault',
        issueDate: '2018-05-12',
        validityPeriod: 'Lifetime Validity',
        expiryDate: 'Lifetime Validity',
      },
    ];
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
      setFileError('File size exceeds 10MB limit.');
      return;
    }

    setSelectedFile(file);
    setFileError('');

    if (!docName.trim()) {
      const cleanName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());
      setDocName(cleanName);
    }
  };

  const [isUploading, setIsUploading] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<VaultDoc | null>(null);
  const [blobUrls, setBlobUrls] = useState<Record<string, string>>({});

  // EDIT / UPDATE STATE
  const [editingDoc, setEditingDoc] = useState<VaultDoc | null>(null);
  const [editName, setEditName] = useState('');
  const [editIssueDate, setEditIssueDate] = useState('');
  const [editValidityPeriod, setEditValidityPeriod] = useState('3 Years');
  const [editSelectedFile, setEditSelectedFile] = useState<File | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editFileError, setEditFileError] = useState('');
  const editFileInputRef = useRef<HTMLInputElement | null>(null);

  // DELETE CONFIRMATION STATE
  const [deletingDoc, setDeletingDoc] = useState<VaultDoc | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSaveDocument = async () => {
    if (!selectedFile && !docName.trim()) {
      setFileError('Please select a file from your computer or specify document title.');
      return;
    }

    setIsUploading(true);
    setFileError('');

    try {
      let uploadedFileUrl: string | undefined;
      let uploadedPublicId: string | undefined;
      let uploadedFolder: string | undefined;
      let safePreviewDataUrl: string | undefined;
      let localBlobUrl: string | undefined;

      // Process and upload file directly to Cloudinary under user-specific folder
      if (selectedFile) {
        localBlobUrl = URL.createObjectURL(selectedFile);
        
        // Cache data URL for offline or immediate preview if file is under 2MB
        if (selectedFile.size < 2 * 1024 * 1024) {
          try {
            safePreviewDataUrl = await fileToDataUrl(selectedFile);
          } catch {
            // Ignore preview read error
          }
        }

        const uploadResult = await uploadDocumentToCloudinary(selectedFile, currentUser?.id);
        uploadedFileUrl = uploadResult.secureUrl;
        uploadedPublicId = uploadResult.publicId;
        uploadedFolder = uploadResult.folder;
      }

      const title = docName.trim() || selectedFile?.name || 'Verified Certificate';
      const sizeInMb = selectedFile ? (selectedFile.size / (1024 * 1024)).toFixed(1) + ' MB' : '850 KB';
      const computedExpiry = calculateExpiryDate(issueDate, validityPeriod);
      const docId = `vault-${Date.now()}`;

      if (localBlobUrl) {
        setBlobUrls((prev) => ({ ...prev, [docId]: localBlobUrl! }));
      }

      const newDoc: VaultDoc = {
        id: docId,
        name: title,
        type: 'Official Certificate',
        fileName: selectedFile?.name || `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`,
        fileSize: sizeInMb,
        fileUrl: uploadedFileUrl,
        cloudinaryPublicId: uploadedPublicId,
        cloudinaryFolder: uploadedFolder,
        previewDataUrl: safePreviewDataUrl,
        status: 'VERIFIED',
        uploadedAt: 'Today',
        issueDate,
        validityPeriod: `Valid for ${validityPeriod}`,
        expiryDate: computedExpiry,
      };

      setDocuments((prev) => [newDoc, ...prev]);
      setDocName('');
      setSelectedFile(null);
      setFileError('');
      setIsUploadModalOpen(false);
    } catch (err: any) {
      console.error('[Document Upload Error]', err);
      setFileError(err.message || 'Failed to upload document to Cloudinary. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // OPEN EDIT MODAL
  const handleOpenEdit = (doc: VaultDoc, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingDoc(doc);
    setEditName(doc.name);
    setEditIssueDate(doc.issueDate || '');
    let v = doc.validityPeriod?.replace(/^Valid for\s*/i, '').trim() || '3 Years';
    if (!['1 Year', '3 Years', '5 Years', 'Lifetime Validity'].includes(v)) {
      v = '3 Years';
    }
    setEditValidityPeriod(v);
    setEditSelectedFile(null);
    setEditFileError('');
  };

  // SAVE EDITED DOCUMENT
  const handleUpdateDocument = async () => {
    if (!editingDoc) return;
    if (!editName.trim()) {
      setEditFileError('Please provide a document title.');
      return;
    }

    setIsUpdating(true);
    setEditFileError('');

    try {
      let updatedFileUrl = editingDoc.fileUrl;
      let updatedPublicId = editingDoc.cloudinaryPublicId;
      let updatedFolder = editingDoc.cloudinaryFolder;
      let updatedFileName = editingDoc.fileName;
      let updatedSize = editingDoc.fileSize;
      let safePreview = editingDoc.previewDataUrl;

      // If user provided a replacement file, upload it to Cloudinary
      if (editSelectedFile) {
        const newBlob = URL.createObjectURL(editSelectedFile);
        setBlobUrls((prev) => ({ ...prev, [editingDoc.id]: newBlob }));

        if (editSelectedFile.size < 2 * 1024 * 1024) {
          try {
            safePreview = await fileToDataUrl(editSelectedFile);
          } catch {
            // Ignore preview error
          }
        }

        const uploadRes = await uploadDocumentToCloudinary(editSelectedFile, currentUser?.id);
        updatedFileUrl = uploadRes.secureUrl;
        updatedPublicId = uploadRes.publicId;
        updatedFolder = uploadRes.folder;
        updatedFileName = editSelectedFile.name;
        updatedSize = (editSelectedFile.size / (1024 * 1024)).toFixed(1) + ' MB';
      }

      const computedExpiry = calculateExpiryDate(editIssueDate, editValidityPeriod);

      const updatedRecord: VaultDoc = {
        ...editingDoc,
        name: editName.trim(),
        issueDate: editIssueDate,
        validityPeriod: `Valid for ${editValidityPeriod}`,
        expiryDate: computedExpiry,
        fileName: updatedFileName,
        fileSize: updatedSize,
        fileUrl: updatedFileUrl,
        cloudinaryPublicId: updatedPublicId,
        cloudinaryFolder: updatedFolder,
        previewDataUrl: safePreview,
      };

      setDocuments((prev) => prev.map((d) => (d.id === editingDoc.id ? updatedRecord : d)));

      if (viewingDoc?.id === editingDoc.id) {
        setViewingDoc(updatedRecord);
      }

      setEditingDoc(null);
    } catch (err: any) {
      console.error('[Update Error]', err);
      setEditFileError(err.message || 'Failed to update document.');
    } finally {
      setIsUpdating(false);
    }
  };

  // CONFIRM DELETE
  const handleConfirmDelete = async () => {
    if (!deletingDoc) return;
    const target = deletingDoc;
    setIsDeleting(true);

    try {
      setDocuments((prev) => prev.filter((d) => d.id !== target.id));
      if (viewingDoc?.id === target.id) {
        setViewingDoc(null);
      }

      // If stored on Cloudinary, delete remote asset asynchronously
      if (target.cloudinaryPublicId) {
        deleteCloudinaryDocument(target.cloudinaryPublicId).catch(() => {});
      }
    } finally {
      setIsDeleting(false);
      setDeletingDoc(null);
    }
  };

  // ROBUST DOWNLOAD HANDLER - NO 401, NO EXTENSION WARNINGS
  const handleDownloadDoc = (doc: VaultDoc, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // 1. If stored in Cloudinary with publicId: use signed download endpoint
    if (doc.cloudinaryPublicId) {
      const isPdf = doc.fileName?.toLowerCase().endsWith('.pdf') || doc.fileUrl?.toLowerCase().endsWith('.pdf');
      const format = isPdf ? 'pdf' : (doc.fileName?.split('.').pop() || 'pdf');
      const dlUrl = getCloudinaryDownloadUrl(doc.cloudinaryPublicId, doc.fileName, format);

      // Direct window location / anchor download via backend signed redirect
      const a = document.createElement('a');
      a.href = dlUrl;
      a.download = doc.fileName || `${doc.name}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // 2. Direct local blob URL or safe preview
    const localUrl = blobUrls[doc.id] || doc.previewDataUrl;
    if (localUrl) {
      const a = document.createElement('a');
      a.href = localUrl;
      a.download = doc.fileName || `${doc.name}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // 3. Fallback for pre-seeded certificates: generate synthetic downloaded cert text/file
    if (doc.fileUrl) {
      const a = document.createElement('a');
      a.href = doc.fileUrl;
      a.download = doc.fileName || `${doc.name}.pdf`;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // Create clean downloadable text summary for sample records
      const blob = new Blob([
        `NAGRIKQ CITIZEN DIGITAL VAULT CERTIFICATE\n` +
        `-----------------------------------------\n` +
        `Document Name: ${doc.name}\n` +
        `Category: ${doc.type}\n` +
        `Status: ${doc.status}\n` +
        `Issue Date: ${doc.issueDate}\n` +
        `Validity: ${doc.validityPeriod}\n` +
        `Calculated Expiry: ${doc.expiryDate}\n` +
        `Verified In: NagrikQ State Digital Vault System\n`
      ], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${doc.fileName || doc.name}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: isSimple ? '2.4rem' : '1.8rem', color: 'var(--color-primary-900)', margin: 0, fontWeight: 800 }}>
            Digital Document Vault & Expiry Tracker
          </h1>
          <p style={{ color: 'var(--color-neutral-600)', fontSize: isSimple ? '1.1rem' : '0.95rem', marginTop: '4px', marginBottom: 0 }}>
            Store certified documents, maintain issue and validity dates, and receive automated 15-day expiry renewal alerts.
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsUploadModalOpen(true)} icon={<Plus size={18} />}>
          Upload New Document
        </Button>
      </div>

      {/* 15-DAY EXPIRY ALERT NOTIFICATION BANNER */}
      {expiringSoonDocs.length > 0 && (
        <div
          style={{
            backgroundColor: '#FEF3C7',
            border: '2px solid #F59E0B',
            borderRadius: '14px',
            padding: '18px 22px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
            boxShadow: '0 4px 16px rgba(245, 158, 11, 0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#F59E0B', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#92400E' }}>
                ⚠️ Document Expiry Notice ({expiringSoonDocs.length} Document Requires Action)
              </h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: '#B45309' }}>
                {expiringSoonDocs.map((d) => {
                  const days = getDaysRemaining(d.expiryDate);
                  return `${d.name} (${days !== null && days > 0 ? `expires in ${days} days on ${d.expiryDate}` : `expired on ${d.expiryDate}`})`;
                }).join(' • ')}. Apply for renewal now to avoid government application rejections.
              </p>
            </div>
          </div>
          <Button
            variant="saffron"
            size="sm"
            onClick={() => navigate('/user/services')}
            icon={<RotateCcw size={15} />}
            style={{ fontWeight: 800 }}
          >
            Apply for Renewal
          </Button>
        </div>
      )}

      {documents.length === 0 ? (
        <EmptyState
          title="No Documents Uploaded"
          description="Your digital document vault is currently empty. Upload verified certificates for instant application reuse."
          actionText="Upload First Document"
          onAction={() => setIsUploadModalOpen(true)}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '22px' }}>
          {documents.map((doc) => {
            const daysRemaining = getDaysRemaining(doc.expiryDate);
            const isExpiringSoon = daysRemaining !== null && daysRemaining <= 15 && daysRemaining > 0;
            const isExpired = daysRemaining !== null && daysRemaining <= 0;

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
                  transition: 'box-shadow 0.2s ease',
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
                          title={`Stored in Cloudinary: ${doc.cloudinaryFolder || 'user folder'}`}
                        >
                          <UploadCloud size={12} />
                          Cloudinary
                        </span>
                      )}
                      {isExpiringSoon ? (
                        <Badge variant="warning">⚠️ Expiring in {daysRemaining} Days</Badge>
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
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'color 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-neutral-400)')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Title & Type */}
                  <div>
                    <h3 style={{ fontSize: isSimple ? '1.3rem' : '1.15rem', color: 'var(--color-neutral-900)', margin: '0 0 4px 0', fontWeight: 800, wordBreak: 'break-word' }}>
                      {doc.name}
                    </h3>
                    <span style={{ fontSize: '0.82rem', color: 'var(--color-neutral-500)', display: 'block' }}>
                      {doc.type} • {doc.uploadedAt}
                    </span>
                  </div>

                  {/* Document Expiry Details Box */}
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
                      <span style={{ color: 'var(--color-neutral-600)' }}>Validity Period:</span>
                      <strong>{doc.validityPeriod}</strong>
                    </div>
                    {doc.issueDate && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ color: 'var(--color-neutral-600)' }}>Issue Date:</span>
                        <span>{doc.issueDate}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ color: 'var(--color-neutral-600)' }}>Calculated Expiry:</span>
                      <strong style={{ color: isExpiringSoon ? '#B45309' : isExpired ? '#DC2626' : 'var(--color-neutral-900)' }}>
                        {doc.expiryDate}
                      </strong>
                    </div>
                  </div>

                  {/* File Name Row - Fully flexible without truncation */}
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

                {/* Flexible Action Buttons Row */}
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
                    style={{ flex: '1 1 auto', minWidth: '78px', justifyContent: 'center' }}
                  >
                    View
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => handleDownloadDoc(doc, e)}
                    icon={<Download size={14} />}
                    style={{ flex: '1 1 auto', minWidth: '95px', justifyContent: 'center' }}
                  >
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => handleOpenEdit(doc, e)}
                    icon={<Edit3 size={14} />}
                    style={{ flex: '1 1 auto', minWidth: '72px', justifyContent: 'center' }}
                  >
                    Edit
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

      {/* UPLOAD DOCUMENT MODAL */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Document to Vault"
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

          <Input
            label="Document Title"
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
            placeholder="e.g. Caste Certificate / Income Certificate"
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                Document Issue Date
              </label>
              <Input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                Validity Period
              </label>
              <select
                value={validityPeriod}
                onChange={(e) => setValidityPeriod(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'white',
                  fontSize: '0.9rem',
                }}
              >
                <option value="1 Year">Valid for 1 Year</option>
                <option value="3 Years">Valid for 3 Years (Standard)</option>
                <option value="5 Years">Valid for 5 Years</option>
                <option value="Lifetime Validity">Lifetime Validity</option>
              </select>
            </div>
          </div>

          {/* Interactive File Drop / Picker Zone */}
          <div
            onClick={handleOpenFileDialog}
            style={{
              border: selectedFile ? '2px solid var(--color-success-500)' : '2px dashed var(--color-primary-400)',
              borderRadius: '12px',
              padding: '28px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: selectedFile ? 'var(--color-success-50)' : 'var(--color-primary-50)',
              transition: 'all 0.2s ease',
            }}
          >
            {selectedFile ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={38} style={{ color: 'var(--color-success-600)' }} />
                <span style={{ fontWeight: 700, color: 'var(--color-neutral-900)', fontSize: '1rem' }}>
                  {selectedFile.name}
                </span>
                <span style={{ fontSize: '0.82rem', color: 'var(--color-neutral-600)' }}>
                  Size: {(selectedFile.size / 1024).toFixed(1)} KB • Ready to save
                </span>
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
                  Choose Different File
                </Button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <UploadCloud size={40} style={{ color: 'var(--color-primary-700)' }} />
                <p style={{ fontWeight: 700, color: 'var(--color-neutral-900)', margin: 0, fontSize: '1rem' }}>
                  Click to open file explorer
                </p>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-neutral-600)' }}>
                  Select PDF, PNG, JPG, or JPEG file from your computer (Max 10MB)
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  style={{ marginTop: '8px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenFileDialog();
                  }}
                  icon={<FolderOpen size={16} />}
                >
                  Browse Files from Computer
                </Button>
              </div>
            )}
          </div>

          {isUploading && (
            <div
              style={{
                backgroundColor: '#EFF6FF',
                border: '1px solid #93C5FD',
                borderRadius: '8px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '0.85rem',
                color: '#1E40AF',
              }}
            >
              <Loader2 size={18} className="animate-spin" style={{ color: '#2563EB', flexShrink: 0 }} />
              <div>
                <p style={{ margin: 0, fontWeight: 700 }}>Uploading to Cloudinary...</p>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#3B82F6' }}>
                  Target folder: nagrikq/users/{currentUser?.id ? currentUser.id.replace(/[^a-zA-Z0-9_-]/g, '_') : 'user_general'}
                </p>
              </div>
            </div>
          )}

          {fileError && (
            <span style={{ fontSize: '0.85rem', color: 'var(--color-danger-600)', fontWeight: 600 }}>
              {fileError}
            </span>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <Button variant="secondary" onClick={() => setIsUploadModalOpen(false)} disabled={isUploading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveDocument}
              disabled={isUploading}
              icon={isUploading ? <Loader2 size={16} className="animate-spin" /> : <FileCheck size={16} />}
            >
              {isUploading ? 'Uploading to Cloudinary...' : 'Save to Vault'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* DOCUMENT VIEWER DIALOG BOX */}
      <Modal
        isOpen={!!viewingDoc}
        onClose={() => setViewingDoc(null)}
        title={viewingDoc ? viewingDoc.name : 'Document Viewer'}
        description={viewingDoc ? `${viewingDoc.type} • ${viewingDoc.fileName}` : undefined}
        maxWidth="860px"
      >
        {viewingDoc && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Metadata Bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '12px 16px',
                backgroundColor: 'var(--color-neutral-50)',
                borderRadius: '10px',
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <StatusBadge status={viewingDoc.status} />
                {viewingDoc.fileUrl && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.74rem',
                      backgroundColor: '#E0F2FE',
                      color: '#0369A1',
                      border: '1px solid #BAE6FD',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontWeight: 700,
                    }}
                  >
                    <UploadCloud size={12} />
                    Cloudinary Stored
                  </span>
                )}
                <span style={{ fontSize: '0.82rem', color: 'var(--color-neutral-600)' }}>
                  {viewingDoc.validityPeriod} • Expiry: <strong>{viewingDoc.expiryDate}</strong>
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const targetDoc = viewingDoc;
                    setViewingDoc(null);
                    handleOpenEdit(targetDoc);
                  }}
                  icon={<Edit3 size={13} />}
                >
                  Edit
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => handleDownloadDoc(viewingDoc, e)}
                  icon={<Download size={13} />}
                >
                  Download File
                </Button>
              </div>
            </div>

            {/* Document Render Area in Dialog Box */}
            {(() => {
              const localBlob = blobUrls[viewingDoc.id];
              const safePreview = viewingDoc.previewDataUrl;
              const remoteUrl = viewingDoc.fileUrl;
              
              // For Cloudinary PDF: converting URL to .png gives high-res preview without 401 delivery restriction
              const pdfPreviewImg = remoteUrl ? getCloudinaryViewUrl(remoteUrl) : null;
              const isPdf = viewingDoc.fileName?.toLowerCase().endsWith('.pdf') || remoteUrl?.toLowerCase().endsWith('.pdf');
              const isImage = viewingDoc.fileName?.match(/\.(png|jpe?g|webp|gif|svg)$/i) || safePreview?.startsWith('data:image');

              // 1. Direct local Blob iframe (if uploaded in this browser session)
              if (localBlob && isPdf) {
                return (
                  <div
                    style={{
                      width: '100%',
                      height: '520px',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      border: '1px solid var(--color-border)',
                      backgroundColor: '#F8FAFC',
                    }}
                  >
                    <iframe
                      src={localBlob}
                      title={viewingDoc.name}
                      style={{ width: '100%', height: '100%', border: 'none' }}
                    />
                  </div>
                );
              }

              // 2. High-res Cloudinary preview image for PDF
              if (isPdf && pdfPreviewImg) {
                return (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: '#0F172A',
                        borderRadius: '10px',
                        padding: '16px',
                        width: '100%',
                        minHeight: '360px',
                        maxHeight: '520px',
                        overflow: 'auto',
                      }}
                    >
                      <img
                        src={pdfPreviewImg}
                        alt={viewingDoc.name}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '480px',
                          objectFit: 'contain',
                          borderRadius: '6px',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                        }}
                      />
                    </div>
                  </div>
                );
              }

              // 3. Image Document display
              if (isImage && (localBlob || safePreview || remoteUrl)) {
                return (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: '#0F172A',
                      borderRadius: '10px',
                      padding: '16px',
                      minHeight: '360px',
                      maxHeight: '520px',
                      overflow: 'auto',
                    }}
                  >
                    <img
                      src={localBlob || safePreview || remoteUrl}
                      alt={viewingDoc.name}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '480px',
                        objectFit: 'contain',
                        borderRadius: '6px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                      }}
                    />
                  </div>
                );
              }

              // 4. Fallback for pre-seeded verified certificates
              return (
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '2px dashed var(--color-border)',
                    borderRadius: '12px',
                    padding: '36px 20px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '14px',
                  }}
                >
                  <div
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-primary-100)',
                      color: 'var(--color-primary-700)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <FileText size={30} />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '1.15rem', color: 'var(--color-neutral-900)' }}>
                      {viewingDoc.name}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--color-neutral-600)' }}>
                      Official Digital Vault Certificate • {viewingDoc.fileName}
                    </p>
                  </div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      color: '#065F46',
                      padding: '5px 12px',
                      borderRadius: '20px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                    }}
                  >
                    <ShieldCheck size={15} />
                    Verified Citizen Document Record
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: '12px',
                      width: '100%',
                      maxWidth: '520px',
                      marginTop: '10px',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ backgroundColor: 'white', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500)', display: 'block' }}>Issue Date</span>
                      <strong style={{ fontSize: '0.88rem', color: 'var(--color-neutral-900)' }}>{viewingDoc.issueDate}</strong>
                    </div>
                    <div style={{ backgroundColor: 'white', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500)', display: 'block' }}>Validity</span>
                      <strong style={{ fontSize: '0.88rem', color: 'var(--color-neutral-900)' }}>{viewingDoc.validityPeriod}</strong>
                    </div>
                    <div style={{ backgroundColor: 'white', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500)', display: 'block' }}>Calculated Expiry</span>
                      <strong style={{ fontSize: '0.88rem', color: 'var(--color-neutral-900)' }}>{viewingDoc.expiryDate}</strong>
                    </div>
                    <div style={{ backgroundColor: 'white', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500)', display: 'block' }}>Vault Status</span>
                      <strong style={{ fontSize: '0.88rem', color: '#059669' }}>Active & Certified</strong>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Dialog Box Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <Button variant="primary" onClick={() => setViewingDoc(null)}>
                Close Viewer
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* EDIT / UPDATE DOCUMENT MODAL */}
      <Modal
        isOpen={!!editingDoc}
        onClose={() => setEditingDoc(null)}
        title="Edit Document Information"
        description="Update certified document metadata or upload a revised copy."
        maxWidth="600px"
      >
        {editingDoc && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <input
              type="file"
              ref={editFileInputRef}
              style={{ display: 'none' }}
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (file.size > 10 * 1024 * 1024) {
                    setEditFileError('File exceeds 10MB limit.');
                    return;
                  }
                  setEditSelectedFile(file);
                  setEditFileError('');
                }
              }}
            />

            <Input
              label="Document Title"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="e.g. Aadhaar Card / Caste Certificate"
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                  Issue Date
                </label>
                <Input
                  type="date"
                  value={editIssueDate}
                  onChange={(e) => setEditIssueDate(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                  Validity Period
                </label>
                <select
                  value={editValidityPeriod}
                  onChange={(e) => setEditValidityPeriod(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'white',
                    fontSize: '0.9rem',
                  }}
                >
                  <option value="1 Year">Valid for 1 Year</option>
                  <option value="3 Years">Valid for 3 Years (Standard)</option>
                  <option value="5 Years">Valid for 5 Years</option>
                  <option value="Lifetime Validity">Lifetime Validity</option>
                </select>
              </div>
            </div>

            {/* Optional File Replacement Zone */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                Replace Document File (Optional)
              </label>
              <div
                onClick={() => editFileInputRef.current?.click()}
                style={{
                  border: editSelectedFile ? '2px solid var(--color-success-500)' : '2px dashed var(--color-border)',
                  borderRadius: '10px',
                  padding: '16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: editSelectedFile ? 'var(--color-success-50)' : 'var(--color-neutral-50)',
                }}
              >
                {editSelectedFile ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <CheckCircle2 size={20} style={{ color: 'var(--color-success-600)' }} />
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>New File: {editSelectedFile.name}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-neutral-500)' }}>
                      ({(editSelectedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <FolderOpen size={22} style={{ color: 'var(--color-primary-600)' }} />
                    <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Click to upload replacement file</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-neutral-500)' }}>
                      Current: {editingDoc.fileName}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {editFileError && (
              <span style={{ fontSize: '0.85rem', color: 'var(--color-danger-600)', fontWeight: 600 }}>
                {editFileError}
              </span>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <Button variant="secondary" onClick={() => setEditingDoc(null)} disabled={isUpdating}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleUpdateDocument}
                disabled={isUpdating}
                icon={isUpdating ? <Loader2 size={16} className="animate-spin" /> : <FileCheck size={16} />}
              >
                {isUpdating ? 'Saving Changes...' : 'Save Updates'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={!!deletingDoc}
        onClose={() => setDeletingDoc(null)}
        title="Delete Document from Vault"
        maxWidth="480px"
      >
        {deletingDoc && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: '#FEE2E2',
                  color: '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Trash2 size={20} />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: 'var(--color-neutral-900)' }}>
                  Are you sure you want to delete this document?
                </p>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.88rem', color: 'var(--color-neutral-600)' }}>
                  <strong>{deletingDoc.name}</strong> ({deletingDoc.fileName}) will be permanently removed from your digital vault and Cloudinary storage.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <Button variant="secondary" onClick={() => setDeletingDoc(null)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                icon={isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              >
                {isDeleting ? 'Deleting...' : 'Delete Document'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

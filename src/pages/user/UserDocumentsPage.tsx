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
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface VaultDoc {
  id: string;
  name: string;
  type: string;
  fileName: string;
  fileSize?: string;
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

  const handleSaveDocument = () => {
    if (!selectedFile && !docName.trim()) {
      setFileError('Please select a file from your computer or specify document title.');
      return;
    }

    const title = docName.trim() || selectedFile?.name || 'Verified Certificate';
    const sizeInMb = selectedFile ? (selectedFile.size / (1024 * 1024)).toFixed(1) + ' MB' : '850 KB';
    const computedExpiry = calculateExpiryDate(issueDate, validityPeriod);

    const newDoc: VaultDoc = {
      id: `vault-${Date.now()}`,
      name: title,
      type: 'Official Certificate',
      fileName: selectedFile?.name || `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`,
      fileSize: sizeInMb,
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
  };

  const handleDeleteDoc = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const handleDownloadDoc = (doc: VaultDoc) => {
    alert(`Downloading ${doc.fileName} from NagrikQ digital vault.`);
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
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
                  border: isExpiringSoon
                    ? '2px solid #F59E0B'
                    : isExpired
                    ? '2px solid #EF4444'
                    : '1px solid var(--color-border)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'var(--color-primary-100)', color: 'var(--color-primary-700)' }}>
                      <FileCheck size={22} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isExpiringSoon ? (
                        <Badge variant="warning">⚠️ Expiring in {daysRemaining} Days</Badge>
                      ) : isExpired ? (
                        <Badge variant="danger">Expired</Badge>
                      ) : (
                        <StatusBadge status={doc.status} />
                      )}
                      <button
                        onClick={() => handleDeleteDoc(doc.id)}
                        title="Remove from vault"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-neutral-400)', padding: '4px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 style={{ fontSize: isSimple ? '1.25rem' : '1.05rem', color: 'var(--color-neutral-900)', margin: '0 0 4px 0', fontWeight: 700 }}>
                      {doc.name}
                    </h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-neutral-500)', display: 'block' }}>
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
                      padding: '10px 12px',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-neutral-600)' }}>Validity Period:</span>
                      <strong>{doc.validityPeriod}</strong>
                    </div>
                    {doc.issueDate && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--color-neutral-600)' }}>Issue Date:</span>
                        <span>{doc.issueDate}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-neutral-600)' }}>Calculated Expiry:</span>
                      <strong style={{ color: isExpiringSoon ? '#B45309' : isExpired ? '#DC2626' : 'var(--color-neutral-900)' }}>
                        {doc.expiryDate}
                      </strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-neutral-200)', paddingTop: '12px' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--color-neutral-600)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                    {doc.fileName} {doc.fileSize ? `(${doc.fileSize})` : ''}
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {isExpiringSoon && (
                      <Button variant="saffron" size="sm" onClick={() => navigate('/user/services')}>
                        Renew
                      </Button>
                    )}
                    <Button variant="secondary" size="sm" onClick={() => handleDownloadDoc(doc)} icon={<Download size={14} />}>
                      Download
                    </Button>
                  </div>
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

          {fileError && (
            <span style={{ fontSize: '0.85rem', color: 'var(--color-danger-600)', fontWeight: 600 }}>
              {fileError}
            </span>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <Button variant="secondary" onClick={() => setIsUploadModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveDocument} icon={<FileCheck size={16} />}>
              Save to Vault
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

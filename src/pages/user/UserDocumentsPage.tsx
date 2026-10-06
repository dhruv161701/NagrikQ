import React, { useState, useRef, useEffect } from 'react';
import { useUI } from '../../context/UIContext';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { FileCheck, UploadCloud, Download, Plus, File, CheckCircle2, Trash2, FolderOpen } from 'lucide-react';

interface VaultDoc {
  id: string;
  name: string;
  type: string;
  fileName: string;
  fileSize?: string;
  status: 'VERIFIED' | 'SUBMITTED';
  uploadedAt: string;
}

export const UserDocumentsPage: React.FC = () => {
  const { uiMode } = useUI();
  const { currentUser } = useAuth();
  const isSimple = uiMode === 'simple';

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [docName, setDocName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');

  const storageKey = currentUser?.id ? `nagrikq_vault_${currentUser.id}` : 'nagrikq_vault_guest';

  const [documents, setDocuments] = useState<VaultDoc[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore
    }
    return [
      {
        id: 'vault-init-1',
        name: 'Aadhaar Card',
        type: 'Identity Proof',
        fileName: 'aadhaar_card_masked.pdf',
        fileSize: '1.2 MB',
        status: 'VERIFIED',
        uploadedAt: 'Active In Vault',
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

    // Pre-fill Document Title if user hasn't typed one
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

    const newDoc: VaultDoc = {
      id: `vault-${Date.now()}`,
      name: title,
      type: 'Official Document',
      fileName: selectedFile?.name || `${title.toLowerCase().replace(/\s+/g, '_')}.pdf`,
      fileSize: sizeInMb,
      status: 'VERIFIED',
      uploadedAt: 'Today',
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: isSimple ? '2.4rem' : '1.8rem', color: 'var(--color-primary-900)' }}>
            Digital Document Vault
          </h1>
          <p style={{ color: 'var(--color-neutral-600)', fontSize: isSimple ? '1.1rem' : '0.95rem', marginTop: '4px' }}>
            Store and reuse verified certificates to speed up all future government service applications.
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsUploadModalOpen(true)} icon={<Plus size={18} />}>
          Upload New Document
        </Button>
      </div>

      {documents.length === 0 ? (
        <EmptyState
          title="No Documents Uploaded"
          description="Your digital document vault is currently empty. Upload verified certificates for instant application reuse."
          actionText="Upload First Document"
          onAction={() => setIsUploadModalOpen(true)}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {documents.map((doc) => (
            <Card key={doc.id} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'var(--color-primary-100)', color: 'var(--color-primary-700)' }}>
                    <FileCheck size={22} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <StatusBadge status={doc.status} />
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
                  <h3 style={{ fontSize: isSimple ? '1.25rem' : '1.05rem', color: 'var(--color-neutral-900)' }}>
                    {doc.name}
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-neutral-500)', marginTop: '2px', display: 'block' }}>
                    {doc.type} • {doc.uploadedAt}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-neutral-200)', paddingTop: '12px' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--color-neutral-600)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                  {doc.fileName} {doc.fileSize ? `(${doc.fileSize})` : ''}
                </span>
                <Button variant="secondary" size="sm" onClick={() => handleDownloadDoc(doc)} icon={<Download size={14} />}>
                  Download
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* UPLOAD DOCUMENT MODAL */}
      <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title="Upload Document to Vault" maxWidth="560px">
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

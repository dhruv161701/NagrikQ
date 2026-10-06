import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { ToastContainer } from '../../components/ui/Toast';
import type { ToastMessage } from '../../components/ui/Toast';
import {
  Plus,
  Search,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Globe,
  Trash2,
  ListPlus,
  Building2,
  FileCheck,
  Tag,
  IndianRupee,
  Edit,
} from 'lucide-react';

interface DocumentRequirement {
  id?: string;
  selectedPreset: string;
  customName: string;
  instructions: string;
  isRequired: boolean;
}

interface ExtraStateDocument {
  state: string;
  selectedPreset: string;
  customName: string;
  instructions: string;
}

interface ServiceItem {
  id: string;
  name: string;
  code: string;
  category: string;
  description: string;
  processing_time_days: number;
  fee_amount: number;
  is_active: boolean;
  created_at: string;
  document_requirements?: { id: string; name: string; description?: string; is_required?: boolean }[];
}

const ALL_INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

const ALL_UNION_TERRITORIES = [
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi (NCT)',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

// Exactly 28 States + 8 UTs = 36 Indian Jurisdictions (Districts Removed)
const ALL_TARGET_LOCATIONS = [
  ...ALL_INDIAN_STATES,
  ...ALL_UNION_TERRITORIES,
];

// Comprehensive Research of Standard Government Documents in India
const STANDARD_INDIAN_DOCUMENTS = [
  'Aadhaar Card',
  'PAN Card',
  'Voter ID Card (EPIC)',
  'Ration Card (APL / BPL / AAY)',
  'Passport',
  'Driving License',
  'Income Certificate (Issued by Tehsildar/Mamlatdar)',
  'Caste Certificate (SC / ST / OBC / SEBC)',
  'Non-Creamy Layer (NCL) Certificate',
  'Domicile / Residence Certificate',
  'Birth Certificate',
  'Death Certificate',
  'Marriage Certificate',
  '7/12 Extract & 8A Land Record (Satbara Utara)',
  'Property Tax Receipt / Index II',
  'Form 16 / Salary Certificate / Income Tax Return (ITR)',
  'Bank Passbook / Statement (Last 6 Months)',
  'Electricity Bill (Recent 3 Months)',
  'Water Connection Bill',
  'LPG Gas Connection Booklet / Bill',
  'Disability Certificate / UDID Card',
  'Educational Marksheet / Passing Certificate (SSC/HSC/Degree)',
  'Passport Size Photograph (Recent Color Photo)',
  'Self-Declaration Affidavit (Notarized / Stamp Paper)',
  'Senior Citizen Identity Card',
  'Farmers Khatauni / Land Ownership Certificate',
  'Pension Passbook / PPO Number',
  'School Leaving Certificate / Transfer Certificate (LC/TC)',
  'Business Registration / Shop Act License / GST Registration',
  'EWS (Economically Weaker Section) Income & Asset Certificate',
  'NOC (No Objection Certificate) from Local Authority',
  'Medical Fitness Certificate (Registered Medical Practitioner)',
  'Solvency Certificate',
  'Other / Custom Document (Specify Manually)',
];

const SERVICE_CATEGORIES = [
  'Revenue',
  'Civil Supplies',
  'Social Welfare',
  'Transport',
  'Municipal & Civic',
  'Police & Security',
  'Labor & Employment',
  'General Administration',
];

export const SuperAdminServicesPage: React.FC = () => {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Toast State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State - Core Info
  const [serviceName, setServiceName] = useState('');
  const [serviceCode, setServiceCode] = useState('');
  const [category, setCategory] = useState('Revenue');
  const [description, setDescription] = useState('');
  const [processingTimeDays, setProcessingTimeDays] = useState<number>(7);
  const [feeAmount, setFeeAmount] = useState<number>(50);
  const [isActive, setIsActive] = useState<boolean>(true);

  // Form State - Documents Required
  const [documents, setDocuments] = useState<DocumentRequirement[]>([
    {
      selectedPreset: 'Aadhaar Card',
      customName: '',
      instructions: 'Self-attested photo copy / PDF scan under 2MB',
      isRequired: true,
    },
    {
      selectedPreset: 'Income Certificate (Issued by Tehsildar/Mamlatdar)',
      customName: '',
      instructions: 'Issued within current financial year',
      isRequired: true,
    },
  ]);

  // Form State - Scope & Offices (Only 28 States & 8 UTs)
  const [addToAllOffices, setAddToAllOffices] = useState(true);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>(ALL_TARGET_LOCATIONS);
  const [locationSearch, setLocationSearch] = useState('');
  const [locationFilterType, setLocationFilterType] = useState<'ALL' | 'STATES' | 'UTS'>('ALL');

  // Form State - Jurisdiction Customization Radio
  const [documentOption, setDocumentOption] = useState<'STANDARD' | 'STATE_SPECIFIC'>('STANDARD');
  const [extraStateDocuments, setExtraStateDocuments] = useState<ExtraStateDocument[]>([]);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/services?include_inactive=true');
      const responseData = await res.json();

      if (responseData.success && Array.isArray(responseData.data) && responseData.data.length > 0) {
        setServices(responseData.data);
      } else {
        const { data, error } = await supabase
          .from('services')
          .select('*, document_requirements(*)')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setServices(data || []);
      }
    } catch (err: any) {
      console.error('Error fetching global services:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditModal = (service: ServiceItem) => {
    setEditingService(service);
    setModalMode('EDIT');
    setServiceName(service.name);
    setServiceCode(service.code || '');
    setCategory(service.category);
    setDescription(service.description || '');
    setProcessingTimeDays(service.processing_time_days || 7);
    setFeeAmount(service.fee_amount || 0);
    setIsActive(service.is_active ?? true);

    // Populate required documents from existing service data
    if (service.document_requirements && service.document_requirements.length > 0) {
      const mappedDocs: DocumentRequirement[] = service.document_requirements.map((doc) => {
        const isStandard = STANDARD_INDIAN_DOCUMENTS.includes(doc.name);
        return {
          id: doc.id,
          selectedPreset: isStandard ? doc.name : 'Other / Custom Document (Specify Manually)',
          customName: isStandard ? '' : doc.name,
          instructions: doc.instructions || doc.description || '',
          isRequired: doc.is_required ?? true,
        };
      });
      setDocuments(mappedDocs);
    } else {
      setDocuments([
        {
          selectedPreset: 'Aadhaar Card',
          customName: '',
          instructions: 'Self-attested photo copy / PDF scan under 2MB',
          isRequired: true,
        },
      ]);
    }

    setAddToAllOffices(true);
    setSelectedDistricts(ALL_TARGET_LOCATIONS);
    setDocumentOption('STANDARD');
    setExtraStateDocuments([]);
    setError('');
    setSuccessMsg('');

    setIsModalOpen(true);
  };

  // Document Helpers
  const handleAddDocumentRow = () => {
    setDocuments([
      ...documents,
      {
        selectedPreset: STANDARD_INDIAN_DOCUMENTS[0],
        customName: '',
        instructions: '',
        isRequired: true,
      },
    ]);
  };

  const handleRemoveDocumentRow = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  const handleDocumentChange = (index: number, field: keyof DocumentRequirement, value: any) => {
    const updated = [...documents];
    updated[index] = { ...updated[index], [field]: value };
    setDocuments(updated);
  };

  // State-specific Document Helpers
  const handleAddExtraStateDocRow = () => {
    setExtraStateDocuments([
      ...extraStateDocuments,
      {
        state: 'Gujarat',
        selectedPreset: STANDARD_INDIAN_DOCUMENTS[0],
        customName: '',
        instructions: '',
      },
    ]);
  };

  const handleRemoveExtraStateDocRow = (index: number) => {
    setExtraStateDocuments(extraStateDocuments.filter((_, i) => i !== index));
  };

  const handleExtraStateDocChange = (index: number, field: keyof ExtraStateDocument, value: any) => {
    const updated = [...extraStateDocuments];
    updated[index] = { ...updated[index], [field]: value };
    setExtraStateDocuments(updated);
  };

  // State Selection Helpers
  const toggleDistrict = (locationName: string) => {
    if (selectedDistricts.includes(locationName)) {
      setSelectedDistricts(selectedDistricts.filter((d) => d !== locationName));
    } else {
      setSelectedDistricts([...selectedDistricts, locationName]);
    }
  };

  const handleSelectAllDistricts = () => {
    setSelectedDistricts(ALL_TARGET_LOCATIONS);
  };

  const handleDeselectAllDistricts = () => {
    setSelectedDistricts([]);
  };

  // Submit Handler (Create & Edit)
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!serviceName.trim()) {
      setError('Please enter a service name.');
      addToast('error', 'Validation Error', 'Service name is required.');
      return;
    }

    if (!addToAllOffices && selectedDistricts.length === 0) {
      setError('Please select at least one State or Union Territory.');
      addToast('error', 'Validation Error', 'Please select at least one target state or UT.');
      return;
    }

    // Process & validate required documents
    const processedDocs = documents
      .map((d) => {
        const finalName =
          d.selectedPreset === 'Other / Custom Document (Specify Manually)'
            ? d.customName.trim()
            : d.selectedPreset;
        return {
          name: finalName,
          instructions: d.instructions.trim(),
          isRequired: d.isRequired,
        };
      })
      .filter((d) => d.name !== '');

    if (processedDocs.length === 0) {
      setError('Please specify at least one required document.');
      addToast('error', 'Validation Error', 'At least one required document must be specified.');
      return;
    }

    // Process extra state documents
    const processedExtraStateDocs = extraStateDocuments
      .map((d) => {
        const finalName =
          d.selectedPreset === 'Other / Custom Document (Specify Manually)'
            ? d.customName.trim()
            : d.selectedPreset;
        return {
          state: d.state,
          name: finalName,
          instructions: d.instructions.trim(),
        };
      })
      .filter((d) => d.name !== '');

    try {
      setSubmitting(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || '';

      const isEdit = modalMode === 'EDIT';
      const endpoint = isEdit ? `/api/super-admin/services/${editingService?.id}` : '/api/super-admin/services';
      const method = isEdit ? 'PUT' : 'POST';

      const payload = {
        name: serviceName.trim(),
        code: serviceCode.trim() || undefined,
        category,
        description: description.trim(),
        processingTimeDays,
        feeAmount,
        isActive,
        documents: processedDocs,
        addToAllOffices,
        selectedDistricts: addToAllOffices ? ALL_TARGET_LOCATIONS : selectedDistricts,
        documentOption,
        extraStateDocuments: documentOption === 'STATE_SPECIFIC' ? processedExtraStateDocs : [],
      };

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const responseData = await res.json();

      if (!res.ok || !responseData.success) {
        throw new Error(responseData.error?.message || `Failed to ${isEdit ? 'update' : 'create'} global service.`);
      }

      const successDetail = isEdit
        ? `Service "${serviceName}" updated successfully with ${processedDocs.length} required documents.`
        : `Service "${serviceName}" created & published across ${responseData.data?.officeCount || 'all'} state offices.`;
      
      setSuccessMsg(successDetail);
      
      // Top Right Toast Notification
      addToast('success', isEdit ? 'Service Details Updated!' : 'Service Published Successfully!', successDetail);

      fetchServices();
      
      // Reset form after short pause
      setTimeout(() => {
        setIsModalOpen(false);
        resetForm();
      }, 1600);
    } catch (err: any) {
      const errMsg = err.message || 'An error occurred while saving service.';
      setError(errMsg);
      addToast('error', modalMode === 'EDIT' ? 'Service Update Failed' : 'Service Creation Failed', errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setServiceName('');
    setServiceCode('');
    setCategory('Revenue');
    setDescription('');
    setProcessingTimeDays(7);
    setFeeAmount(50);
    setIsActive(true);
    setModalMode('CREATE');
    setEditingService(null);
    setDocuments([
      {
        selectedPreset: 'Aadhaar Card',
        customName: '',
        instructions: 'Self-attested photo copy / PDF scan under 2MB',
        isRequired: true,
      },
      {
        selectedPreset: 'Income Certificate (Issued by Tehsildar/Mamlatdar)',
        customName: '',
        instructions: 'Issued within current financial year',
        isRequired: true,
      },
    ]);
    setAddToAllOffices(true);
    setSelectedDistricts(ALL_TARGET_LOCATIONS);
    setDocumentOption('STANDARD');
    setExtraStateDocuments([]);
    setError('');
    setSuccessMsg('');
  };

  // Filter Services
  const filteredServices = services.filter((srv) => {
    const matchesCategory = selectedCategory === 'All' || srv.category === selectedCategory;
    const matchesSearch =
      srv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      srv.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      srv.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-primary-900)', margin: 0 }}>
            Global Government Services Catalog
          </h1>
          <p style={{ color: 'var(--color-neutral-600)', margin: '4px 0 0 0', fontSize: '14px' }}>
            Only Super Admin can create, standardize, and configure government services across all Indian States & Union Territories.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: 600 }}
        >
          <Plus size={18} /> Add New Service
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <Card padding="16px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
              <Input
                placeholder="Search services by name, code, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '38px' }}
              />
              <Search
                size={18}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-neutral-400)',
                }}
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-neutral-600)', marginRight: '4px' }}>
              Categories:
            </span>
            <button
              onClick={() => setSelectedCategory('All')}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: 'none',
                backgroundColor: selectedCategory === 'All' ? 'var(--color-primary-700)' : 'var(--color-neutral-100)',
                color: selectedCategory === 'All' ? 'white' : 'var(--color-neutral-700)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              All ({services.length})
            </button>
            {SERVICE_CATEGORIES.map((cat) => {
              const count = services.filter((s) => s.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: 'none',
                    backgroundColor: selectedCategory === cat ? 'var(--color-primary-700)' : 'var(--color-neutral-100)',
                    color: selectedCategory === cat ? 'white' : 'var(--color-neutral-700)',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Services Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-neutral-500)' }}>
          Loading services catalog...
        </div>
      ) : filteredServices.length === 0 ? (
        <Card padding="40px" style={{ textAlign: 'center' }}>
          <FileText size={48} style={{ color: 'var(--color-neutral-300)', marginBottom: '12px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-neutral-700)', margin: '0 0 6px 0' }}>
            No Government Services Found
          </h3>
          <p style={{ color: 'var(--color-neutral-500)', fontSize: '14px', margin: 0 }}>
            {searchQuery || selectedCategory !== 'All'
              ? 'Try clearing your search query or category filter.'
              : 'Click "+ Add New Service" above to publish your first global government service.'}
          </p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {filteredServices.map((srv) => (
            <Card key={srv.id} padding="20px" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                {/* Badges row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Badge variant="neutral" style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                      {srv.code}
                    </Badge>
                    <Badge variant="info">{srv.category}</Badge>
                  </div>
                  <Badge variant={srv.is_active ? 'success' : 'warning'}>
                    {srv.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                </div>

                {/* Title */}
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-primary-900)', margin: '0 0 8px 0' }}>
                  {srv.name}
                </h3>

                {/* Description */}
                <p
                  style={{
                    fontSize: '13px',
                    color: 'var(--color-neutral-600)',
                    lineHeight: '1.5',
                    margin: '0 0 16px 0',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {srv.description}
                </p>

                {/* Key Details */}
                <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-neutral-700)' }}>
                    <Clock size={16} style={{ color: 'var(--color-accent-600)' }} />
                    <span>SLA: <strong>{srv.processing_time_days} Days</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-neutral-700)' }}>
                    <IndianRupee size={16} style={{ color: 'var(--color-success-600)' }} />
                    <span>Fee: <strong>{srv.fee_amount > 0 ? `₹${srv.fee_amount.toFixed(2)}` : 'FREE'}</strong></span>
                  </div>
                </div>

                {/* Required Documents Pill Summary */}
                <div style={{ backgroundColor: 'var(--color-neutral-50)', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--color-neutral-700)', marginBottom: '6px' }}>
                    <FileCheck size={14} style={{ color: 'var(--color-primary-700)' }} />
                    <span>Required Documents ({srv.document_requirements?.length || 0}):</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {srv.document_requirements && srv.document_requirements.length > 0 ? (
                      srv.document_requirements.map((doc) => (
                        <span
                          key={doc.id}
                          style={{
                            fontSize: '11px',
                            backgroundColor: 'white',
                            border: '1px solid var(--color-neutral-200)',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            color: 'var(--color-neutral-800)',
                          }}
                        >
                          {doc.name}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--color-neutral-400)', italic: 'true' }}>
                        No required documents specified
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Footer info */}
              <div style={{ paddingTop: '12px', borderTop: '1px solid var(--color-neutral-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--color-neutral-500)', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Globe size={14} style={{ color: 'var(--color-primary-600)' }} />
                  All-India Rollout
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenEditModal(srv)}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '4px 10px' }}
                >
                  <Edit size={13} /> Edit Service
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* CREATE / EDIT SERVICE MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (!submitting) setIsModalOpen(false);
        }}
        title={modalMode === 'EDIT' ? `Edit Service: ${editingService?.name}` : 'Create & Publish New Government Service'}
      >
        <form onSubmit={handleSaveService} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-danger-50)',
                border: '1px solid var(--color-danger-200)',
                color: 'var(--color-danger-700)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
              }}
            >
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-success-50)',
                border: '1px solid var(--color-success-200)',
                color: 'var(--color-success-700)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
              }}
            >
              <CheckCircle size={18} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* SECTION 1: CORE SERVICE DETAILS */}
          <div style={{ backgroundColor: 'var(--color-neutral-50)', padding: '16px', borderRadius: '10px', border: '1px solid var(--color-neutral-200)' }}>
            <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: 700, color: 'var(--color-primary-900)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Tag size={18} style={{ color: 'var(--color-primary-700)' }} />
              1. Basic Service Information
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-neutral-700)', marginBottom: '4px' }}>
                  Service Name <span style={{ color: 'red' }}>*</span>
                </label>
                <Input
                  placeholder="e.g. Income Certificate"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-neutral-700)', marginBottom: '4px' }}>
                  Service Code (Optional auto-gen)
                </label>
                <Input
                  placeholder="e.g. SRV-REV-1001"
                  value={serviceCode}
                  onChange={(e) => setServiceCode(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: modalMode === 'EDIT' ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-neutral-700)', marginBottom: '4px' }}>
                  Category <span style={{ color: 'red' }}>*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-neutral-300)',
                    fontSize: '14px',
                    backgroundColor: 'white',
                  }}
                >
                  {SERVICE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-neutral-700)', marginBottom: '4px' }}>
                  SLA / Processing (Days)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="180"
                  value={processingTimeDays}
                  onChange={(e) => setProcessingTimeDays(parseInt(e.target.value) || 1)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-neutral-700)', marginBottom: '4px' }}>
                  Service Fee (₹)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={feeAmount}
                  onChange={(e) => setFeeAmount(parseFloat(e.target.value) || 0)}
                />
              </div>

              {modalMode === 'EDIT' && (
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-neutral-700)', marginBottom: '4px' }}>
                    Service Status
                  </label>
                  <select
                    value={isActive ? 'ACTIVE' : 'INACTIVE'}
                    onChange={(e) => setIsActive(e.target.value === 'ACTIVE')}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-neutral-300)',
                      fontSize: '14px',
                      backgroundColor: 'white',
                    }}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-neutral-700)', marginBottom: '4px' }}>
                Service Description
              </label>
              <textarea
                placeholder="Provide details about the purpose of this service, eligibility, and expected output."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-neutral-300)',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>

          {/* SECTION 2: REQUIRED DOCUMENTS (SELECT FROM RESEARCHED LIST OR CUSTOM TEXT INPUT) */}
          <div style={{ backgroundColor: 'var(--color-neutral-50)', padding: '16px', borderRadius: '10px', border: '1px solid var(--color-neutral-200)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--color-primary-900)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ListPlus size={18} style={{ color: 'var(--color-primary-700)' }} />
                  2. Select Required Documents
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--color-neutral-500)' }}>
                  Choose from standard Indian government documents or select "Other / Custom Document" to type a custom name.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddDocumentRow}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
              >
                <Plus size={14} /> Add Document
              </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {documents.map((doc, idx) => {
                const isCustom = doc.selectedPreset === 'Other / Custom Document (Specify Manually)';

                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      backgroundColor: 'white',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-neutral-200)',
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: isCustom ? '2fr 2fr 2fr auto auto' : '3fr 3fr auto auto', gap: '10px', alignItems: 'center' }}>
                      {/* Document Dropdown */}
                      <select
                        value={doc.selectedPreset}
                        onChange={(e) => handleDocumentChange(idx, 'selectedPreset', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '9px 10px',
                          borderRadius: '8px',
                          border: '1px solid var(--color-neutral-300)',
                          fontSize: '13px',
                          backgroundColor: 'white',
                        }}
                      >
                        {STANDARD_INDIAN_DOCUMENTS.map((docName) => (
                          <option key={docName} value={docName}>
                            {docName}
                          </option>
                        ))}
                      </select>

                      {/* Custom Input if "Other" Selected */}
                      {isCustom && (
                        <Input
                          placeholder="Type Custom Document Name..."
                          value={doc.customName}
                          onChange={(e) => handleDocumentChange(idx, 'customName', e.target.value)}
                        />
                      )}

                      {/* Instructions Input */}
                      <Input
                        placeholder="Instructions / Submission Rules"
                        value={doc.instructions}
                        onChange={(e) => handleDocumentChange(idx, 'instructions', e.target.value)}
                      />

                      {/* Mandatory Checkbox */}
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        <input
                          type="checkbox"
                          checked={doc.isRequired}
                          onChange={(e) => handleDocumentChange(idx, 'isRequired', e.target.checked)}
                        />
                        Mandatory
                      </label>

                      {/* Trash Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveDocumentRow(idx)}
                        disabled={documents.length <= 1}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: documents.length <= 1 ? 'var(--color-neutral-300)' : 'var(--color-danger-600)',
                          cursor: documents.length <= 1 ? 'not-allowed' : 'pointer',
                          padding: '4px',
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: AVAILABILITY & DISTRIBUTION SCOPE (28 STATES & 8 UTs ONLY) */}
          <div style={{ backgroundColor: 'var(--color-neutral-50)', padding: '16px', borderRadius: '10px', border: '1px solid var(--color-neutral-200)' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 700, color: 'var(--color-primary-900)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={18} style={{ color: 'var(--color-primary-700)' }} />
              3. Service Distribution & Office Scope (28 States & 8 Union Territories)
            </h4>

            {/* State-wide Checkbox */}
            <div
              style={{
                backgroundColor: 'white',
                padding: '14px',
                borderRadius: '8px',
                border: '1px solid var(--color-neutral-300)',
                marginBottom: '14px',
              }}
            >
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={addToAllOffices}
                  onChange={(e) => {
                    setAddToAllOffices(e.target.checked);
                    if (e.target.checked) setSelectedDistricts(ALL_TARGET_LOCATIONS);
                  }}
                  style={{ width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer' }}
                />
                <div>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-primary-900)' }}>
                    Add this service to all state offices automatically (All 28 States & 8 UTs)
                  </span>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--color-neutral-600)' }}>
                    When enabled, this service will be immediately published across every State & Union Territory office in India.
                  </p>
                </div>
              </label>
            </div>

            {/* Manual Location & State Selector if State-wide is UNCHECKED */}
            {!addToAllOffices && (
              <div style={{ backgroundColor: 'white', padding: '14px', borderRadius: '8px', border: '1px solid var(--color-neutral-200)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary-900)' }}>
                    Select Target States & UTs ({selectedDistricts.length} of {ALL_TARGET_LOCATIONS.length} selected):
                  </span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={handleSelectAllDistricts}
                      style={{ background: 'none', border: 'none', color: 'var(--color-primary-700)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Select All
                    </button>
                    <span style={{ color: 'var(--color-neutral-300)' }}>|</span>
                    <button
                      type="button"
                      onClick={handleDeselectAllDistricts}
                      style={{ background: 'none', border: 'none', color: 'var(--color-danger-600)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                {/* Filter Tabs & Search for Indian States */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Search State or Union Territory (e.g. Maharashtra, Delhi, Gujarat)..."
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                    style={{
                      flex: 1,
                      minWidth: '220px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-neutral-300)',
                      fontSize: '12px',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {(['ALL', 'STATES', 'UTS'] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setLocationFilterType(tab)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          border: 'none',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          backgroundColor: locationFilterType === tab ? 'var(--color-primary-700)' : 'var(--color-neutral-100)',
                          color: locationFilterType === tab ? 'white' : 'var(--color-neutral-700)',
                        }}
                      >
                        {tab === 'ALL' ? 'All (36)' : tab === 'STATES' ? '28 States' : '8 Union Territories'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* List Grid - 28 States & 8 UTs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '8px', maxHeight: '220px', overflowY: 'auto', padding: '4px' }}>
                  {ALL_TARGET_LOCATIONS.filter((loc) => {
                    const matchesSearch = loc.toLowerCase().includes(locationSearch.toLowerCase());
                    if (!matchesSearch) return false;
                    if (locationFilterType === 'STATES') return ALL_INDIAN_STATES.includes(loc);
                    if (locationFilterType === 'UTS') return ALL_UNION_TERRITORIES.includes(loc);
                    return true;
                  }).map((locationName) => {
                    const isState = ALL_INDIAN_STATES.includes(locationName);
                    const isSelected = selectedDistricts.includes(locationName);

                    return (
                      <label
                        key={locationName}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          backgroundColor: isSelected ? 'var(--color-primary-50)' : 'var(--color-neutral-50)',
                          border: isSelected ? '1px solid var(--color-primary-300)' : '1px solid var(--color-neutral-200)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleDistrict(locationName)}
                          style={{ width: '15px', height: '15px', cursor: 'pointer' }}
                        />
                        <span style={{ fontWeight: isSelected ? 600 : 400, color: 'var(--color-neutral-900)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {locationName}
                        </span>
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            padding: '1px 4px',
                            borderRadius: '3px',
                            backgroundColor: isState ? 'var(--color-primary-100)' : 'var(--color-warning-100)',
                            color: isState ? 'var(--color-primary-800)' : 'var(--color-warning-800)',
                          }}
                        >
                          {isState ? 'STATE' : 'UT'}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 4: JURISDICTION DOCUMENT RULES WITH STATE DROPDOWN & DOCUMENT DROPDOWN */}
          <div style={{ backgroundColor: 'var(--color-neutral-50)', padding: '16px', borderRadius: '10px', border: '1px solid var(--color-neutral-200)' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 700, color: 'var(--color-primary-900)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileCheck size={18} style={{ color: 'var(--color-primary-700)' }} />
              4. Document Customization Rules for Specific States & UTs
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: 'white', padding: '14px', borderRadius: '8px', border: '1px solid var(--color-neutral-200)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="documentOption"
                  value="STANDARD"
                  checked={documentOption === 'STANDARD'}
                  onChange={() => setDocumentOption('STANDARD')}
                  style={{ width: '16px', height: '16px' }}
                />
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-neutral-800)' }}>
                    Use standard document checklist defined above for all selected States & UTs
                  </span>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="documentOption"
                  value="STATE_SPECIFIC"
                  checked={documentOption === 'STATE_SPECIFIC'}
                  onChange={() => setDocumentOption('STATE_SPECIFIC')}
                  style={{ width: '16px', height: '16px' }}
                />
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-neutral-800)' }}>
                    Add state or jurisdiction-specific extra required documents
                  </span>
                </div>
              </label>

              {/* Extra State Documents Builder with State & Document Dropdowns */}
              {documentOption === 'STATE_SPECIFIC' && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed var(--color-neutral-300)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-primary-800)' }}>
                      Extra State / UT Specific Required Documents:
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddExtraStateDocRow}
                      style={{ fontSize: '11px', padding: '4px 8px' }}
                    >
                      + Add State Document
                    </Button>
                  </div>

                  {extraStateDocuments.length === 0 ? (
                    <div style={{ fontSize: '12px', color: 'var(--color-neutral-500)', fontStyle: 'italic', textAlign: 'center', padding: '8px' }}>
                      Click "+ Add State Document" to add state-specific document requirements.
                    </div>
                  ) : (
                    extraStateDocuments.map((extDoc, idx) => {
                      const isCustom = extDoc.selectedPreset === 'Other / Custom Document (Specify Manually)';

                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: isCustom ? '1.5fr 2fr 2fr 2fr auto' : '1.5fr 3fr 2fr auto',
                            gap: '8px',
                            alignItems: 'center',
                            backgroundColor: 'var(--color-neutral-50)',
                            padding: '10px',
                            borderRadius: '6px',
                            border: '1px solid var(--color-neutral-200)',
                          }}
                        >
                          {/* State Select Dropdown */}
                          <select
                            value={extDoc.state}
                            onChange={(e) => handleExtraStateDocChange(idx, 'state', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              borderRadius: '6px',
                              border: '1px solid var(--color-neutral-300)',
                              fontSize: '12px',
                              backgroundColor: 'white',
                            }}
                          >
                            {ALL_TARGET_LOCATIONS.map((stateName) => (
                              <option key={stateName} value={stateName}>
                                {stateName}
                              </option>
                            ))}
                          </select>

                          {/* Document Select Dropdown */}
                          <select
                            value={extDoc.selectedPreset}
                            onChange={(e) => handleExtraStateDocChange(idx, 'selectedPreset', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              borderRadius: '6px',
                              border: '1px solid var(--color-neutral-300)',
                              fontSize: '12px',
                              backgroundColor: 'white',
                            }}
                          >
                            {STANDARD_INDIAN_DOCUMENTS.map((docName) => (
                              <option key={docName} value={docName}>
                                {docName}
                              </option>
                            ))}
                          </select>

                          {/* Custom Document Input if "Other" Selected */}
                          {isCustom && (
                            <Input
                              placeholder="Type Custom Document Name..."
                              value={extDoc.customName}
                              onChange={(e) => handleExtraStateDocChange(idx, 'customName', e.target.value)}
                            />
                          )}

                          {/* Instructions */}
                          <Input
                            placeholder="Instructions / Purpose"
                            value={extDoc.instructions}
                            onChange={(e) => handleExtraStateDocChange(idx, 'instructions', e.target.value)}
                          />

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveExtraStateDocRow(idx)}
                            style={{ background: 'none', border: 'none', color: 'var(--color-danger-600)', cursor: 'pointer', padding: '4px' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Footer Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '12px', borderTop: '1px solid var(--color-neutral-200)' }}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px' }}
            >
              {submitting
                ? modalMode === 'EDIT'
                  ? 'Saving Updates...'
                  : 'Publishing Service...'
                : modalMode === 'EDIT'
                ? 'Save Service Updates'
                : 'Create & Publish Global Service'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* TOP RIGHT CORNER TOAST NOTIFICATIONS */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

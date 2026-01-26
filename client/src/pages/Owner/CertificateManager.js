import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Award, 
  QrCode, 
  Download, 
  Eye, 
  Search, 
  Filter, 
  Plus,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Loader2,
  Shield,
  Gem,
  Scale,
  Calendar,
  DollarSign,
  User,
  Mail,
  Trash2,
  Phone
} from 'lucide-react';
import { toast } from '../../utils/toast';
import { sanitizeText, sanitizeEmail } from '../../utils/inputSanitizer';
import { authenticatedFetch } from '../../utils/auth';
import { useOwnerCertificates } from '../../hooks/useOwner';
import { useOwnerProducts } from '../../hooks/useOwner';
import { useAllUsers, useSearchUsers } from '../../hooks/useUser';

// shadcn/ui components
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';


const formatDateGregorian = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const CertificateManager = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [certificateToDelete, setCertificateToDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [downloadingCertificateId, setDownloadingCertificateId] = useState(null);

  // React Query hooks with caching
  const { data: certificatesData, isLoading: certificatesLoading, refetch: refetchCertificates } = useOwnerCertificates();
  
  // Only fetch products when modal is open or about to open (lazy loading for better performance)
  const { data: productsData, isLoading: productsLoading, refetch: refetchProducts } = useOwnerProducts('', {
    enabled: showCreateModal, // Only fetch when modal is open
    staleTime: 2 * 60 * 1000, // 2 minutes - matches backend cache
    gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache
  });
  
  const { data: usersData, isLoading: usersLoading } = useAllUsers();

  // Extract data from React Query responses
  const certificates = certificatesData?.certificates || [];
  const products = productsData?.products || [];
  const allUsers = usersData?.users || [];
  const customers = allUsers.filter(user => user.role === 'customer');
  
  // Refetch products when modal opens (only if data is stale or empty)
  useEffect(() => {
    if (showCreateModal) {
      // Refetch if no products loaded or if we want fresh data
      if (products.length === 0 && !productsLoading) {
        refetchProducts();
      }
    }
  }, [showCreateModal, products.length, productsLoading, refetchProducts]);
  
  const loading = certificatesLoading || usersLoading;

  // تصفية الشهادات
  const filteredCertificates = certificates.filter(cert => {
    const matchesSearch = 
      cert.certificateId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.jewelryDetails.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.customer?.username?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || cert.certificateDetails.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // إنشاء شهادة جديدة
  const handleCreateCertificate = async (certificateData) => {
    try {
      const response = await authenticatedFetch('/api/certificates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(certificateData)
      });
      
      if (response.ok) {
        const data = await response.json();
        refetchCertificates(); // Refresh certificates from React Query cache
        setShowCreateModal(false);
        
        // Show success message
        let message = data.message || 'Certificate created successfully';
        if (data.qrCodeUrl) {
          message += '\nQR Code generated successfully';
        } else if (data.error) {
          message += `\nWarning: ${data.error}`;
        }
        
        toast.success(message);
      } else {
        let errorMessage = 'Failed to create certificate';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          // If response is not JSON, use status text
          errorMessage = `${response.status}: ${response.statusText || 'Failed to create certificate'}`;
        }
        toast.error(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || 'An error occurred while creating the certificate. Please check your connection and try again.';
      toast.error(errorMessage);
    }
  };

  // تحديث حالة الشهادة
  const handleUpdateStatus = async (certificateId, status) => {
    try {
      const response = await authenticatedFetch(`/api/certificates/${certificateId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        refetchCertificates();
        toast.success('Certificate status updated successfully');
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to update certificate status');
      }
    } catch (error) {
      toast.error('An error occurred while updating certificate status');
    }
  };

  // الحصول على لون الحالة
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'expired': return '#F59E0B';
      case 'revoked': return '#EF4444';
      case 'transferred': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  // الحصول على نص الحالة
  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'نشطة';
      case 'expired': return 'منتهية الصلاحية';
      case 'revoked': return 'ملغاة';
      case 'transferred': return 'منقولة';
      default: return 'غير معروف';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50" dir="rtl">
      <div className="elegant-container py-6 px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Award className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold text-slate-900">إدارة الشهادات الرقمية</h1>
              </div>
            </div>
          </div>

          {/* Search and Filter Section */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="البحث في الشهادات..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
                
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <Filter className="h-4 w-4 ml-2" />
                    <SelectValue placeholder="جميع الحالات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="active">نشطة</SelectItem>
                    <SelectItem value="expired">منتهية الصلاحية</SelectItem>
                    <SelectItem value="revoked">ملغاة</SelectItem>
                    <SelectItem value="transferred">منقولة</SelectItem>
                  </SelectContent>
                </Select>

                <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  إنشاء شهادة جديدة
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Certificates List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-slate-600">جاري تحميل الشهادات...</p>
            </div>
          ) : filteredCertificates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Award className="h-16 w-16 text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">لا توجد شهادات</h3>
                <p className="text-slate-600 mb-4">ابدأ بإنشاء شهادة جديدة لأحد منتجاتك</p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 ml-2" />
                  إنشاء شهادة جديدة
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCertificates.map(certificate => (
                <Card key={certificate._id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-primary" />
                        <CardTitle className="text-sm font-mono">{certificate.certificateId}</CardTitle>
                      </div>
                      <Badge 
                        style={{ backgroundColor: getStatusColor(certificate.certificateDetails.status) }}
                        className="text-white"
                      >
                        {getStatusText(certificate.certificateDetails.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg text-slate-900 mb-3">
                        {certificate.jewelryDetails.name}
                      </h3>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">المادة:</span>
                          <span className="font-medium">{certificate.jewelryDetails.material}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">العيار:</span>
                          <span className="font-medium">{certificate.jewelryDetails.karat}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">الوزن:</span>
                          <span className="font-medium">{certificate.jewelryDetails.weight}غ</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">العميل:</span>
                          <span className="font-medium">{certificate.customer?.username || 'غير محدد'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">تاريخ الإصدار:</span>
                          <span className="font-medium">
                            {formatDateGregorian(certificate.certificateDetails.issueDate)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-4 border-t border-slate-200">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedCertificate(certificate);
                          setShowDetailsModal(true);
                        }}
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 ml-2" />
                        عرض
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedCertificate(certificate);
                          setShowQRModal(true);
                        }}
                        className="flex-1"
                      >
                        <QrCode className="h-4 w-4 ml-2" />
                        QR
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={downloadingCertificateId === certificate.certificateId}
                        onClick={async () => {
                          setDownloadingCertificateId(certificate.certificateId);
                          try {
                            const response = await authenticatedFetch(`/api/certificates/${certificate.certificateId}/download`);
                            
                            if (response.ok) {
                              const contentType = response.headers.get('content-type');
                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              
                              if (contentType && contentType.includes('application/pdf')) {
                                link.download = `certificate-${certificate.certificateId}.pdf`;
                              } else {
                                link.download = `certificate-${certificate.certificateId}.html`;
                              }
                              
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              window.URL.revokeObjectURL(url);
                              toast.success('تم تحميل الشهادة بنجاح');
                            } else {
                              const errorData = await response.json().catch(() => ({}));
                              const errorMessage = errorData.message || 'فشل في تحميل الشهادة';
                              toast.error(`خطأ: ${errorMessage}`);
                            }
                          } catch (error) {
                            toast.error('حدث خطأ أثناء تحميل الشهادة. تأكد من اتصال الإنترنت.');
                          } finally {
                            setDownloadingCertificateId(null);
                          }
                        }}
                      >
                        {downloadingCertificateId === certificate.certificateId ? (
                          <>
                            <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                            جاري التحميل...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 ml-2" />
                            تحميل
                          </>
                        )}
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCertificateToDelete(certificate);
                          setDeleteConfirmText('');
                          setShowDeleteModal(true);
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      >
                        <Trash2 className="h-4 w-4 ml-2" />
                        حذف
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Create Certificate Modal */}
          {showCreateModal && (
            <CreateCertificateModal
              products={products}
              customers={customers}
              onCreate={handleCreateCertificate}
              onClose={() => setShowCreateModal(false)}
              isLoadingProducts={productsLoading}
            />
          )}

          {/* Certificate Details Modal */}
          {showDetailsModal && selectedCertificate && (
            <CertificateDetailsModal
              certificate={selectedCertificate}
              onClose={() => setShowDetailsModal(false)}
              onUpdateStatus={handleUpdateStatus}
            />
          )}

          {/* QR Code Modal */}
          {showQRModal && selectedCertificate && (
            <QRCodeModal
              certificate={selectedCertificate}
              onClose={() => setShowQRModal(false)}
            />
          )}

          {/* Delete Certificate Confirmation Modal */}
          {showDeleteModal && certificateToDelete && (
            <DeleteCertificateModal
              certificate={certificateToDelete}
              confirmText={deleteConfirmText}
              onConfirmTextChange={setDeleteConfirmText}
              onConfirm={async () => {
                if (deleteConfirmText !== certificateToDelete.certificateId) {
                  toast.error('لم يتم إدخال معرف الشهادة بشكل صحيح');
                  return;
                }
                
                setIsDeleting(true);
                try {
                  const response = await authenticatedFetch(`/api/certificates/${certificateToDelete.certificateId}`, {
                    method: 'DELETE'
                  });
                  
                  if (response.ok) {
                    toast.success('تم حذف الشهادة بنجاح');
                    setShowDeleteModal(false);
                    setCertificateToDelete(null);
                    setDeleteConfirmText('');
                    refetchCertificates(); // Refresh the list
                  } else {
                    const errorData = await response.json().catch(() => ({}));
                    toast.error(errorData.message || 'فشل حذف الشهادة');
                  }
                } catch (error) {
                  toast.error('حدث خطأ أثناء حذف الشهادة');
                } finally {
                  setIsDeleting(false);
                }
              }}
              onClose={() => {
                setShowDeleteModal(false);
                setCertificateToDelete(null);
                setDeleteConfirmText('');
              }}
              isDeleting={isDeleting}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// مكون إنشاء شهادة جديدة
const CreateCertificateModal = ({ products, customers, onCreate, onClose, isLoadingProducts = false }) => {
  const [formData, setFormData] = useState({
    productId: '',
    customerId: '',
    purchaseDetails: {
      purchaseDate: new Date().toISOString().split('T')[0],
      invoiceNumber: '',
      paymentMethod: 'cash'
    },
    additionalInfo: {
      craftsmanship: '',
      origin: '',
      hallmarks: []
    }
  });

  // Customer email search state (for registered users)
  const [customerEmail, setCustomerEmail] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  
  // Use React Query for customer search (debounced via hook)
  const searchQuery = customerEmail.trim().length >= 2 && !selectedCustomer ? customerEmail.trim() : '';
  const { data: customerSearchData, isLoading: isSearchingCustomers } = useSearchUsers(searchQuery, {
    enabled: customerEmail.trim().length >= 2 && !selectedCustomer
  });
  
  const customerSearchResults = useMemo(() => customerSearchData?.users || [], [customerSearchData]);

  // Customer phone state (for unregistered customers)
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');

  // Product search state
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Validation errors state
  const [validationErrors, setValidationErrors] = useState({});
  
  // Filter products locally based on search query
  const filteredProducts = useMemo(() => {
    if (!productSearchQuery.trim()) {
      return products;
    }
    const searchLower = productSearchQuery.toLowerCase();
    return products.filter(product => {
      const name = product.name?.toLowerCase() || '';
      const productId = (product._id || product.id || '').toString().toLowerCase();
      return name.includes(searchLower) || productId.includes(searchLower);
    });
  }, [products, productSearchQuery]);

  // Refs for dropdowns
  const customerSearchRef = useRef(null);
  const productSearchRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (customerSearchRef.current && !customerSearchRef.current.contains(event.target)) {
        setShowCustomerResults(false);
      }
      if (productSearchRef.current && !productSearchRef.current.contains(event.target)) {
        setShowProductDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Show customer search results when available
  useEffect(() => {
    if (selectedCustomer) {
      setShowCustomerResults(false);
      return;
    }
    
    if (customerEmail.trim().length >= 2 && customerSearchResults.length > 0) {
      setShowCustomerResults(true);
    } else {
      setShowCustomerResults(false);
    }
  }, [customerEmail, customerSearchResults, selectedCustomer]);


  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setFormData(prev => ({ ...prev, customerId: customer._id }));
    setCustomerEmail(customer.email);
    // Close dropdown
    setShowCustomerResults(false);
    // Don't clear phone - allow both email and phone
    // Clear validation errors
    setValidationErrors(prev => ({ 
      ...prev, 
      customer: null, 
      customerEmail: null, 
      customerPhone: null,
      customerName: null 
    }));
  };

  const handleEmailChange = (value) => {
    // Sanitize email input
    const sanitized = sanitizeEmail(value) || value.trim();
    setCustomerEmail(sanitized);
    
    // Only clear selected customer if email is being changed manually (not from search selection)
    // If user clears the email field, we still keep selectedCustomer if there is one
    // This allows both email (from selected customer) and phone to coexist
    if (!sanitized.trim() && selectedCustomer) {
      // Only clear if field is empty and user manually cleared it
      // Otherwise, keep selected customer even if typing in email field
    } else if (sanitized.trim() && sanitized !== (selectedCustomer?.email || '')) {
      // User is typing a different email, clear selection
      setSelectedCustomer(null);
      setFormData(prev => ({ ...prev, customerId: '' }));
    }
    
    // Validate and clear error on change
    if (sanitized.trim()) {
      const error = validateEmail(sanitized);
      setValidationErrors(prev => ({ ...prev, customerEmail: error || null }));
    } else {
      setValidationErrors(prev => ({ ...prev, customerEmail: null }));
    }
    
    // Close dropdown when user starts typing
    setShowCustomerResults(false);
  };

  // Validation functions
  const validatePhone = (phone) => {
    if (!phone) return null;
    // Remove spaces and dashes for validation
    const cleaned = phone.replace(/[\s()-]/g, '');
    // Check if it's a valid phone format (7-15 digits, optional + prefix)
    const phoneRegex = /^\+?[0-9]{7,15}$/;
    if (!phoneRegex.test(cleaned)) {
      return 'Phone number must be 7-15 digits (with optional + prefix)';
    }
    return null;
  };

  const validateEmail = (email) => {
    if (!email) return null;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      return 'Invalid email format';
    }
    return null;
  };

  const validateInvoiceNumber = (invoiceNumber) => {
    if (!invoiceNumber) return null; // Optional field
    // Sanitize and validate length (max 100 characters)
    if (invoiceNumber.length > 100) {
      return 'Invoice number must be less than 100 characters';
    }
    // Allow alphanumeric, spaces, dashes, underscores, and common invoice characters
    const invoiceRegex = /^[a-zA-Z0-9\s_/#-]+$/;
    if (!invoiceRegex.test(invoiceNumber)) {
      return 'Invoice number contains invalid characters';
    }
    return null;
  };

  const validateCustomerName = (name) => {
    if (!name) return null; // Optional field
    // Max 100 characters, allow letters, numbers, spaces, and common name characters
    if (name.length > 100) {
      return 'Customer name must be less than 100 characters';
    }
    // Allow letters (including Arabic), numbers, spaces, hyphens, and apostrophes
    const nameRegex = /^[\p{L}\p{N}\s\-'']+$/u;
    if (!nameRegex.test(name)) {
      return 'Customer name contains invalid characters';
    }
    return null;
  };

  const validatePurchaseDate = (date) => {
    if (!date) return 'Purchase date is required';
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    // Date should not be in the future
    if (selectedDate > today) {
      return 'Purchase date cannot be in the future';
    }
    
    // Date should not be too old (more than 100 years ago)
    const hundredYearsAgo = new Date();
    hundredYearsAgo.setFullYear(today.getFullYear() - 100);
    if (selectedDate < hundredYearsAgo) {
      return 'Purchase date is too old';
    }
    return null;
  };

  const validateForm = () => {
    const errors = {};

    // Validate product
    if (!selectedProduct && !formData.productId) {
      errors.product = 'Product selection is required';
    }

    // Validate customer - at least one of customerId (registered), email, or phone must be provided
    const hasRegisteredCustomer = selectedCustomer && formData.customerId;
    const hasEmail = (selectedCustomer && selectedCustomer.email) || customerEmail.trim();
    const hasPhone = customerPhone.trim();
    
    if (!hasRegisteredCustomer && !hasEmail && !hasPhone) {
      errors.customer = 'Please provide at least one: customer email or phone number';
    } else {
      // Validate email if provided (either from selected customer or manual entry)
      if (customerEmail.trim() && !selectedCustomer) {
        // Only validate if email is manually entered (not from selected customer)
        const emailError = validateEmail(customerEmail);
        if (emailError) {
          errors.customerEmail = emailError;
        }
      } else if (customerEmail.trim() && selectedCustomer && customerEmail !== selectedCustomer.email) {
        // Validate if email was manually changed from selected customer's email
        const emailError = validateEmail(customerEmail);
        if (emailError) {
          errors.customerEmail = emailError;
        }
      }
      
      // Validate phone if provided
      if (customerPhone.trim()) {
        const phoneError = validatePhone(customerPhone);
        if (phoneError) {
          errors.customerPhone = phoneError;
        }
      }
    }

    // Validate customer name
    if (customerName.trim()) {
      const nameError = validateCustomerName(customerName);
      if (nameError) {
        errors.customerName = nameError;
      }
    }

    // Validate purchase date
    const dateError = validatePurchaseDate(formData.purchaseDetails.purchaseDate);
    if (dateError) {
      errors.purchaseDate = dateError;
    }

    // Validate invoice number
    if (formData.purchaseDetails.invoiceNumber) {
      const invoiceError = validateInvoiceNumber(formData.purchaseDetails.invoiceNumber);
      if (invoiceError) {
        errors.invoiceNumber = invoiceError;
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePhoneChange = (value) => {
    // Sanitize phone input (allow only digits, spaces, dashes, parentheses, and +)
    const sanitized = value.replace(/[^0-9\s()+/-]/g, '');
    setCustomerPhone(sanitized);
    
    // Validate and clear error on change
    if (sanitized.trim()) {
      const error = validatePhone(sanitized);
      setValidationErrors(prev => ({ ...prev, customerPhone: error || null }));
    } else {
      setValidationErrors(prev => ({ ...prev, customerPhone: null }));
    }
    
    // Don't clear email/customer - allow both to coexist
    // Clear validation errors for customer when phone is entered
    setValidationErrors(prev => ({ 
      ...prev, 
      customer: null 
    }));
  };

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setFormData(prev => ({ ...prev, productId: product._id }));
    setProductSearchQuery(`${product.name} - ${product.material} - ${product.karat || product.carat} عيار`);
    setShowProductDropdown(false);
    // Clear product validation error
    setValidationErrors(prev => ({ ...prev, product: null }));
  };

  const handleProductSearchChange = (e) => {
    const value = e?.target?.value || '';
    setProductSearchQuery(value);
    // Clear selection if user changes the text
    if (selectedProduct) {
      const expectedText = `${selectedProduct.name} - ${selectedProduct.material} - ${selectedProduct.karat || selectedProduct.carat} عيار`;
      if (value !== expectedText) {
        setSelectedProduct(null);
        setFormData(prev => ({ ...prev, productId: '' }));
      }
    }
    setShowProductDropdown(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate all fields
    if (!validateForm()) {
      // Show first error
      const firstError = Object.values(validationErrors)[0];
      if (firstError) {
        toast.error(firstError);
      }
      return;
    }
    
    // Sanitize and prepare the data to send
    // Determine email value: use from selectedCustomer or manual entry
    const finalEmail = selectedCustomer?.email || customerEmail.trim() || null;
    
    const submitData = {
      ...formData,
      purchaseDetails: {
        ...formData.purchaseDetails,
        invoiceNumber: formData.purchaseDetails.invoiceNumber 
          ? sanitizeText(formData.purchaseDetails.invoiceNumber, 100).trim() || null
          : null
      },
      additionalInfo: {
        ...formData.additionalInfo,
        // Include customer info if phone or email is provided (at least one must be present)
        ...((customerPhone.trim() || finalEmail) ? {
          customerPhone: customerPhone.trim() 
            ? customerPhone.trim().replace(/[\s()-]/g, '') // Remove formatting for storage
            : null,
          customerEmail: finalEmail || null,
          customerName: customerName.trim() 
            ? sanitizeText(customerName.trim(), 100) 
            : null
        } : {})
      }
    };
    
    onCreate(submitData);
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Plus className="h-6 w-6 text-primary" />
            إنشاء شهادة جديدة
          </DialogTitle>
          <DialogDescription>
            قم بإنشاء شهادة رقمية جديدة لأحد منتجاتك
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                معلومات الشهادة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* المنتج */}
              <div className="space-y-2">
                <Label htmlFor="productSearch" className="text-sm font-semibold">
                  المنتج <span className="text-red-500">*</span>
                </Label>
                <div className="relative" ref={productSearchRef}>
                  <Input
                    id="productSearch"
                    type="text"
                    value={productSearchQuery}
                    onChange={handleProductSearchChange}
                    onFocus={() => setShowProductDropdown(true)}
                    placeholder="Search or select product..."
                    className={`${selectedProduct ? 'bg-green-50 border-green-300' : ''} ${validationErrors.product ? 'border-red-500' : ''}`}
                    required
                  />
                  {validationErrors.product && (
                    <p className="text-xs text-red-600 mt-1">{validationErrors.product}</p>
                  )}
                  
                  {/* Product Dropdown */}
                  {showProductDropdown && (
                    <div className="absolute z-[100] w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {isLoadingProducts ? (
                        <div className="px-4 py-3 text-sm text-slate-500 text-center">
                          <Loader2 className="h-4 w-4 animate-spin inline-block ml-2" />
                          جاري تحميل المنتجات...
                        </div>
                      ) : filteredProducts.length > 0 ? (
                        filteredProducts.map(product => (
                          <div
                            key={product._id}
                            onClick={() => handleProductSelect(product)}
                            className={`px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors ${
                              selectedProduct?._id === product._id ? 'bg-primary/10' : ''
                            }`}
                          >
                            {product.name} - {product.material} - {(product.karat || product.carat)} عيار
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-slate-500 text-center">
                          لا توجد منتجات
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Email */}
              <div className="space-y-2">
                <Label htmlFor="customerEmail" className="text-sm font-semibold">
                  Customer Email
                </Label>
                <div className="relative" ref={customerSearchRef}>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    onFocus={() => {
                      // Show results if we have search query and results
                      if (customerEmail.trim().length >= 2 && customerSearchResults.length > 0) {
                        setShowCustomerResults(true);
                      }
                    }}
                    placeholder="Search customer by email or enter email..."
                    className={`${selectedCustomer ? 'bg-green-50 border-green-300' : ''} ${validationErrors.customerEmail ? 'border-red-500' : ''}`}
                    maxLength={255}
                  />
                  {validationErrors.customerEmail && (
                    <p className="text-xs text-red-600 mt-1">{validationErrors.customerEmail}</p>
                  )}
                  {validationErrors.customer && (
                    <p className="text-xs text-red-600 mt-1">{validationErrors.customer}</p>
                  )}
                  {isSearchingCustomers && (
                    <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-slate-400 z-20" />
                  )}
                  
                  {/* Search Results Dropdown */}
                  {showCustomerResults && !selectedCustomer && customerSearchResults.length > 0 && (
                    <div className="absolute z-[100] w-full mt-2 top-full left-0 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {customerSearchResults.map(customer => (
                        <div
                          key={customer._id}
                          onClick={() => handleCustomerSelect(customer)}
                          className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors"
                        >
                          <div className="font-semibold text-slate-900">{customer.username}</div>
                          <div className="text-sm text-slate-600">{customer.email}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Selected Customer Display */}
                  {selectedCustomer && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <span className="font-semibold text-green-900">
                          Registered Customer: {selectedCustomer.username} ({selectedCustomer.email})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(null);
                          setCustomerEmail('');
                          setFormData(prev => ({ ...prev, customerId: '' }));
                          setShowCustomerResults(false);
                        }}
                        className="mt-2 text-xs text-green-700 hover:text-green-900 underline"
                      >
                        Clear selection
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Phone */}
              <div className="space-y-2">
                <Label htmlFor="customerPhone" className="text-sm font-semibold">
                  Customer Phone
                </Label>
                <div className="space-y-2">
                  <Input
                    id="customerPhone"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="Enter phone number (e.g., +1234567890)"
                    className={`w-full ${validationErrors.customerPhone ? 'border-red-500' : ''}`}
                    maxLength={20}
                  />
                  {validationErrors.customerPhone && (
                    <p className="text-xs text-red-600 mt-1">{validationErrors.customerPhone}</p>
                  )}
                  <Input
                    id="customerName"
                    type="text"
                    value={customerName}
                    onChange={(e) => {
                      const sanitized = sanitizeText(e.target.value, 100);
                      setCustomerName(sanitized);
                      const error = validateCustomerName(sanitized);
                      setValidationErrors(prev => ({ ...prev, customerName: error || null }));
                    }}
                    placeholder="Customer name (optional)"
                    className={`w-full ${validationErrors.customerName ? 'border-red-500' : ''}`}
                    maxLength={100}
                  />
                  {validationErrors.customerName && (
                    <p className="text-xs text-red-600 mt-1">{validationErrors.customerName}</p>
                  )}
                  {validationErrors.customer && (
                    <p className="text-xs text-red-600 mt-1">{validationErrors.customer}</p>
                  )}
                  <p className="text-xs text-slate-500">At least one of email or phone is required</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                تفاصيل الشراء
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* تاريخ الشراء */}
              <div className="space-y-2">
                <Label htmlFor="purchaseDate" className="text-sm font-semibold">
                  تاريخ الشراء <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="purchaseDate"
                  type="date"
                  value={formData.purchaseDetails.purchaseDate}
                  onChange={(e) => {
                    setFormData(prev => ({
                      ...prev,
                      purchaseDetails: { ...prev.purchaseDetails, purchaseDate: e.target.value }
                    }));
                    const error = validatePurchaseDate(e.target.value);
                    setValidationErrors(prev => ({ ...prev, purchaseDate: error || null }));
                  }}
                  required
                  className={`w-full ${validationErrors.purchaseDate ? 'border-red-500' : ''}`}
                  max={new Date().toISOString().split('T')[0]} // Cannot select future dates
                />
                {validationErrors.purchaseDate && (
                  <p className="text-xs text-red-600 mt-1">{validationErrors.purchaseDate}</p>
                )}
              </div>

              {/* رقم الفاتورة */}
              <div className="space-y-2">
                <Label htmlFor="invoiceNumber" className="text-sm font-semibold">
                  رقم الفاتورة
                </Label>
                <Input
                  id="invoiceNumber"
                  type="text"
                  placeholder="رقم الفاتورة (اختياري)"
                  value={formData.purchaseDetails.invoiceNumber}
                  onChange={(e) => {
                    const sanitized = sanitizeText(e.target.value, 100);
                    setFormData(prev => ({
                      ...prev,
                      purchaseDetails: { ...prev.purchaseDetails, invoiceNumber: sanitized }
                    }));
                    const error = validateInvoiceNumber(sanitized);
                    setValidationErrors(prev => ({ ...prev, invoiceNumber: error || null }));
                  }}
                  className={`w-full ${validationErrors.invoiceNumber ? 'border-red-500' : ''}`}
                  maxLength={100}
                />
                {validationErrors.invoiceNumber && (
                  <p className="text-xs text-red-600 mt-1">{validationErrors.invoiceNumber}</p>
                )}
              </div>

              {/* طريقة الدفع */}
              <div className="space-y-2">
                <Label htmlFor="paymentMethod" className="text-sm font-semibold">
                  طريقة الدفع
                </Label>
                <Select
                  value={formData.purchaseDetails.paymentMethod}
                  onValueChange={(value) => setFormData(prev => ({
                    ...prev,
                    purchaseDetails: { ...prev.purchaseDetails, paymentMethod: value }
                  }))}
                >
                  <SelectTrigger id="paymentMethod" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">نقداً</SelectItem>
                    <SelectItem value="card">بطاقة ائتمان</SelectItem>
                    <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                    <SelectItem value="installments">أقساط</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose}>
              إلغاء
            </Button>
            <Button type="submit" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              إنشاء الشهادة
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// مكون تفاصيل الشهادة
const CertificateDetailsModal = ({ certificate, onClose, onUpdateStatus }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loadingQR, setLoadingQR] = useState(true);

  useEffect(() => {
    setLoadingQR(true);
    authenticatedFetch(`/api/certificates/${certificate.certificateId}`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        if (data.certificate?.qrCodeUrl || data.qrCodeUrl) {
          setQrCodeUrl(data.certificate?.qrCodeUrl || data.qrCodeUrl);
        } else if (data.error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('QR Code generation error:', data.error);
          }
          setQrCodeUrl(null);
        }
      })
      .catch(err => {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching QR code:', err);
        }
        setQrCodeUrl(null);
      })
      .finally(() => setLoadingQR(false));
  }, [certificate.certificateId]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'expired': return '#F59E0B';
      case 'revoked': return '#EF4444';
      case 'transferred': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'نشطة';
      case 'expired': return 'منتهية الصلاحية';
      case 'revoked': return 'ملغاة';
      case 'transferred': return 'منقولة';
      default: return 'غير معروف';
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Award className="h-6 w-6 text-primary" />
            تفاصيل الشهادة
          </DialogTitle>
          <DialogDescription>
            معلومات كاملة عن الشهادة الرقمية
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* معلومات الشهادة */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                معلومات الشهادة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-slate-400" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-600">رقم الشهادة</p>
                    <p className="font-semibold font-mono">{certificate.certificateId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-slate-400" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-600">رمز التحقق</p>
                    <p className="font-semibold">{certificate.certificateDetails.verificationCode}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-slate-400" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-600">تاريخ الإصدار</p>
                    <p className="font-semibold">
                      {formatDateGregorian(certificate.certificateDetails.issueDate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-slate-400" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-600">الحالة</p>
                    <Badge 
                      style={{ backgroundColor: getStatusColor(certificate.certificateDetails.status) }}
                      className="text-white"
                    >
                      {getStatusText(certificate.certificateDetails.status)}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* تفاصيل القطعة */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Gem className="h-5 w-5 text-primary" />
                تفاصيل القطعة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Gem className="h-5 w-5 text-slate-400" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-600">الاسم</p>
                    <p className="font-semibold">{certificate.jewelryDetails.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Gem className="h-5 w-5 text-slate-400" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-600">المادة</p>
                    <p className="font-semibold">{certificate.jewelryDetails.material}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Scale className="h-5 w-5 text-slate-400" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-600">العيار</p>
                    <p className="font-semibold">{certificate.jewelryDetails.karat}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Scale className="h-5 w-5 text-slate-400" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-600">الوزن</p>
                    <p className="font-semibold">{certificate.jewelryDetails.weight} غرام</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* تفاصيل الشراء */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                تفاصيل الشراء
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-slate-400" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-600">تاريخ الشراء</p>
                    <p className="font-semibold">
                      {formatDateGregorian(certificate.purchaseDetails.purchaseDate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-slate-400" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-600">السعر (USD)</p>
                    <p className="font-semibold text-blue-700">${certificate.purchaseDetails.purchasePrice.usd}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-slate-400" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-600">السعر (SYP)</p>
                    <p className="font-semibold text-green-700">
                      {Number(certificate.purchaseDetails.purchasePrice.syp).toLocaleString()} ل.س
                    </p>
                  </div>
                </div>
                {certificate.purchaseDetails.paymentMethod && (
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-slate-400" />
                    <div className="flex-1">
                      <p className="text-sm text-slate-600">طريقة الدفع</p>
                      <p className="font-semibold">{certificate.purchaseDetails.paymentMethod}</p>
                    </div>
                  </div>
                )}
                {certificate.purchaseDetails.invoiceNumber && (
                  <div className="flex items-center gap-3">
                    <Award className="h-5 w-5 text-slate-400" />
                    <div className="flex-1">
                      <p className="text-sm text-slate-600">رقم الفاتورة</p>
                      <p className="font-semibold">{certificate.purchaseDetails.invoiceNumber}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* معلومات العميل */}
          {(certificate.customer || certificate.customerInfo) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  معلومات العميل
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Registered Customer Info */}
                  {certificate.customer && (
                    <>
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-slate-400" />
                        <div className="flex-1">
                          <p className="text-sm text-slate-600">اسم المستخدم</p>
                          <p className="font-semibold">
                            {certificate.customer.username || 
                             (certificate.customer.email ? certificate.customer.email.split('@')[0] : 'غير محدد')}
                          </p>
                        </div>
                      </div>
                      {certificate.customer.email && (
                        <div className="flex items-center gap-3">
                          <Mail className="h-5 w-5 text-slate-400" />
                          <div className="flex-1">
                            <p className="text-sm text-slate-600">البريد الإلكتروني</p>
                            <p className="font-semibold">{certificate.customer.email}</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  
                  {/* Customer Info (phone, email, name) - Only show if different from registered customer */}
                  {certificate.customerInfo && (
                    <>
                      {certificate.customerInfo.phone && (
                        <div className="flex items-center gap-3">
                          <Phone className="h-5 w-5 text-slate-400" />
                          <div className="flex-1">
                            <p className="text-sm text-slate-600">رقم الهاتف</p>
                            <p className="font-semibold">{certificate.customerInfo.phone}</p>
                          </div>
                        </div>
                      )}
                      {/* Only show email from customerInfo if it's different from registered customer email */}
                      {certificate.customerInfo.email && 
                       (!certificate.customer || certificate.customerInfo.email !== certificate.customer.email) && (
                        <div className="flex items-center gap-3">
                          <Mail className="h-5 w-5 text-slate-400" />
                          <div className="flex-1">
                            <p className="text-sm text-slate-600">البريد الإلكتروني</p>
                            <p className="font-semibold">{certificate.customerInfo.email}</p>
                          </div>
                        </div>
                      )}
                      {/* Only show name from customerInfo if there's no registered customer or if it's different */}
                      {certificate.customerInfo.name && 
                       (!certificate.customer || !certificate.customer.username || certificate.customerInfo.name !== certificate.customer.username) && (
                        <div className="flex items-center gap-3">
                          <User className="h-5 w-5 text-slate-400" />
                          <div className="flex-1">
                            <p className="text-sm text-slate-600">اسم العميل</p>
                            <p className="font-semibold">{certificate.customerInfo.name}</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* QR Code */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <QrCode className="h-5 w-5 text-primary" />
                رمز QR للتحقق
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingQR ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                  <p className="text-slate-600">جاري تحميل QR Code...</p>
                </div>
              ) : qrCodeUrl ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 bg-white rounded-lg border border-slate-200">
                    <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                  </div>
                  <p className="text-sm text-slate-600 text-center">
                    امسح هذا الرمز للتحقق من صحة الشهادة
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
                  <p className="text-slate-600 mb-4">فشل في تحميل QR Code</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setLoadingQR(true);
                      setQrCodeUrl('');
                      authenticatedFetch(`/api/certificates/${certificate.certificateId}`)
                        .then(res => res.json())
                        .then(data => {
                          if (data.certificate?.qrCodeUrl || data.qrCodeUrl) {
                            setQrCodeUrl(data.certificate?.qrCodeUrl || data.qrCodeUrl);
                          }
                        })
                        .catch(err => {
                          if (process.env.NODE_ENV === 'development') {
                            console.error('Error fetching QR code:', err);
                          }
                        })
                        .finally(() => setLoadingQR(false));
                    }}
                  >
                    <RefreshCw className="h-4 w-4 ml-2" />
                    إعادة المحاولة
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// مكون عرض QR Code
const QRCodeModal = ({ certificate, onClose }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // جلب QR Code
    const fetchQRCode = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await authenticatedFetch(`/api/certificates/${certificate.certificateId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.certificate?.qrCodeUrl || data.qrCodeUrl) {
          setQrCodeUrl(data.certificate?.qrCodeUrl || data.qrCodeUrl);
        } else if (data.error) {
          setError(data.error);
        } else {
          setError('فشل في توليد QR Code');
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching QR code:', err);
        }
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchQRCode();
  }, [certificate.certificateId]);

  const handleRetry = async () => {
    setQrCodeUrl('');
    setError(null);
    setLoading(true);
    
    try {
      const response = await authenticatedFetch(`/api/certificates/${certificate.certificateId}`);
      const data = await response.json();
      
      if (data.certificate?.qrCodeUrl || data.qrCodeUrl) {
        setQrCodeUrl(data.certificate?.qrCodeUrl || data.qrCodeUrl);
      } else {
        setError('فشل في توليد QR Code');
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching QR code:', err);
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <QrCode className="h-6 w-6 text-primary" />
            رمز QR للتحقق
          </DialogTitle>
          <DialogDescription>
            {certificate.certificateId} - امسح الكود للتحقق من الشهادة
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {loading ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-slate-600">جاري تحميل QR Code...</p>
              </CardContent>
            </Card>
          ) : error ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-16 w-16 text-red-400 mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">فشل في تحميل QR Code</h3>
                <p className="text-sm text-slate-600 mb-6">{error}</p>
                <Button onClick={handleRetry} variant="outline">
                  <RefreshCw className="h-4 w-4 ml-2" />
                  إعادة المحاولة
                </Button>
              </CardContent>
            </Card>
          ) : qrCodeUrl ? (
            <>
              {/* QR Code Display */}
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <div className="p-6 bg-white rounded-lg border-2 border-slate-200 shadow-lg">
                    <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
                  </div>
                  <p className="mt-6 text-sm text-slate-600 text-center max-w-md">
                    امسح هذا الرمز للتحقق من صحة الشهادة
                  </p>
                </CardContent>
              </Card>

              {/* Certificate Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    معلومات الشهادة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-slate-400" />
                      <div className="flex-1">
                        <p className="text-sm text-slate-600">رقم الشهادة</p>
                        <p className="font-semibold font-mono">{certificate.certificateId}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Gem className="h-5 w-5 text-slate-400" />
                      <div className="flex-1">
                        <p className="text-sm text-slate-600">اسم القطعة</p>
                        <p className="font-semibold">{certificate.jewelryDetails.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Gem className="h-5 w-5 text-slate-400" />
                      <div className="flex-1">
                        <p className="text-sm text-slate-600">المادة</p>
                        <p className="font-semibold">{certificate.jewelryDetails.material}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Scale className="h-5 w-5 text-slate-400" />
                      <div className="flex-1">
                        <p className="text-sm text-slate-600">العيار</p>
                        <p className="font-semibold">{certificate.jewelryDetails.karat}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 md:col-span-2">
                      <CheckCircle className="h-5 w-5 text-slate-400" />
                      <div className="flex-1">
                        <p className="text-sm text-slate-600">رمز التحقق</p>
                        <p className="font-semibold font-mono">{certificate.certificateDetails.verificationCode}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// مكون حذف الشهادة مع التأكيد
const DeleteCertificateModal = ({ certificate, confirmText, onConfirmTextChange, onConfirm, onClose, isDeleting }) => {
  const isConfirmValid = confirmText === certificate.certificateId;

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-red-600">
            <AlertCircle className="h-6 w-6" />
            حذف الشهادة نهائياً
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            هذا الإجراء لا يمكن التراجع عنه. سيتم حذف الشهادة نهائياً من النظام.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-semibold text-red-900 mb-2">
              تحذير: هذا الإجراء دائم ولا يمكن التراجع عنه
            </p>
            <p className="text-sm text-red-700">
              سيتم حذف جميع بيانات الشهادة بما في ذلك:
            </p>
            <ul className="list-disc list-inside text-sm text-red-600 mt-2 space-y-1">
              <li>معلومات الشهادة</li>
              <li>رمز QR Code</li>
              <li>سجل التحقق</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="certificateId" className="text-sm font-semibold">
              للتأكيد، يرجى إدخال معرف الشهادة:
            </Label>
            <div className="p-3 bg-slate-100 rounded-lg mb-2">
              <code className="text-lg font-mono font-bold text-slate-900">
                {certificate.certificateId}
              </code>
            </div>
            <Input
              id="certificateId"
              type="text"
              value={confirmText}
              onChange={(e) => onConfirmTextChange(e.target.value)}
              placeholder={`اكتب ${certificate.certificateId} للتأكيد`}
              className={`w-full ${!isConfirmValid && confirmText ? 'border-red-500' : ''}`}
              disabled={isDeleting}
              dir="ltr"
              style={{ textAlign: 'left' }}
            />
            {!isConfirmValid && confirmText && (
              <p className="text-sm text-red-600 mt-1">
                معرف الشهادة المدخل لا يتطابق
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
            disabled={isDeleting}
          >
            إلغاء
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={onConfirm}
            disabled={!isConfirmValid || isDeleting}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري الحذف...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                حذف نهائياً
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CertificateManager;

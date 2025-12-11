// eslint-disable-next-line
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, 
    Users, 
    Presentation, 
    BarChart3,
    Settings,
    Download,
    Plus,
    X,
    Edit2,
    Trash2,
    Lock,
    Palette,
    TrendingUp,
    FileText,
    Calendar,
    Activity,
    Zap,
    CheckCircle,
    AlertCircle,
    Search,
    Filter,
    Save,
    Upload,
    Image as ImageIcon,
    CreditCard,
    Clock,
    Bell,
    UserCheck,
    Mail,
    FileUp,
    RefreshCw,
    History,
    FileSpreadsheet,
    Send,
    AlertTriangle,
    Shield,
    Key,
    Webhook,
    HelpCircle,
    BookOpen,
    Copy,
    Eye,
    EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { translateError } from '../../utils/errorTranslator';
import api from '../../config/api';
import { io } from 'socket.io-client';
import { JoinPresentationDialog } from '../common/JoinPresentationDialog';
import LanguageSelector from '../common/LanguageSelector/LanguageSelector';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

const InstitutionAdmin = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [institution, setInstitution] = useState(null);
    const [stats, setStats] = useState({});
    const [users, setUsers] = useState([]);
    const [presentations, setPresentations] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(false);
    const [usersLoading, setUsersLoading] = useState(false);
    const [presentationsLoading, setPresentationsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [presentationStatus, setPresentationStatus] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [usersPage, setUsersPage] = useState(1);
    const [pagination, setPagination] = useState({});
    const [usersPagination, setUsersPagination] = useState({});
    const [analyticsPeriod, setAnalyticsPeriod] = useState('30');
    const [activityFeed, setActivityFeed] = useState([]);
    
    // Advanced Filtering
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [userFilter, setUserFilter] = useState({ status: 'all', role: 'all' });
    const [presentationFilter, setPresentationFilter] = useState({ status: 'all', dateRange: 'all' });
    
    // Audit Logs
    const [auditLogs, setAuditLogs] = useState([]);
    const [auditLogsLoading, setAuditLogsLoading] = useState(false);
    
    // Bulk Import
    const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
    const [bulkImportFile, setBulkImportFile] = useState(null);
    const [bulkImportPreview, setBulkImportPreview] = useState([]);
    const [isImporting, setIsImporting] = useState(false);
    
    // Reports & Scheduled Emails
    const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
    const [reportConfig, setReportConfig] = useState({
        type: 'analytics',
        format: 'pdf',
        schedule: 'none',
        email: '',
        frequency: 'weekly'
    });
    
    // Modals
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [isBrandingModalOpen, setIsBrandingModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
    const [newUser, setNewUser] = useState({ email: '' });
    
    // Payment Modal for Additional Users
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [pendingEmails, setPendingEmails] = useState([]);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [paymentOrder, setPaymentOrder] = useState(null);
    const [userValidation, setUserValidation] = useState(null); // Store validation results
    
    // Branding and Settings
    const [branding, setBranding] = useState({
        primaryColor: '#3b82f6',
        secondaryColor: '#14b8a6',
        logoUrl: '',
        customDomain: ''
    });
    const [settings, setSettings] = useState({
        aiFeaturesEnabled: true,
        exportEnabled: true,
        watermarkEnabled: false,
        analyticsEnabled: true
    });
    
    // Security Settings
    const [securitySettings, setSecuritySettings] = useState({
        twoFactorEnabled: false,
        passwordMinLength: 8,
        passwordRequireUppercase: true,
        passwordRequireLowercase: true,
        passwordRequireNumbers: true,
        passwordRequireSpecialChars: false,
        sessionTimeout: 30,
        requireEmailVerification: true
    });
    
    // API Management
    const [apiKeys, setApiKeys] = useState([]);
    const [webhooks, setWebhooks] = useState([]);
    const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
    const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
    const [newApiKey, setNewApiKey] = useState({ name: '', permissions: [] });
    const [newWebhook, setNewWebhook] = useState({ url: '', events: [], secret: '' });
    
    // Custom Reports
    const [isCustomReportModalOpen, setIsCustomReportModalOpen] = useState(false);
    const [customReports, setCustomReports] = useState([]);
    const [customReportConfig, setCustomReportConfig] = useState({
        name: '',
        description: '',
        metrics: [],
        dateRange: { start: '', end: '' },
        filters: {
            userStatus: 'all',
            presentationStatus: 'all'
        },
        visualization: 'table',
        schedule: 'none',
        email: '',
        frequency: 'weekly'
    });
    const [availableMetrics] = useState([
        { id: 'total_users', label: 'Total Users', category: 'users' },
        { id: 'active_users', label: 'Active Users', category: 'users' },
        { id: 'new_users', label: 'New Users', category: 'users' },
        { id: 'total_presentations', label: 'Total Presentations', category: 'presentations' },
        { id: 'live_presentations', label: 'Live Presentations', category: 'presentations' },
        { id: 'presentation_responses', label: 'Total Responses', category: 'presentations' },
        { id: 'avg_response_rate', label: 'Average Response Rate', category: 'presentations' },
        { id: 'top_presentations', label: 'Top Presentations', category: 'presentations' },
        { id: 'user_engagement', label: 'User Engagement Score', category: 'analytics' },
        { id: 'usage_trends', label: 'Usage Trends', category: 'analytics' }
    ]);

    // Check authentication on mount
    useEffect(() => {
        const token = sessionStorage.getItem('institutionAdminToken');
        if (token) {
            verifyToken(token);
        } else {
            // Redirect to login page if no token
            navigate('/login', { state: { from: '/institution-admin' } });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Hide body scrollbar when component is mounted
    useEffect(() => {
        document.body.style.overflow = 'auto';
        document.body.classList.add('scrollbar-hide');
        return () => {
            document.body.classList.remove('scrollbar-hide');
        };
    }, []);

    // Socket.IO connection for real-time updates
    useEffect(() => {
        if (!isAuthenticated) return;

        const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:4001');
        
        socket.on('presentation-started', () => {
            fetchPresentations();
            fetchStats();
        });

        socket.on('presentation-ended', () => {
            fetchPresentations();
            fetchStats();
        });

        return () => {
            socket.disconnect();
        };
    }, [isAuthenticated]);

    useEffect(() => {
        if (!isAuthenticated) return;
        
        if (activeTab === 'dashboard') {
            fetchStats();
        } else if (activeTab === 'users') {
            fetchUsers();
        } else if (activeTab === 'presentations') {
            fetchPresentations();
        } else if (activeTab === 'analytics') {
            fetchAnalytics();
            fetchCustomReports();
        } else if (activeTab === 'audit') {
            fetchAuditLogs();
        } else if (activeTab === 'api') {
            fetchApiKeys();
            fetchWebhooks();
        } else if (activeTab === 'analytics') {
            fetchCustomReports();
        } else if (activeTab === 'branding') {
            // Branding data will be loaded from institution
            if (institution?.branding) {
                setBranding({
                    primaryColor: institution.branding.primaryColor || '#3b82f6',
                    secondaryColor: institution.branding.secondaryColor || '#14b8a6',
                    logoUrl: institution.branding.logoUrl || '',
                    customDomain: institution.branding.customDomain || ''
                });
            }
        } else if (activeTab === 'settings') {
            // Settings data will be loaded from institution
            if (institution?.settings) {
                setSettings({
                    aiFeaturesEnabled: institution.settings.aiFeaturesEnabled ?? true,
                    exportEnabled: institution.settings.exportEnabled ?? true,
                    watermarkEnabled: institution.settings.watermarkEnabled ?? false,
                    analyticsEnabled: institution.settings.analyticsEnabled ?? true
                });
            }
        }
    }, [activeTab, isAuthenticated, currentPage, usersPage, searchQuery, presentationStatus, analyticsPeriod, institution]);

    const verifyToken = async (token) => {
        try {
            // API interceptor automatically adds Authorization header from sessionStorage
            const response = await api.get('/institution-admin/verify');
            if (response.data.success) {
                setIsAuthenticated(true);
                setInstitution(response.data.institution);
                fetchStats();
            } else {
                sessionStorage.removeItem('institutionAdminToken');
                setIsAuthenticated(false);
                navigate('/login', { state: { from: '/institution-admin' } });
            }
        } catch (error) {
            console.error('Token verification error:', error);
            // Only redirect if it's a 401/403 error, not if it's a network error
            if (error.response?.status === 401 || error.response?.status === 403) {
                sessionStorage.removeItem('institutionAdminToken');
                setIsAuthenticated(false);
                navigate('/login', { state: { from: '/institution-admin' } });
            }
        }
    };


    const fetchStats = async () => {
        try {
            const response = await api.get('/institution-admin/stats');
            if (response.data.success) {
                setStats(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const fetchUsers = async () => {
        setUsersLoading(true);
        try {
            const response = await api.get('/institution-admin/users', {
                params: {
                    page: usersPage,
                    limit: 15,
                    search: searchQuery
                }
            });
            if (response.data.success) {
                setUsers(response.data.data.users);
                setUsersPagination(response.data.data.pagination);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error(t('institution_admin.fetch_users_error'));
        } finally {
            setUsersLoading(false);
        }
    };

    const fetchPresentations = async () => {
        setPresentationsLoading(true);
        try {
            const response = await api.get('/institution-admin/presentations', {
                params: {
                    page: currentPage,
                    limit: 20,
                    search: searchQuery,
                    status: presentationStatus
                }
            });
            if (response.data.success) {
                setPresentations(response.data.data.presentations);
                setPagination(response.data.data.pagination);
            }
        } catch (error) {
            console.error('Error fetching presentations:', error);
            toast.error(t('institution_admin.fetch_presentations_error'));
        } finally {
            setPresentationsLoading(false);
        }
    };

    const fetchAnalytics = async () => {
        try {
            const response = await api.get('/institution-admin/analytics', {
                params: { period: analyticsPeriod }
            });
            if (response.data.success) {
                setAnalytics(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
            toast.error(t('institution_admin.fetch_analytics_error'));
        }
    };

    const generateActivityFeed = () => {
        // Generate activity feed from recent data
        const activities = [];
        
        if (stats?.recentPresentations > 0) {
            activities.push({
                id: 'recent-presentations',
                type: 'presentation',
                message: `${stats.recentPresentations} new presentation(s) created recently`,
                timestamp: new Date(),
                icon: Presentation
            });
        }
        
        if (users.length > 0) {
            const recentUser = users[0];
            activities.push({
                id: 'recent-user',
                type: 'user',
                message: `User ${recentUser.displayName} added to institution`,
                timestamp: new Date(),
                icon: Users
            });
        }

        if (stats?.livePresentations > 0) {
            activities.push({
                id: 'live-presentations',
                type: 'activity',
                message: `${stats.livePresentations} presentation(s) currently live`,
                timestamp: new Date(),
                icon: Activity
            });
        }

        setActivityFeed(activities.slice(0, 10));
    };

    useEffect(() => {
        if (stats && (users.length > 0 || stats.recentPresentations > 0)) {
            generateActivityFeed();
        }
    }, [stats?.totalUsers, stats?.recentPresentations, stats?.livePresentations, users.length]);

    // Helper function to extract emails from text (supports newlines, commas, spaces)
    const extractEmails = (text) => {
        if (!text || !text.trim()) return [];
        
        // Split by newlines, commas, or spaces, then filter and validate
        const emailRegex = /[^\s,]+@[^\s,]+\.[^\s,]+/g;
        const matches = text.match(emailRegex) || [];
        
        // Remove duplicates and normalize
        const uniqueEmails = [...new Set(matches.map(email => email.toLowerCase().trim()))];
        return uniqueEmails.filter(email => email.includes('@') && email.includes('.'));
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        // Extract emails from the input (supports single or multiple emails)
        const emails = extractEmails(newUser.email);
        
        if (emails.length === 0) {
            toast.error(t('institution_admin.no_valid_emails') || 'Please enter at least one valid email address.');
            setLoading(false);
            return;
        }

        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        // Add users one by one
        for (let i = 0; i < emails.length; i++) {
            const email = emails[i];
            try {
                const response = await api.post('/institution-admin/users', { email });
                if (response.data.success) {
                    successCount++;
                }
            } catch (error) {
                errorCount++;
                let errorMessage = '';
                
                // Handle specific error cases
                if (error.response?.status === 404 && error.response?.data?.code === 'USER_NOT_FOUND') {
                    errorMessage = t('institution_admin.user_not_found') || 'User account not found.';
                } else if (error.response?.status === 400 && error.response?.data?.code === 'SUBSCRIPTION_INACTIVE') {
                    errorMessage = t('institution_admin.subscription_inactive') || 'Subscription is not active.';
                    // Stop processing if subscription is inactive
                    errors.push(`${email}: ${errorMessage}`);
                    break;
                } else if (error.response?.status === 400 && error.response?.data?.code === 'USER_IN_OTHER_INSTITUTION') {
                    errorMessage = t('institution_admin.user_in_other_institution') || 'User belongs to another institution.';
                } else if (error.response?.status === 400 && error.response?.data?.code === 'DUPLICATE_ENTRY') {
                    errorMessage = t('institution_admin.duplicate_entry');
                } else if (error.response?.status === 400 && error.response?.data?.code === 'LIMIT_REACHED') {
                    // User limit reached - validate remaining users before showing payment modal
                    const remainingEmails = emails.slice(i);
                    await validateAndShowPaymentModal(remainingEmails, errors);
                    setLoading(false);
                    return;
                } else {
                    errorMessage = translateError(error, t, 'institution_admin.add_user_error') || 'Failed to add user.';
                }
                
                if (errorMessage) {
                    errors.push(`${email}: ${errorMessage}`);
                }
            }
        }

        // Show summary
        if (successCount > 0) {
            if (emails.length === 1) {
                toast.success(t('institution_admin.user_added_success'));
            } else {
                toast.success(`${successCount} user(s) added successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
            }
        }

        if (errorCount > 0 && successCount === 0) {
            // Only show error toast if all failed
            if (errors.length > 0 && errors.length <= 3) {
                errors.forEach(err => toast.error(err));
            } else {
                toast.error(`${errorCount} user(s) failed to add. Check console for details.`);
                console.error('Bulk add errors:', errors);
            }
        }

        // Reset form and refresh data
        setNewUser({ email: '' });
        setIsAddUserModalOpen(false);
        fetchUsers();
        fetchStats();
        setLoading(false);
    };

    // Validate users before showing payment modal
    const validateAndShowPaymentModal = async (emails, existingErrors = []) => {
        try {
            // Validate users to check which ones already exist
            const validationResponse = await api.post('/institution-admin/users/validate-before-payment', {
                emails: emails
            });

            if (validationResponse.data.success) {
                const validation = validationResponse.data.data;
                setUserValidation(validation);

                // Filter out users that already exist - only show payment for new users
                const newUserEmails = validation.newUsers.map(u => u.email);
                
                // Show messages for existing users
                if (validation.existingUsers.length > 0) {
                    const existingEmails = validation.existingUsers.map(u => u.email).join(', ');
                    toast.warning(t('institution_admin.users_already_exist', { 
                        count: validation.existingUsers.length, 
                        emails: existingEmails 
                    }));
                }

                if (validation.notFoundUsers.length > 0) {
                    const notFoundEmails = validation.notFoundUsers.join(', ');
                    toast.error(t('institution_admin.users_not_found', { 
                        count: validation.notFoundUsers.length, 
                        emails: notFoundEmails 
                    }));
                }

                if (validation.otherInstitutionUsers.length > 0) {
                    const otherInstEmails = validation.otherInstitutionUsers.map(u => u.email).join(', ');
                    toast.error(t('institution_admin.users_other_institution', { 
                        count: validation.otherInstitutionUsers.length, 
                        emails: otherInstEmails 
                    }));
                }

                // Only show payment modal if there are new users to add
                if (newUserEmails.length > 0) {
                    setPendingEmails(newUserEmails);
                    setIsAddUserModalOpen(false);
                    setIsPaymentModalOpen(true);
                } else {
                    // All users already exist or have issues - don't show payment modal
                    setIsAddUserModalOpen(false);
                    if (validation.existingUsers.length === emails.length) {
                        toast.info(t('institution_admin.all_users_exist'));
                    } else {
                        toast.error(t('institution_admin.no_valid_users_to_add'));
                    }
                }
            } else {
                throw new Error('Validation failed');
            }
        } catch (error) {
            console.error('User validation error:', error);
            // Fallback: show payment modal for all emails if validation fails
            toast.warning(t('institution_admin.validation_failed_fallback') || 'Could not validate users. Proceeding with payment for all users.');
            setPendingEmails(emails);
            setIsAddUserModalOpen(false);
            setIsPaymentModalOpen(true);
        }
    };

    // Handle payment for additional users
    const handlePayment = async () => {
        if (pendingEmails.length === 0) {
            toast.error(t('institution_admin.no_users_to_add'));
            return;
        }

        setPaymentLoading(true);

        try {
            // Wait for Razorpay to be available (it's loaded in index.html)
            // Give it a moment to initialize if it's still loading
            let retries = 0;
            while (!window.Razorpay && retries < 10) {
                await new Promise(resolve => setTimeout(resolve, 100));
                retries++;
            }

            // If still not available, try to load it
            if (!window.Razorpay) {
                const script = document.createElement('script');
                script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                script.async = true;
                
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Razorpay script loading timeout'));
                    }, 10000); // 10 second timeout
                    
                    script.onload = () => {
                        clearTimeout(timeout);
                        if (window.Razorpay) {
                            resolve();
                        } else {
                            reject(new Error('Razorpay failed to load'));
                        }
                    };
                    script.onerror = () => {
                        clearTimeout(timeout);
                        reject(new Error('Failed to load Razorpay script'));
                    };
                    
                    // Check if script already exists
                    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
                    if (existingScript) {
                        clearTimeout(timeout);
                        if (window.Razorpay) {
                            resolve();
                        } else {
                            // Wait a bit more for existing script to load
                            setTimeout(() => {
                                if (window.Razorpay) {
                                    resolve();
                                } else {
                                    reject(new Error('Razorpay failed to initialize'));
                                }
                            }, 1000);
                        }
                    } else {
                        document.body.appendChild(script);
                    }
                });
            }

            // Create payment order
            console.log('Creating payment order for emails:', pendingEmails);
            const response = await api.post('/institution-admin/users/create-payment', {
                emails: pendingEmails
            });

            console.log('Payment order response:', response.data);

            if (response.data.success) {
                // Validate response data
                if (!response.data.orderId || !response.data.keyId) {
                    throw new Error('Invalid payment response: missing orderId or keyId');
                }

                setPaymentOrder(response.data);

                // Check if Razorpay is available
                if (!window.Razorpay) {
                    throw new Error('Razorpay SDK not loaded. Please refresh the page and try again.');
                }

                // Initialize Razorpay payment
                const options = {
                    key: response.data.keyId,
                    amount: response.data.amount,
                    currency: response.data.currency || 'INR',
                    name: 'Inavora',
                    description: `Add ${response.data.numberOfUsers} additional user(s)`,
                    order_id: response.data.orderId,
                    handler: async function (paymentResponse) {
                        try {
                            setPaymentLoading(true);
                            
                            // Verify payment
                            const verifyResponse = await api.post('/institution-admin/users/verify-payment', {
                                razorpayOrderId: paymentResponse.razorpay_order_id,
                                razorpayPaymentId: paymentResponse.razorpay_payment_id,
                                razorpaySignature: paymentResponse.razorpay_signature,
                                emails: pendingEmails
                            });

                            if (verifyResponse.data.success) {
                                toast.success(t('institution_admin.payment_success', { count: verifyResponse.data.data.addedUsers.length }));
                                setIsPaymentModalOpen(false);
                                setPendingEmails([]);
                                setPaymentOrder(null);
                                setUserValidation(null);
                                fetchUsers();
                                fetchStats();
                            } else {
                                toast.error(verifyResponse.data.message || t('institution_admin.payment_verification_failed'));
                            }
                        } catch (error) {
                            console.error('Payment verification error:', error);
                            const errorMsg = error.response?.data?.message || error.message || t('institution_admin.payment_verification_failed');
                            toast.error(errorMsg);
                        } finally {
                            setPaymentLoading(false);
                        }
                    },
                    prefill: {
                        email: institution?.adminEmail || '',
                        name: institution?.adminName || ''
                    },
                    theme: {
                        color: '#14b8a6'
                    },
                    modal: {
                        ondismiss: function() {
                            setPaymentLoading(false);
                        }
                    }
                };

                try {
                    console.log('Initializing Razorpay with options:', {
                        key: options.key ? '***' : 'missing',
                        amount: options.amount,
                        currency: options.currency,
                        order_id: options.order_id
                    });
                    
                    const razorpay = new window.Razorpay(options);
                    
                    // Add error handlers
                    razorpay.on('payment.failed', function (response) {
                        console.error('Payment failed:', response.error);
                        const errorMsg = response.error?.description || 
                                        response.error?.reason || 
                                        response.error?.code ||
                                        t('institution_admin.payment_initiation_failed');
                        toast.error(t('institution_admin.payment_failed', { error: errorMsg }));
                        setPaymentLoading(false);
                    });
                    
                    razorpay.on('payment.authorized', function (response) {
                        console.log('Payment authorized:', response);
                    });
                    
                    console.log('Opening Razorpay payment modal...');
                    razorpay.open();
                } catch (razorpayError) {
                    console.error('Razorpay initialization error:', razorpayError);
                    throw new Error('Failed to initialize payment gateway. Please try again.');
                }
            } else {
                throw new Error(response.data.message || 'Failed to create payment order');
            }
        } catch (error) {
            console.error('Payment error:', error);
            console.error('Payment error response:', error.response?.data);
            console.error('Payment error status:', error.response?.status);
            
            // Show more detailed error message
            let errorMessage = t('institution_admin.payment_initiation_failed');
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            toast.error(errorMessage);
            setPaymentLoading(false);
        }
    };

    const handleRemoveUser = async (userId) => {
        if (!window.confirm(t('institution_admin.remove_user_confirm'))) {
            return;
        }

        try {
            const response = await api.delete(`/institution-admin/users/${userId}`);
            if (response.data.success) {
                toast.success(t('institution_admin.user_removed_success'));
                fetchUsers();
                fetchStats();
            }
        } catch (error) {
            toast.error(translateError(error, t, 'institution_admin.remove_user_error'));
        }
    };

    const handleUpdateBranding = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await api.put('/institution-admin/branding', branding);
            if (response.data.success) {
                toast.success(t('institution_admin.branding_updated_success'));
                setIsBrandingModalOpen(false);
            }
        } catch (error) {
            toast.error(translateError(error, t, 'institution_admin.update_branding_error'));
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateSettings = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await api.put('/institution-admin/settings', settings);
            if (response.data.success) {
                toast.success(t('institution_admin.settings_updated_success'));
                setIsSettingsModalOpen(false);
            }
        } catch (error) {
            toast.error(translateError(error, t, 'institution_admin.update_settings_error'));
        } finally {
            setLoading(false);
        }
    };

    // Fetch Audit Logs
    const fetchAuditLogs = async () => {
        setAuditLogsLoading(true);
        try {
            const response = await api.get('/institution-admin/audit-logs', {
                params: { 
                    startDate: dateRange.start,
                    endDate: dateRange.end 
                }
            });
            if (response.data.success) {
                setAuditLogs(response.data.logs || []);
            }
        } catch (error) {
            console.error('Error fetching audit logs:', error);
            toast.error(translateError(error, t, 'institution_admin.fetch_audit_logs_error'));
        } finally {
            setAuditLogsLoading(false);
        }
    };

    // Handle Bulk User Import
    const handleBulkImportFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.name.endsWith('.csv')) {
            toast.error(t('institution_admin.bulk_import_csv_only'));
            return;
        }

        setBulkImportFile(file);
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const lines = text.split('\n').filter(line => line.trim());
            const headers = lines[0].split(',').map(h => h.trim());
            
            const preview = lines.slice(1, Math.min(6, lines.length)).map(line => {
                const values = line.split(',').map(v => v.trim());
                return headers.reduce((obj, header, index) => {
                    obj[header] = values[index] || '';
                    return obj;
                }, {});
            });
            setBulkImportPreview(preview);
        };
        reader.readAsText(file);
    };

    const handleBulkImport = async () => {
        if (!bulkImportFile) return;
        setIsImporting(true);
        try {
            const formData = new FormData();
            formData.append('file', bulkImportFile);
            const response = await api.post('/institution-admin/users/bulk-import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (response.data.success) {
                toast.success(t('institution_admin.bulk_import_success', { count: response.data.added || 0 }));
                setIsBulkImportModalOpen(false);
                setBulkImportFile(null);
                setBulkImportPreview([]);
                fetchUsers();
            }
        } catch (error) {
            toast.error(translateError(error, t, 'institution_admin.bulk_import_error'));
        } finally {
            setIsImporting(false);
        }
    };

    // Security Settings
    const handleUpdateSecuritySettings = async () => {
        setLoading(true);
        try {
            const response = await api.put('/institution-admin/security-settings', securitySettings);
            if (response.data.success) {
                toast.success(t('institution_admin.security_settings_updated'));
            }
        } catch (error) {
            toast.error(translateError(error, t, 'institution_admin.security_settings_error'));
        } finally {
            setLoading(false);
        }
    };

    // API Key Management
    const fetchApiKeys = async () => {
        try {
            const response = await api.get('/institution-admin/api-keys');
            if (response.data.success) {
                setApiKeys(response.data.keys || []);
            }
        } catch (error) {
            console.error('Error fetching API keys:', error);
        }
    };

    const handleCreateApiKey = async () => {
        setLoading(true);
        try {
            const response = await api.post('/institution-admin/api-keys', newApiKey);
            if (response.data.success) {
                toast.success(t('institution_admin.api_key_created'));
                setIsApiKeyModalOpen(false);
                setNewApiKey({ name: '', permissions: [] });
                fetchApiKeys();
            }
        } catch (error) {
            toast.error(translateError(error, t, 'institution_admin.api_key_error'));
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteApiKey = async (keyId) => {
        if (!window.confirm(t('institution_admin.delete_api_key_confirm'))) return;
        try {
            const response = await api.delete(`/institution-admin/api-keys/${keyId}`);
            if (response.data.success) {
                toast.success(t('institution_admin.api_key_deleted'));
                fetchApiKeys();
            }
        } catch (error) {
            toast.error(translateError(error, t, 'institution_admin.api_key_delete_error'));
        }
    };

    // Webhook Management
    const fetchWebhooks = async () => {
        try {
            const response = await api.get('/institution-admin/webhooks');
            if (response.data.success) {
                setWebhooks(response.data.webhooks || []);
            }
        } catch (error) {
            console.error('Error fetching webhooks:', error);
        }
    };

    const handleCreateWebhook = async () => {
        setLoading(true);
        try {
            const response = await api.post('/institution-admin/webhooks', newWebhook);
            if (response.data.success) {
                toast.success(t('institution_admin.webhook_created'));
                setIsWebhookModalOpen(false);
                setNewWebhook({ url: '', events: [], secret: '' });
                fetchWebhooks();
            }
        } catch (error) {
            toast.error(translateError(error, t, 'institution_admin.webhook_error'));
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteWebhook = async (webhookId) => {
        if (!window.confirm(t('institution_admin.delete_webhook_confirm'))) return;
        try {
            const response = await api.delete(`/institution-admin/webhooks/${webhookId}`);
            if (response.data.success) {
                toast.success(t('institution_admin.webhook_deleted'));
                fetchWebhooks();
            }
        } catch (error) {
            toast.error(translateError(error, t, 'institution_admin.webhook_delete_error'));
        }
    };

    // Custom Reports
    const fetchCustomReports = async () => {
        try {
            const response = await api.get('/institution-admin/custom-reports');
            if (response.data.success) {
                setCustomReports(response.data.reports || []);
            }
        } catch (error) {
            console.error('Error fetching custom reports:', error);
        }
    };

    const handleSaveCustomReport = async () => {
        if (!customReportConfig.name || customReportConfig.metrics.length === 0) {
            toast.error(t('institution_admin.custom_report_validation_error'));
            return;
        }
        setLoading(true);
        try {
            const response = await api.post('/institution-admin/custom-reports', customReportConfig);
            if (response.data.success) {
                toast.success(t('institution_admin.custom_report_saved'));
                setIsCustomReportModalOpen(false);
                setCustomReportConfig({
                    name: '',
                    description: '',
                    metrics: [],
                    dateRange: { start: '', end: '' },
                    filters: { userStatus: 'all', presentationStatus: 'all' },
                    visualization: 'table',
                    schedule: 'none',
                    email: '',
                    frequency: 'weekly'
                });
                fetchCustomReports();
            }
        } catch (error) {
            toast.error(translateError(error, t, 'institution_admin.custom_report_save_error'));
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateCustomReport = async (reportId) => {
        setLoading(true);
        try {
            const response = await api.post(`/institution-admin/custom-reports/${reportId}/generate`, {
                responseType: 'blob'
            });
            const blob = response.data;
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `custom-report-${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success(t('institution_admin.custom_report_generated'));
        } catch (error) {
            toast.error(translateError(error, t, 'institution_admin.custom_report_generate_error'));
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCustomReport = async (reportId) => {
        if (!window.confirm(t('institution_admin.delete_custom_report_confirm'))) return;
        try {
            const response = await api.delete(`/institution-admin/custom-reports/${reportId}`);
            if (response.data.success) {
                toast.success(t('institution_admin.custom_report_deleted'));
                fetchCustomReports();
            }
        } catch (error) {
            toast.error(translateError(error, t, 'institution_admin.custom_report_delete_error'));
        }
    };

    const toggleMetric = (metricId) => {
        setCustomReportConfig(prev => ({
            ...prev,
            metrics: prev.metrics.includes(metricId)
                ? prev.metrics.filter(id => id !== metricId)
                : [...prev.metrics, metricId]
        }));
    };

    // Generate Report
    const handleGenerateReport = async () => {
        setLoading(true);
        try {
            const response = await api.post('/institution-admin/reports/generate', reportConfig, {
                responseType: reportConfig.format === 'pdf' ? 'blob' : 'blob'
            });
            if (reportConfig.schedule === 'none') {
                // Download immediately
                const blob = response.data;
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                const extension = reportConfig.format === 'pdf' ? 'pdf' : 'xlsx';
                link.download = `report-${reportConfig.type}-${new Date().toISOString().split('T')[0]}.${extension}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                toast.success(t('institution_admin.report_generated_success'));
            } else {
                // Scheduled
                toast.success(t('institution_admin.report_scheduled_success'));
            }
            setIsReportsModalOpen(false);
        } catch (error) {
            toast.error(translateError(error, t, 'institution_admin.report_generation_error'));
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async (type, format = 'json') => {
        try {
            const response = await api.get('/institution-admin/export', {
                params: { type, format },
                responseType: format === 'json' ? 'json' : 'blob'
            });
            
            if (format === 'json' && response.data.success) {
                // Create blob and download JSON
                const blob = new Blob([JSON.stringify(response.data.data, null, 2)], { type: 'application/json' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `institution-${type}-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            } else if (format === 'csv' || format === 'excel') {
                // Handle CSV/Excel download
                const blob = new Blob([response.data], { 
                    type: format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
                });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                const extension = format === 'csv' ? 'csv' : 'xlsx';
                link.download = `institution-${type}-${new Date().toISOString().split('T')[0]}.${extension}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            }
            
            toast.success(t('institution_admin.export_success', { type, format }));
        } catch (error) {
            console.error('Export error:', error);
            toast.error(translateError(error, t, 'institution_admin.export_error'));
        }
    };

    // Show loading or redirect if not authenticated
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[#0f172a] text-white overflow-x-hidden font-sans flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">{t('institution_admin.redirecting_to_login')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0f172a] text-white overflow-x-hidden font-sans scrollbar-hide">
            {/* Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-600/10 blur-[120px] animate-pulse delay-1000" />
            </div>

            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-40 backdrop-blur-md bg-[#0f172a]/80 border-b border-white/5">
                <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => navigate('/')}
                        >
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <span className="text-xl font-bold text-white">𝑖</span>
                            </div>
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">Inavora</span>
                        </div>
                        <span className="text-sm text-gray-400 hidden sm:inline">{institution?.name || 'Institution Admin'}</span>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                        <LanguageSelector />
                        <button
                            onClick={() => {
                                sessionStorage.removeItem('institutionAdminToken');
                                setIsAuthenticated(false);
                                toast.success(t('institution_admin.logout_success'));
                                navigate('/login');
                            }}
                            className="flex items-center border border-red-500/30 px-3 py-1 rounded-lg gap-2 text-xs sm:text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                        >
                            <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">{t('institution_admin.logout')}</span>
                        </button>
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center border border-white/30 px-3 py-1 rounded-lg gap-2 text-xs sm:text-sm font-medium text-gray-300 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">{t('institution_admin.back')}</span>
                        </button>
                    </div>
                </div>
            </nav>

            <main className="relative z-10 pt-24 pb-20 container mx-auto px-4 sm:px-6">
                {/* Presentation Buttons */}
                <div className="flex flex-col md:flex-row gap-3 justify-end items-center w-full md:w-auto mb-6">
                    <button
                        onClick={() => setIsJoinDialogOpen(true)}
                        className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-teal-500 text-white font-bold px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-teal-500/25 transition-all flex items-center justify-center gap-2"
                    >
                        <Presentation className="h-5 w-5" />
                        {t('institution_admin.join_presentation')}
                    </button>
                    <button
                        onClick={() => navigate('/presentation/new', { state: { fromInstitutionAdmin: true } })}
                        className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-teal-500 text-white font-bold px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-teal-500/25 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus className="h-5 w-5" />
                        {t('institution_admin.new_presentation')}
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 sm:gap-4 mb-6 sm:mb-8 border-b border-white/10 overflow-x-auto scrollbar-hide">
                    {[
                        { id: 'dashboard', label: t('navbar.dashboard'), icon: BarChart3 },
                        { id: 'users', label: t('institution_admin.users_label'), icon: Users },
                        { id: 'presentations', label: t('institution_admin.presentations_title'), icon: Presentation },
                        { id: 'analytics', label: t('institution_admin.analytics_title'), icon: TrendingUp },
                        { id: 'audit', label: t('institution_admin.audit_logs'), icon: History },
                        { id: 'api', label: t('institution_admin.api_management'), icon: Key },
                        { id: 'subscription', label: t('institution_admin.subscription_billing'), icon: CreditCard },
                        { id: 'branding', label: t('institution_admin.custom_branding'), icon: Palette },
                        { id: 'settings', label: t('institution_admin.settings_title'), icon: Settings },
                        { id: 'help', label: t('institution_admin.help_center'), icon: HelpCircle }
                    ].map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base font-medium transition-colors whitespace-nowrap ${
                                    activeTab === tab.id
                                        ? 'text-teal-400 border-b-2 border-teal-400'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Dashboard Tab */}
                {activeTab === 'dashboard' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="mb-6 sm:mb-8">
                            <h2 className="text-2xl sm:text-3xl font-bold mb-2">{t('institution_admin.dashboard_overview')}</h2>
                            <p className="text-gray-400 text-sm sm:text-base">{t('institution_admin.dashboard_description')}</p>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
                            <div className="bg-white/5 border border-white/10 p-4 sm:p-6 rounded-xl sm:rounded-2xl">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-gray-400 text-xs sm:text-sm">{t('institution_admin.total_users')}</span>
                                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                                </div>
                                <p className="text-2xl sm:text-3xl font-bold">{stats.totalUsers || 0}</p>
                                <p className="text-xs sm:text-sm text-gray-500 mt-1">{stats.activeUsers || 0} {t('institution_admin.active')}</p>
                            </div>

                            <div className="bg-white/5 border border-white/10 p-4 sm:p-6 rounded-xl sm:rounded-2xl">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-gray-400 text-xs sm:text-sm">{t('institution_admin.presentations')}</span>
                                    <Presentation className="w-4 h-4 sm:w-5 sm:h-5 text-teal-400" />
                                </div>
                                <p className="text-2xl sm:text-3xl font-bold">{stats.totalPresentations || 0}</p>
                                <p className="text-xs sm:text-sm text-gray-500 mt-1">{stats.livePresentations || 0} {t('institution_admin.live')}</p>
                            </div>

                            <div className="bg-white/5 border border-white/10 p-4 sm:p-6 rounded-xl sm:rounded-2xl">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-gray-400 text-xs sm:text-sm">{t('institution_admin.total_slides')}</span>
                                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                                </div>
                                <p className="text-2xl sm:text-3xl font-bold">{stats.totalSlides || 0}</p>
                                <p className="text-xs sm:text-sm text-gray-500 mt-1">{stats.recentPresentations || 0} {t('institution_admin.recent')}</p>
                            </div>

                            <div className="bg-white/5 border border-white/10 p-4 sm:p-6 rounded-xl sm:rounded-2xl">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-gray-400 text-xs sm:text-sm">{t('institution_admin.total_responses')}</span>
                                    <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                                </div>
                                <p className="text-2xl sm:text-3xl font-bold">{stats.totalResponses || 0}</p>
                                <p className="text-xs sm:text-sm text-gray-500 mt-1">{stats.recentResponses || 0} {t('institution_admin.recent')}</p>
                            </div>
                        </div>

                        {/* Activity Feed */}
                        {activityFeed.length > 0 && (
                            <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8">
                                <h3 className="text-lg sm:text-xl font-bold mb-4 flex items-center gap-2">
                                    <Activity className="w-5 h-5" />
                                    {t('institution_admin.recent_activity')}
                                </h3>
                                <div className="space-y-3">
                                    {activityFeed.map((activity) => {
                                        const Icon = activity.icon || Activity;
                                        return (
                                            <div key={activity.id} className="flex items-start gap-3 p-3 bg-black/20 rounded-lg">
                                                <div className="p-2 bg-teal-500/20 rounded-lg">
                                                    <Icon className="w-4 h-4 text-teal-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-white">{activity.message}</p>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        {activity.timestamp.toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Quick Actions */}
                        <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                            <h3 className="text-lg sm:text-xl font-bold mb-4">{t('institution_admin.quick_actions')}</h3>
                            <div className="flex flex-wrap gap-3 sm:gap-4">
                                <button
                                    onClick={() => setIsAddUserModalOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm sm:text-base"
                                >
                                    <Plus className="w-4 h-4" />
                                    {t('institution_admin.add_user')}
                                </button>
                                <div className="relative group">
                                    <button
                                        className="flex items-center gap-2 px-4 py-2 bg-teal-500/20 text-teal-400 rounded-lg hover:bg-teal-500/30 transition-colors text-sm sm:text-base"
                                    >
                                        <Download className="w-4 h-4" />
                                        {t('institution_admin.export_presentations')}
                                    </button>
                                    <div className="absolute left-0 top-full mt-1 w-48 bg-[#1e293b] border border-white/10 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                                        <button
                                            onClick={() => handleExport('presentations', 'json')}
                                            className="w-full text-left px-4 py-2 hover:bg-white/5 text-sm text-white"
                                        >
                                            {t('institution_admin.export_as_json')}
                                        </button>
                                        <button
                                            onClick={() => handleExport('presentations', 'csv')}
                                            className="w-full text-left px-4 py-2 hover:bg-white/5 text-sm text-white"
                                        >
                                            {t('institution_admin.export_as_csv')}
                                        </button>
                                        <button
                                            onClick={() => handleExport('presentations', 'excel')}
                                            className="w-full text-left px-4 py-2 hover:bg-white/5 text-sm text-white"
                                        >
                                            {t('institution_admin.export_as_excel')}
                                        </button>
                                    </div>
                                </div>
                                <div className="relative group">
                                    <button
                                        className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors text-sm sm:text-base"
                                    >
                                        <Download className="w-4 h-4" />
                                        {t('institution_admin.export_users')}
                                    </button>
                                    <div className="absolute left-0 top-full mt-1 w-48 bg-[#1e293b] border border-white/10 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                                        <button
                                            onClick={() => handleExport('users', 'json')}
                                            className="w-full text-left px-4 py-2 hover:bg-white/5 text-sm text-white"
                                        >
                                            {t('institution_admin.export_as_json')}
                                        </button>
                                        <button
                                            onClick={() => handleExport('users', 'csv')}
                                            className="w-full text-left px-4 py-2 hover:bg-white/5 text-sm text-white"
                                        >
                                            {t('institution_admin.export_as_csv')}
                                        </button>
                                        <button
                                            onClick={() => handleExport('users', 'excel')}
                                            className="w-full text-left px-4 py-2 hover:bg-white/5 text-sm text-white"
                                        >
                                            {t('institution_admin.export_as_excel')}
                                        </button>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setActiveTab('analytics')}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors text-sm sm:text-base"
                                >
                                    <TrendingUp className="w-4 h-4" />
                                    {t('institution_admin.view_analytics')}
                                </button>
                                <button
                                    onClick={() => setIsReportsModalOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-colors text-sm sm:text-base"
                                >
                                    <FileSpreadsheet className="w-4 h-4" />
                                    {t('institution_admin.generate_report')}
                                </button>
                                <button
                                    onClick={() => setIsCustomReportModalOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 transition-colors text-sm sm:text-base"
                                >
                                    <FileText className="w-4 h-4" />
                                    {t('institution_admin.custom_report_builder')}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Users Tab */}
                {activeTab === 'users' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
                            <div>
                                <h2 className="text-2xl sm:text-3xl font-bold mb-2">{t('institution_admin.user_management')}</h2>
                                <p className="text-gray-400 text-sm sm:text-base">{t('institution_admin.manage_institution_users')}</p>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                <button
                                    onClick={() => setIsBulkImportModalOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/30 transition-colors text-sm sm:text-base"
                                >
                                    <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                                    {t('institution_admin.bulk_import')}
                                </button>
                                <button
                                    onClick={() => setIsAddUserModalOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-teal-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-teal-500/25 transition-all text-sm sm:text-base"
                                >
                                    <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                                    {t('institution_admin.add_user')}
                                </button>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="mb-4 sm:mb-6 flex flex-wrap gap-3">
                            <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-gray-400" />
                                <select
                                    value={userFilter.status}
                                    onChange={(e) => setUserFilter({ ...userFilter, status: e.target.value })}
                                    className="px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                                >
                                    <option value="all">{t('institution_admin.filter_all_status')}</option>
                                    <option value="active">{t('institution_admin.filter_active')}</option>
                                    <option value="inactive">{t('institution_admin.filter_inactive')}</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <input
                                    type="date"
                                    value={dateRange.start}
                                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                    className="px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                                    placeholder={t('institution_admin.filter_from_date')}
                                />
                                <span className="text-gray-400">-</span>
                                <input
                                    type="date"
                                    value={dateRange.end}
                                    onChange={(e) => {
                                        setDateRange({ ...dateRange, end: e.target.value });
                                        fetchUsers();
                                    }}
                                    className="px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                                    placeholder={t('institution_admin.filter_to_date')}
                                />
                            </div>
                        </div>

                        {/* Search */}
                        <div className="mb-4 sm:mb-6">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setUsersPage(1);
                                    }}
                                    placeholder={t('institution_admin.search_users_placeholder')}
                                    className="w-full pl-10 sm:pl-12 pr-4 py-2 sm:py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-sm sm:text-base"
                                />
                            </div>
                        </div>

                        {/* Users List */}
                        {usersLoading ? (
                            <div className="text-center py-12">
                                <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-gray-400">{t('institution_admin.loading_users')}</p>
                            </div>
                        ) : users.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>{t('institution_admin.no_users_found')}</p>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                    {users.map((user) => (
                                        <div key={user.id} className="bg-white/5 border border-white/10 p-4 sm:p-6 rounded-xl sm:rounded-2xl flex flex-col">
                                            <div className="flex flex-col gap-3 sm:gap-4 flex-1">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                                        {user.photoURL ? (
                                                            <img src={user.photoURL} alt={user.displayName} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0" />
                                                        ) : (
                                                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center text-white font-bold text-sm sm:text-base flex-shrink-0">
                                                                {user.displayName.charAt(0).toUpperCase()}
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <h3 className="text-base sm:text-lg font-bold truncate">{user.displayName}</h3>
                                                                {user.isInstitutionUser && (
                                                                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-medium whitespace-nowrap">
                                                                        <UserCheck className="w-3 h-3 inline mr-1" />
                                                                        Active
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-gray-400 text-xs sm:text-sm truncate mt-1">{user.email}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveUser(user.id)}
                                                        className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors flex-shrink-0"
                                                        title={t('institution_admin.remove_user') || 'Remove user'}
                                                    >
                                                        <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                                    </button>
                                                </div>
                                                <div className="flex flex-col gap-2 mt-auto">
                                                    <div className="flex flex-wrap gap-2 sm:gap-3">
                                                        <span className="text-xs text-gray-500 flex items-center gap-1">
                                                            <Presentation className="w-3 h-3" />
                                                            {user.presentationCount || 0} {t('institution_admin.presentations_count')}
                                                        </span>
                                                        <span className="text-xs text-gray-500 flex items-center gap-1">
                                                            <FileText className="w-3 h-3" />
                                                            {user.slideCount || 0} {t('institution_admin.slides_count')}
                                                        </span>
                                                    </div>
                                                    {user.createdAt && (
                                                        <span className="text-xs text-gray-500 flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {t('institution_admin.joined')} {new Date(user.createdAt).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Pagination - Show when there are more than 15 users */}
                                {usersPagination.pages > 1 && (
                                    <div className="flex items-center justify-center gap-2 sm:gap-4 mt-6 sm:mt-8">
                                        <button
                                            onClick={() => setUsersPage(prev => Math.max(1, prev - 1))}
                                            disabled={usersPage === 1}
                                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                                        >
                                            {t('institution_admin.previous')}
                                        </button>
                                        <span className="text-sm sm:text-base text-gray-400 px-2">
                                            {t('institution_admin.page_info', { 
                                                current: usersPagination.page || usersPage, 
                                                total: usersPagination.pages || 1
                                            })}
                                            {usersPagination.total && (
                                                <span className="text-xs text-gray-500 ml-2">
                                                    ({usersPagination.total} {t('institution_admin.total_users')})
                                                </span>
                                            )}
                                        </span>
                                        <button
                                            onClick={() => setUsersPage(prev => Math.min(usersPagination.pages || 1, prev + 1))}
                                            disabled={usersPage >= (usersPagination.pages || 1)}
                                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                                        >
                                            {t('institution_admin.next')}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </motion.div>
                )}

                {/* Presentations Tab */}
                {activeTab === 'presentations' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="mb-6 sm:mb-8">
                            <h2 className="text-2xl sm:text-3xl font-bold mb-2">{t('institution_admin.presentations_title')}</h2>
                            <p className="text-gray-400 text-sm sm:text-base">{t('institution_admin.presentations_description')}</p>
                        </div>

                        {/* Filters */}
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    placeholder={t('institution_admin.search_presentations_placeholder')}
                                    className="w-full pl-10 sm:pl-12 pr-4 py-2 sm:py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-sm sm:text-base"
                                />
                            </div>
                            <select
                                value={presentationStatus}
                                onChange={(e) => {
                                    setPresentationStatus(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="px-4 py-2 sm:py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-sm sm:text-base"
                            >
                                <option value="all">{t('institution_admin.all_presentations')}</option>
                                <option value="live">{t('institution_admin.presentation_status_live')}</option>
                                <option value="ended">{t('institution_admin.presentation_status_ended')}</option>
                            </select>
                        </div>

                        {/* Presentations List */}
                        {presentationsLoading ? (
                            <div className="text-center py-12">
                                <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-gray-400">{t('institution_admin.loading_presentations')}</p>
                            </div>
                        ) : presentations.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <Presentation className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>{t('institution_admin.no_presentations_found')}</p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-3 sm:space-y-4">
                                    {presentations.map((presentation) => (
                                        <div key={presentation.id} className="bg-white/5 border border-white/10 p-4 sm:p-6 rounded-xl sm:rounded-2xl">
                                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 sm:gap-3 mb-2">
                                                        <h3 className="text-base sm:text-lg font-bold truncate">{presentation.title}</h3>
                                                        {presentation.isLive && (
                                                            <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium flex items-center gap-1">
                                                                <Activity className="w-3 h-3" />
                                                                Live
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-gray-400 text-xs sm:text-sm mb-2">
                                                        By: {presentation.createdBy?.displayName || presentation.createdBy?.email || 'Unknown'}
                                                    </p>
                                                    <div className="flex flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500">
                                                        <span>Code: {presentation.accessCode}</span>
                                                        <span>{presentation.slideCount || 0} slides</span>
                                                        <span>{presentation.responseCount || 0} responses</span>
                                                        <span>Created: {new Date(presentation.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 sm:gap-3">
                                                    <a
                                                        href={`/presentation/${presentation.id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 hover:bg-teal-500/20 text-teal-400 rounded-lg transition-colors"
                                                    >
                                                        <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Pagination */}
                                {pagination.pages > 1 && (
                                    <div className="flex items-center justify-center gap-2 mt-6">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            disabled={currentPage === 1}
                                            className="px-3 py-2 bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                        >
                                            {t('institution_admin.previous')}
                                        </button>
                                        <span className="text-sm text-gray-400">
                                            {t('institution_admin.page_info', { 
                                                current: pagination.page, 
                                                total: pagination.pages 
                                            })}
                                        </span>
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
                                            disabled={currentPage === pagination.pages}
                                            className="px-3 py-2 bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                        >
                                            {t('institution_admin.next')}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </motion.div>
                )}

                {/* Analytics Tab */}
                {activeTab === 'analytics' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        {/* Period Selector */}
                        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <h2 className="text-2xl sm:text-3xl font-bold mb-2">{t('institution_admin.analytics_title')}</h2>
                                <p className="text-gray-400 text-sm sm:text-base">{t('institution_admin.analytics_description')}</p>
                            </div>
                            <select
                                value={analyticsPeriod}
                                onChange={(e) => {
                                    setAnalyticsPeriod(e.target.value);
                                    fetchAnalytics();
                                }}
                                className="px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                            >
                                <option value="7">{t('institution_admin.period_7_days')}</option>
                                <option value="30">{t('institution_admin.period_30_days')}</option>
                                <option value="90">{t('institution_admin.period_90_days')}</option>
                                <option value="365">{t('institution_admin.period_365_days')}</option>
                            </select>
                        </div>

                        {analytics ? (
                            <div className="space-y-6">
                                {/* Summary Cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                                    <div className="bg-white/5 border border-white/10 p-4 sm:p-6 rounded-xl sm:rounded-2xl">
                                        <p className="text-gray-400 text-xs sm:text-sm mb-2">{t('institution_admin.total_presentations')}</p>
                                        <p className="text-2xl sm:text-3xl font-bold">{analytics.totalPresentations || 0}</p>
                                        <p className="text-xs text-gray-500 mt-1">{t('institution_admin.last_days', { days: analytics.period })}</p>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 p-4 sm:p-6 rounded-xl sm:rounded-2xl">
                                        <p className="text-gray-400 text-xs sm:text-sm mb-2">{t('institution_admin.total_responses_label')}</p>
                                        <p className="text-2xl sm:text-3xl font-bold">{analytics.totalResponses || 0}</p>
                                        <p className="text-xs text-gray-500 mt-1">{t('institution_admin.last_days', { days: analytics.period })}</p>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 p-4 sm:p-6 rounded-xl sm:rounded-2xl">
                                        <p className="text-gray-400 text-xs sm:text-sm mb-2">{t('institution_admin.top_presentations')}</p>
                                        <p className="text-2xl sm:text-3xl font-bold">{analytics.topPresentations?.length || 0}</p>
                                        <p className="text-xs text-gray-500 mt-1">{t('institution_admin.by_engagement')}</p>
                                    </div>
                                </div>

                                {/* Charts */}
                                {analytics.presentationStats && analytics.responseStats && 
                                (Object.keys(analytics.presentationStats).length > 0 || Object.keys(analytics.responseStats).length > 0) ? (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Presentations Over Time */}
                                        <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                                            <h3 className="text-lg font-bold mb-4">{t('institution_admin.presentations_over_time')}</h3>
                                            {Object.keys(analytics.presentationStats).length > 0 ? (
                                                <ResponsiveContainer width="100%" height={300}>
                                                    <AreaChart data={Object.entries(analytics.presentationStats || {}).map(([date, count]) => ({
                                                        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                                                        count
                                                    }))}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                                                        <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                                                        <YAxis stroke="#9ca3af" fontSize={12} />
                                                        <Tooltip 
                                                            contentStyle={{ 
                                                                backgroundColor: '#1e293b', 
                                                                border: '1px solid rgba(255,255,255,0.1)',
                                                                borderRadius: '8px',
                                                                color: '#fff'
                                                            }} 
                                                        />
                                                        <Area 
                                                            type="monotone" 
                                                            dataKey="count" 
                                                            stroke="#3b82f6" 
                                                            fill="#3b82f6" 
                                                            fillOpacity={0.3}
                                                        />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div className="flex items-center justify-center h-[300px] text-gray-400">
                                                    <p>{t('institution_admin.no_presentation_data')}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Responses Over Time */}
                                        <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                                            <h3 className="text-lg font-bold mb-4">{t('institution_admin.responses_over_time')}</h3>
                                            {Object.keys(analytics.responseStats).length > 0 ? (
                                                <ResponsiveContainer width="100%" height={300}>
                                                    <AreaChart data={Object.entries(analytics.responseStats || {}).map(([date, count]) => ({
                                                        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                                                        count
                                                    }))}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                                                        <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                                                        <YAxis stroke="#9ca3af" fontSize={12} />
                                                        <Tooltip 
                                                            contentStyle={{ 
                                                                backgroundColor: '#1e293b', 
                                                                border: '1px solid rgba(255,255,255,0.1)',
                                                                borderRadius: '8px',
                                                                color: '#fff'
                                                            }} 
                                                        />
                                                        <Area 
                                                            type="monotone" 
                                                            dataKey="count" 
                                                            stroke="#14b8a6" 
                                                            fill="#14b8a6" 
                                                            fillOpacity={0.3}
                                                        />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div className="flex items-center justify-center h-[300px] text-gray-400">
                                                    <p>{t('institution_admin.no_response_data')}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-8 text-center">
                                        <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-400 opacity-50" />
                                        <p className="text-gray-400">{t('institution_admin.no_chart_data')}</p>
                                    </div>
                                )}

                                {/* Top Presentations Bar Chart */}
                                {analytics.topPresentations && analytics.topPresentations.length > 0 ? (
                                    <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                                        <h3 className="text-lg font-bold mb-4">{t('institution_admin.top_presentations_by_responses')}</h3>
                                        <ResponsiveContainer width="100%" height={400}>
                                            <BarChart data={analytics.topPresentations.slice(0, 10).map(p => ({
                                                name: p.title.length > 20 ? p.title.substring(0, 20) + '...' : p.title,
                                                responses: p.responseCount
                                            }))} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                                                <XAxis type="number" stroke="#9ca3af" fontSize={12} />
                                                <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={12} width={150} />
                                                <Tooltip 
                                                    contentStyle={{ 
                                                        backgroundColor: '#1e293b', 
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        borderRadius: '8px',
                                                        color: '#fff'
                                                    }} 
                                                />
                                                <Bar dataKey="responses" fill="#14b8a6" radius={[0, 8, 8, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-8 text-center">
                                        <Presentation className="w-12 h-12 mx-auto mb-4 text-gray-400 opacity-50" />
                                        <p className="text-gray-400">{t('institution_admin.no_top_presentations_data')}</p>
                                    </div>
                                )}

                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-gray-400">{t('institution_admin.loading_analytics')}</p>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Subscription Tab */}
                {activeTab === 'subscription' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="mb-6 sm:mb-8">
                            <h2 className="text-2xl sm:text-3xl font-bold mb-2">{t('institution_admin.subscription_billing')}</h2>
                            <p className="text-gray-400 text-sm sm:text-base">{t('institution_admin.subscription_description')}</p>
                        </div>

                        {institution?.subscription && (
                            <div className="space-y-6">
                                {/* Plan Details */}
                                <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                                    <h3 className="text-lg sm:text-xl font-bold mb-4 flex items-center gap-2">
                                        <CreditCard className="w-5 h-5" />
                                        {t('institution_admin.current_plan')}
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-gray-400 text-sm mb-1">{t('institution_admin.plan')}</p>
                                            <p className="text-lg font-semibold capitalize">{institution.subscription.plan || 'Institution'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400 text-sm mb-1">{t('institution_admin.status')}</p>
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                                institution.subscription.status === 'active' 
                                                    ? 'bg-green-500/20 text-green-400' 
                                                    : 'bg-red-500/20 text-red-400'
                                            }`}>
                                                {institution.subscription.status === 'active' && <CheckCircle className="w-4 h-4 mr-1" />}
                                                {institution.subscription.status}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-gray-400 text-sm mb-1">{t('institution_admin.billing_cycle')}</p>
                                            <p className="text-lg font-semibold capitalize">{institution.subscription.billingCycle || 'Yearly'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400 text-sm mb-1">{t('institution_admin.renewal_date')}</p>
                                            <p className="text-lg font-semibold">
                                                {institution.subscription.endDate 
                                                    ? new Date(institution.subscription.endDate).toLocaleDateString()
                                                    : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Alerts & Notifications */}
                                {(() => {
                                    const userUsagePercent = ((stats?.totalUsers || 0) / (institution.subscription.maxUsers || 1)) * 100;
                                    const daysRemaining = institution.subscription.endDate ? Math.ceil((new Date(institution.subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24)) : 0;
                                    const showUserWarning = userUsagePercent >= 80;
                                    const showRenewalWarning = daysRemaining <= 30 && daysRemaining > 0;
                                    
                                    return (showUserWarning || showRenewalWarning) && (
                                        <div className="space-y-3">
                                            {showUserWarning && (
                                                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
                                                    <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                                                    <div className="flex-1">
                                                        <h4 className="font-semibold text-yellow-400 mb-1">{t('institution_admin.user_limit_warning_80')}</h4>
                                                        <p className="text-sm text-gray-300">{t('institution_admin.user_limit_warning_60')}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {showRenewalWarning && (
                                                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
                                                    <Bell className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                                                    <div className="flex-1">
                                                        <h4 className="font-semibold text-blue-400 mb-1">{t('institution_admin.renewal_warning_title')}</h4>
                                                        <p className="text-sm text-gray-300">{t('institution_admin.renewal_warning_message', { days: daysRemaining })}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* Usage Statistics */}
                                <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                                    <h3 className="text-lg sm:text-xl font-bold mb-4 flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5" />
                                        {t('institution_admin.usage_statistics')}
                                    </h3>
                                    
                                    {/* Users Usage */}
                                    <div className="mb-6">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-gray-300 font-medium">{t('institution_admin.users_label')}</span>
                                            <span className="text-sm text-gray-400">
                                                {stats?.totalUsers || institution.subscription.currentUsers || 0} / {institution.subscription.maxUsers || 10}
                                            </span>
                                        </div>
                                        <div className="w-full bg-black/30 rounded-full h-3 overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all ${
                                                    ((stats?.totalUsers || 0) / (institution.subscription.maxUsers || 10)) > 0.8 
                                                        ? 'bg-red-500' 
                                                        : ((stats?.totalUsers || 0) / (institution.subscription.maxUsers || 10)) > 0.6
                                                        ? 'bg-yellow-500'
                                                        : 'bg-teal-500'
                                                }`}
                                                style={{ 
                                                    width: `${Math.min(((stats?.totalUsers || 0) / (institution.subscription.maxUsers || 10)) * 100, 100)}%` 
                                                }}
                                            />
                                        </div>
                                        {((stats?.totalUsers || 0) / (institution.subscription.maxUsers || 10)) > 0.8 && (
                                            <p className="text-xs text-yellow-400 mt-1">
                                                <AlertCircle className="w-3 h-3 inline mr-1" />
                                                {t('institution_admin.approaching_user_limit')}
                                            </p>
                                        )}
                                    </div>

                                    {/* Other Usage Stats */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                                        <div className="p-4 bg-black/20 rounded-lg">
                                            <p className="text-gray-400 text-xs mb-1">{t('institution_admin.presentations_label')}</p>
                                            <p className="text-2xl font-bold">{stats?.totalPresentations || 0}</p>
                                        </div>
                                        <div className="p-4 bg-black/20 rounded-lg">
                                            <p className="text-gray-400 text-xs mb-1">{t('institution_admin.total_responses_label_stats')}</p>
                                            <p className="text-2xl font-bold">{stats?.totalResponses || 0}</p>
                                        </div>
                                        <div className="p-4 bg-black/20 rounded-lg">
                                            <p className="text-gray-400 text-xs mb-1">{t('institution_admin.active_users_30_days')}</p>
                                            <p className="text-2xl font-bold">{stats?.activeUsers || 0}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Subscription Period */}
                                {institution.subscription.startDate && institution.subscription.endDate && (
                                    <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                                    <h3 className="text-lg sm:text-xl font-bold mb-4 flex items-center gap-2">
                                        <Calendar className="w-5 h-5" />
                                        {t('institution_admin.subscription_period')}
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-gray-400 text-sm mb-1">{t('institution_admin.start_date')}</p>
                                                <p className="text-lg font-semibold">
                                                    {new Date(institution.subscription.startDate).toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    })}
                                                </p>
                                            </div>
                                        <div>
                                            <p className="text-gray-400 text-sm mb-1">{t('institution_admin.end_date')}</p>
                                                <p className="text-lg font-semibold">
                                                    {new Date(institution.subscription.endDate).toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                        {institution.subscription.endDate && (
                                            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-blue-400" />
                                                    <span className="text-sm text-blue-300">
                                                        {Math.ceil((new Date(institution.subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24))} {t('institution_admin.days_remaining')}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Branding Tab */}
                {activeTab === 'branding' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="mb-6 sm:mb-8">
                            <h2 className="text-2xl sm:text-3xl font-bold mb-2">{t('institution_admin.custom_branding')}</h2>
                            <p className="text-gray-400 text-sm sm:text-base">{t('institution_admin.customize_branding')}</p>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                            <form onSubmit={handleUpdateBranding} className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">{t('institution_admin.primary_color')}</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                value={branding.primaryColor}
                                                onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                                                className="w-16 h-10 rounded-lg cursor-pointer"
                                            />
                                            <input
                                                type="text"
                                                value={branding.primaryColor}
                                                onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                                                className="flex-1 px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">{t('institution_admin.secondary_color')}</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                value={branding.secondaryColor}
                                                onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                                                className="w-16 h-10 rounded-lg cursor-pointer"
                                            />
                                            <input
                                                type="text"
                                                value={branding.secondaryColor}
                                                onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                                                className="flex-1 px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-sm font-medium text-gray-300 mb-2">{t('institution_admin.logo_url')}</label>
                                        <input
                                            type="url"
                                            value={branding.logoUrl}
                                            onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
                                            className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-sm"
                                            placeholder="https://example.com/logo.png"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-sm font-medium text-gray-300 mb-2">{t('institution_admin.custom_domain')}</label>
                                        <input
                                            type="text"
                                            value={branding.customDomain}
                                            onChange={(e) => setBranding({ ...branding, customDomain: e.target.value })}
                                            className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-sm"
                                            placeholder={t('institution_admin.custom_domain_placeholder')}
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-500 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-teal-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5" />
                                            {t('institution_admin.save_branding')}
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}

                {/* Audit Logs Tab */}
                {activeTab === 'audit' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="mb-6 sm:mb-8">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <h2 className="text-2xl sm:text-3xl font-bold mb-2">{t('institution_admin.audit_logs_title')}</h2>
                                    <p className="text-gray-400 text-sm sm:text-base">{t('institution_admin.audit_logs_description')}</p>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    <input
                                        type="date"
                                        value={dateRange.start}
                                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                        className="px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                                    />
                                    <input
                                        type="date"
                                        value={dateRange.end}
                                        onChange={(e) => {
                                            setDateRange({ ...dateRange, end: e.target.value });
                                            if (dateRange.start && e.target.value) {
                                                fetchAuditLogs();
                                            }
                                        }}
                                        className="px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {auditLogsLoading ? (
                            <div className="text-center py-12">
                                <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-gray-400">{t('institution_admin.loading_audit_logs')}</p>
                            </div>
                        ) : auditLogs.length === 0 ? (
                            <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-8 sm:p-12 text-center">
                                <History className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                                <p className="text-gray-400">{t('institution_admin.no_audit_logs')}</p>
                            </div>
                        ) : (
                            <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-black/20 border-b border-white/10">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('institution_admin.audit_date')}</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('institution_admin.audit_action')}</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('institution_admin.audit_user')}</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('institution_admin.audit_details')}</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('institution_admin.audit_ip')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/10">
                                            {auditLogs.map((log, index) => (
                                                <tr key={index} className="hover:bg-white/5 transition-colors">
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                                                        {new Date(log.timestamp).toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                            log.action?.includes('create') || log.action?.includes('add') ? 'bg-green-500/20 text-green-400' :
                                                            log.action?.includes('delete') || log.action?.includes('remove') ? 'bg-red-500/20 text-red-400' :
                                                            log.action?.includes('update') || log.action?.includes('edit') ? 'bg-blue-500/20 text-blue-400' :
                                                            'bg-gray-500/20 text-gray-400'
                                                        }`}>
                                                            {log.action}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{log.user || 'System'}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-300 max-w-xs truncate">{log.details || '-'}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">{log.ipAddress || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="mb-6 sm:mb-8">
                            <h2 className="text-2xl sm:text-3xl font-bold mb-2">{t('institution_admin.settings_title')}</h2>
                            <p className="text-gray-400 text-sm sm:text-base">{t('institution_admin.settings_description')}</p>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                            <form onSubmit={handleUpdateSettings} className="space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-black/20 rounded-lg">
                                        <div>
                                            <h3 className="font-semibold mb-1">{t('institution_admin.ai_features')}</h3>
                                            <p className="text-sm text-gray-400">{t('institution_admin.ai_features_desc')}</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.aiFeaturesEnabled}
                                                onChange={(e) => setSettings({ ...settings, aiFeaturesEnabled: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-black/20 rounded-lg">
                                        <div>
                                            <h3 className="font-semibold mb-1">{t('institution_admin.export_results')}</h3>
                                            <p className="text-sm text-gray-400">{t('institution_admin.export_results_desc')}</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.exportEnabled}
                                                onChange={(e) => setSettings({ ...settings, exportEnabled: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-black/20 rounded-lg">
                                        <div>
                                            <h3 className="font-semibold mb-1">{t('institution_admin.watermark')}</h3>
                                            <p className="text-sm text-gray-400">{t('institution_admin.watermark_desc')}</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.watermarkEnabled}
                                                onChange={(e) => setSettings({ ...settings, watermarkEnabled: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-black/20 rounded-lg">
                                        <div>
                                            <h3 className="font-semibold mb-1">{t('institution_admin.advanced_analytics')}</h3>
                                            <p className="text-sm text-gray-400">{t('institution_admin.advanced_analytics_desc')}</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.analyticsEnabled}
                                                onChange={(e) => setSettings({ ...settings, analyticsEnabled: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                                        </label>
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-500 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-teal-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5" />
                                            {t('institution_admin.save_settings')}
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* Security Settings */}
                        <div className="mt-6 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                            <h3 className="text-lg sm:text-xl font-bold mb-4 flex items-center gap-2">
                                <Shield className="w-5 h-5" />
                                {t('institution_admin.security_settings')}
                            </h3>
                            <form onSubmit={(e) => { e.preventDefault(); handleUpdateSecuritySettings(); }} className="space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-black/20 rounded-lg">
                                        <div>
                                            <h3 className="font-semibold mb-1">{t('institution_admin.two_factor_auth')}</h3>
                                            <p className="text-sm text-gray-400">{t('institution_admin.two_factor_auth_desc')}</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={securitySettings.twoFactorEnabled}
                                                onChange={(e) => setSecuritySettings({ ...securitySettings, twoFactorEnabled: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                                        </label>
                                    </div>

                                    <div className="p-4 bg-black/20 rounded-lg">
                                        <h3 className="font-semibold mb-3">{t('institution_admin.password_policy')}</h3>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-sm text-gray-300 mb-2">{t('institution_admin.min_password_length')}</label>
                                                <input
                                                    type="number"
                                                    min="6"
                                                    max="32"
                                                    value={securitySettings.passwordMinLength}
                                                    onChange={(e) => setSecuritySettings({ ...securitySettings, passwordMinLength: parseInt(e.target.value) })}
                                                    className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={securitySettings.passwordRequireUppercase}
                                                        onChange={(e) => setSecuritySettings({ ...securitySettings, passwordRequireUppercase: e.target.checked })}
                                                        className="w-4 h-4 rounded border-white/20 bg-black/30 text-teal-500 focus:ring-teal-500"
                                                    />
                                                    <span className="text-sm text-gray-300">{t('institution_admin.require_uppercase')}</span>
                                                </label>
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={securitySettings.passwordRequireLowercase}
                                                        onChange={(e) => setSecuritySettings({ ...securitySettings, passwordRequireLowercase: e.target.checked })}
                                                        className="w-4 h-4 rounded border-white/20 bg-black/30 text-teal-500 focus:ring-teal-500"
                                                    />
                                                    <span className="text-sm text-gray-300">{t('institution_admin.require_lowercase')}</span>
                                                </label>
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={securitySettings.passwordRequireNumbers}
                                                        onChange={(e) => setSecuritySettings({ ...securitySettings, passwordRequireNumbers: e.target.checked })}
                                                        className="w-4 h-4 rounded border-white/20 bg-black/30 text-teal-500 focus:ring-teal-500"
                                                    />
                                                    <span className="text-sm text-gray-300">{t('institution_admin.require_numbers')}</span>
                                                </label>
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={securitySettings.passwordRequireSpecialChars}
                                                        onChange={(e) => setSecuritySettings({ ...securitySettings, passwordRequireSpecialChars: e.target.checked })}
                                                        className="w-4 h-4 rounded border-white/20 bg-black/30 text-teal-500 focus:ring-teal-500"
                                                    />
                                                    <span className="text-sm text-gray-300">{t('institution_admin.require_special_chars')}</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-black/20 rounded-lg">
                                        <label className="block text-sm font-semibold text-gray-300 mb-2">{t('institution_admin.session_timeout')}</label>
                                        <select
                                            value={securitySettings.sessionTimeout}
                                            onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: parseInt(e.target.value) })}
                                            className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                                        >
                                            <option value="15">15 {t('institution_admin.minutes')}</option>
                                            <option value="30">30 {t('institution_admin.minutes')}</option>
                                            <option value="60">1 {t('institution_admin.hour')}</option>
                                            <option value="120">2 {t('institution_admin.hours')}</option>
                                            <option value="240">4 {t('institution_admin.hours')}</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-black/20 rounded-lg">
                                        <div>
                                            <h3 className="font-semibold mb-1">{t('institution_admin.require_email_verification')}</h3>
                                            <p className="text-sm text-gray-400">{t('institution_admin.require_email_verification_desc')}</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={securitySettings.requireEmailVerification}
                                                onChange={(e) => setSecuritySettings({ ...securitySettings, requireEmailVerification: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                                        </label>
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-500 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-teal-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            {t('institution_admin.saving')}
                                        </>
                                    ) : (
                                        <>
                                            <Shield className="w-5 h-5" />
                                            {t('institution_admin.save_security_settings')}
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}

                {/* API Management Tab */}
                {activeTab === 'api' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="mb-6 sm:mb-8">
                            <h2 className="text-2xl sm:text-3xl font-bold mb-2">{t('institution_admin.api_management')}</h2>
                            <p className="text-gray-400 text-sm sm:text-base">{t('institution_admin.api_management_description')}</p>
                        </div>

                        <div className="space-y-6">
                            {/* API Keys Section */}
                            <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                                        <Key className="w-5 h-5" />
                                        {t('institution_admin.api_keys')}
                                    </h3>
                                    <button
                                        onClick={() => setIsApiKeyModalOpen(true)}
                                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-teal-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-teal-500/25 transition-all flex items-center gap-2 text-sm sm:text-base"
                                    >
                                        <Plus className="w-4 h-4" />
                                        {t('institution_admin.create_api_key')}
                                    </button>
                                </div>
                                {apiKeys.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400">
                                        <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                        <p>{t('institution_admin.no_api_keys')}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {apiKeys.map((key) => (
                                            <div key={key.id} className="bg-black/20 border border-white/10 rounded-lg p-4">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <h4 className="font-semibold">{key.name}</h4>
                                                            <span className={`px-2 py-1 text-xs rounded-full ${
                                                                key.active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                                                            }`}>
                                                                {key.active ? t('institution_admin.active') : t('institution_admin.inactive')}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-400 mb-2">{key.key}</p>
                                                        <p className="text-xs text-gray-500">{t('institution_admin.created')}: {new Date(key.createdAt).toLocaleDateString()}</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => navigator.clipboard.writeText(key.key)}
                                                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                                            title={t('institution_admin.copy')}
                                                        >
                                                            <Copy className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteApiKey(key.id)}
                                                            className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-red-400"
                                                            title={t('institution_admin.delete')}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Webhooks Section */}
                            <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                                        <Webhook className="w-5 h-5" />
                                        {t('institution_admin.webhooks')}
                                    </h3>
                                    <button
                                        onClick={() => setIsWebhookModalOpen(true)}
                                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-teal-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-teal-500/25 transition-all flex items-center gap-2 text-sm sm:text-base"
                                    >
                                        <Plus className="w-4 h-4" />
                                        {t('institution_admin.create_webhook')}
                                    </button>
                                </div>
                                {webhooks.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400">
                                        <Webhook className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                        <p>{t('institution_admin.no_webhooks')}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {webhooks.map((webhook) => (
                                            <div key={webhook.id} className="bg-black/20 border border-white/10 rounded-lg p-4">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <h4 className="font-semibold">{webhook.url}</h4>
                                                            <span className={`px-2 py-1 text-xs rounded-full ${
                                                                webhook.active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                                                            }`}>
                                                                {webhook.active ? t('institution_admin.active') : t('institution_admin.inactive')}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-400 mb-2">
                                                            {t('institution_admin.events')}: {webhook.events?.join(', ') || 'None'}
                                                        </p>
                                                        <p className="text-xs text-gray-500">{t('institution_admin.created')}: {new Date(webhook.createdAt).toLocaleDateString()}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteWebhook(webhook.id)}
                                                        className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-red-400"
                                                        title={t('institution_admin.delete')}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Help Center Tab */}
                {activeTab === 'help' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="mb-6 sm:mb-8">
                            <h2 className="text-2xl sm:text-3xl font-bold mb-2">{t('institution_admin.help_center')}</h2>
                            <p className="text-gray-400 text-sm sm:text-base">{t('institution_admin.help_center_description')}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-6">
                                <BookOpen className="w-8 h-8 text-teal-400 mb-4" />
                                <h3 className="text-lg font-bold mb-2">{t('institution_admin.documentation')}</h3>
                                <p className="text-sm text-gray-400 mb-4">{t('institution_admin.documentation_description')}</p>
                                <button className="px-4 py-2 bg-teal-500/20 text-teal-400 rounded-lg hover:bg-teal-500/30 transition-colors text-sm">
                                    {t('institution_admin.view_docs')}
                                </button>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-6">
                                <HelpCircle className="w-8 h-8 text-blue-400 mb-4" />
                                <h3 className="text-lg font-bold mb-2">{t('institution_admin.faq')}</h3>
                                <p className="text-sm text-gray-400 mb-4">{t('institution_admin.faq_description')}</p>
                                <button className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm">
                                    {t('institution_admin.view_faq')}
                                </button>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-6">
                                <Mail className="w-8 h-8 text-purple-400 mb-4" />
                                <h3 className="text-lg font-bold mb-2">{t('institution_admin.contact_support')}</h3>
                                <p className="text-sm text-gray-400 mb-4">{t('institution_admin.contact_support_description')}</p>
                                <button className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors text-sm">
                                    {t('institution_admin.contact_us')}
                                </button>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-6">
                                <Zap className="w-8 h-8 text-yellow-400 mb-4" />
                                <h3 className="text-lg font-bold mb-2">{t('institution_admin.quick_start')}</h3>
                                <p className="text-sm text-gray-400 mb-4">{t('institution_admin.quick_start_description')}</p>
                                <button className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors text-sm">
                                    {t('institution_admin.get_started')}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </main>

            {/* Add User Modal */}
            <AnimatePresence>
                {isAddUserModalOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsAddUserModalOpen(false)}
                            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md"
                        />
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 pointer-events-none">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-[#1e293b] border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 max-w-md w-full pointer-events-auto shadow-2xl"
                            >
                                <div className="flex items-center justify-between mb-4 sm:mb-6">
                                    <h2 className="text-xl sm:text-2xl font-bold">{t('institution_admin.add_user_modal_title')}</h2>
                                    <button
                                        onClick={() => setIsAddUserModalOpen(false)}
                                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 hover:text-white" />
                                    </button>
                                </div>

                                <form onSubmit={handleAddUser} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            {t('institution_admin.email_label')} *
                                            <span className="text-xs text-gray-400 ml-2">{t('institution_admin.email_input_hint')}</span>
                                        </label>
                                        <textarea
                                            required
                                            value={newUser.email}
                                            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-black/30 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-sm sm:text-base resize-y min-h-[100px] font-mono"
                                            placeholder={t('institution_admin.email_placeholder') || 'user@example.com\nuser2@example.com\nuser3@example.com'}
                                            rows={6}
                                        />
                                        <p className="text-xs text-gray-400 mt-1">
                                            {t('institution_admin.email_input_description')}
                                        </p>
                                    </div>
                                    <div className="flex gap-3 sm:gap-4 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setIsAddUserModalOpen(false)}
                                            className="flex-1 py-2.5 sm:py-3 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-all text-sm sm:text-base"
                                        >
                                            {t('institution_admin.cancel')}
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="flex-1 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-teal-500 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-teal-500/25 transition-all disabled:opacity-50 text-sm sm:text-base"
                                        >
                                            {loading ? t('institution_admin.adding') : t('institution_admin.add_user')}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>

            {/* Payment Modal for Additional Users */}
            <AnimatePresence>
                {isPaymentModalOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => {
                                setIsPaymentModalOpen(false);
                                setUserValidation(null);
                            }}
                            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md"
                        />
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 pointer-events-none">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-[#1e293b] border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 max-w-lg w-full pointer-events-auto shadow-2xl"
                            >
                                <div className="flex items-center justify-between mb-4 sm:mb-6">
                                    <h2 className="text-xl sm:text-2xl font-bold">{t('institution_admin.user_limit_reached_title')}</h2>
                                    <button
                                        onClick={() => {
                                            setIsPaymentModalOpen(false);
                                            setUserValidation(null);
                                        }}
                                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 hover:text-white" />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                                        <div className="flex items-start gap-3">
                                            <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <p className="text-sm text-yellow-200 font-medium mb-1">{t('institution_admin.user_limit_reached_title')}</p>
                                                <p className="text-xs text-yellow-300/80">
                                                    {t('institution_admin.user_limit_reached_message', { price: t('institution_admin.additional_user_price') })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white/5 rounded-lg p-4">
                                        <p className="text-sm text-gray-300 mb-3">{t('institution_admin.users_to_be_added')}</p>
                                        <div className="max-h-32 overflow-y-auto space-y-1">
                                            {pendingEmails.map((email, index) => (
                                                <div key={index} className="text-xs text-gray-400 font-mono bg-black/30 px-2 py-1 rounded">
                                                    {email}
                                                </div>
                                            ))}
                                        </div>
                                        
                                        {/* Show validation summary if available */}
                                        {userValidation && (
                                            <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                                                {userValidation.existingUsers.length > 0 && (
                                                    <div className="text-xs text-yellow-400">
                                                        <CheckCircle className="w-3 h-3 inline mr-1" />
                                                        {t('institution_admin.users_exist_skipped', { count: userValidation.existingUsers.length })}
                                                    </div>
                                                )}
                                                {userValidation.notFoundUsers.length > 0 && (
                                                    <div className="text-xs text-red-400">
                                                        <AlertCircle className="w-3 h-3 inline mr-1" />
                                                        {t('institution_admin.users_not_found_skipped', { count: userValidation.notFoundUsers.length })}
                                                    </div>
                                                )}
                                                {userValidation.otherInstitutionUsers.length > 0 && (
                                                    <div className="text-xs text-orange-400">
                                                        <AlertCircle className="w-3 h-3 inline mr-1" />
                                                        {t('institution_admin.users_other_institution_skipped', { count: userValidation.otherInstitutionUsers.length })}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        
                                        <div className="mt-4 pt-4 border-t border-white/10">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-300">{t('institution_admin.number_of_users')}</span>
                                                <span className="text-lg font-bold text-white">{pendingEmails.length}</span>
                                            </div>
                                            <div className="flex justify-between items-center mt-2">
                                                <span className="text-sm text-gray-300">{t('institution_admin.price_per_user')}</span>
                                                <span className="text-lg font-bold text-white">{t('institution_admin.price_per_user_value')}</span>
                                            </div>
                                            <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/10">
                                                <span className="text-base font-semibold text-gray-200">{t('institution_admin.total_amount')}</span>
                                                <span className="text-2xl font-bold text-teal-400">{t('institution_admin.total_amount_value', { amount: pendingEmails.length * 499 })}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 sm:gap-4 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsPaymentModalOpen(false);
                                                setPendingEmails([]);
                                                setUserValidation(null);
                                            }}
                                            disabled={paymentLoading}
                                            className="flex-1 py-2.5 sm:py-3 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-all text-sm sm:text-base disabled:opacity-50"
                                        >
                                            {t('institution_admin.cancel')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handlePayment}
                                            disabled={paymentLoading}
                                            className="flex-1 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-teal-500 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-teal-500/25 transition-all disabled:opacity-50 text-sm sm:text-base flex items-center justify-center gap-2"
                                        >
                                            {paymentLoading ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                    {t('institution_admin.processing_payment')}
                                                </>
                                            ) : (
                                                <>
                                                    <CreditCard className="w-4 h-4" />
                                                    {t('institution_admin.pay_button', { amount: pendingEmails.length * 499 })}
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>
            
            {/* Bulk Import Modal */}
            <AnimatePresence>
                {isBulkImportModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                        onClick={() => setIsBulkImportModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#1e293b] rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-hide border border-white/10"
                        >
                            <div className="p-6 border-b border-white/10 flex items-center justify-between">
                                <h2 className="text-xl sm:text-2xl font-bold">{t('institution_admin.bulk_import_title')}</h2>
                                <button
                                    onClick={() => setIsBulkImportModalOpen(false)}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">{t('institution_admin.upload_csv_file')}</label>
                                    <input
                                        type="file"
                                        accept=".csv"
                                        onChange={handleBulkImportFile}
                                        className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-500 file:text-white hover:file:bg-teal-600 cursor-pointer"
                                    />
                                    <p className="mt-2 text-xs text-gray-400">{t('institution_admin.csv_format_help')}</p>
                                </div>
                                {bulkImportPreview.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-300 mb-2">{t('institution_admin.preview')}</h3>
                                        <div className="bg-black/30 rounded-lg overflow-hidden">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-black/50">
                                                        <tr>
                                                            {Object.keys(bulkImportPreview[0]).map((key) => (
                                                                <th key={key} className="px-3 py-2 text-left text-gray-400">{key}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {bulkImportPreview.map((row, idx) => (
                                                            <tr key={idx} className="border-t border-white/10">
                                                                {Object.values(row).map((val, i) => (
                                                                    <td key={i} className="px-3 py-2 text-gray-300">{val}</td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="flex gap-3 justify-end">
                                    <button
                                        onClick={() => setIsBulkImportModalOpen(false)}
                                        className="px-4 py-2 border border-white/20 rounded-lg text-white hover:bg-white/10 transition-colors"
                                    >
                                        {t('institution_admin.cancel')}
                                    </button>
                                    <button
                                        onClick={handleBulkImport}
                                        disabled={!bulkImportFile || isImporting}
                                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-teal-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-teal-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {isImporting ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                {t('institution_admin.importing')}
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="w-4 h-4" />
                                                {t('institution_admin.import_users')}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Reports Generation Modal */}
            <AnimatePresence>
                {isReportsModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                        onClick={() => setIsReportsModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#1e293b] rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-lg border border-white/10"
                        >
                            <div className="p-6 border-b border-white/10 flex items-center justify-between">
                                <h2 className="text-xl sm:text-2xl font-bold">{t('institution_admin.generate_report')}</h2>
                                <button
                                    onClick={() => setIsReportsModalOpen(false)}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={(e) => { e.preventDefault(); handleGenerateReport(); }} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">{t('institution_admin.report_type')}</label>
                                    <select
                                        value={reportConfig.type}
                                        onChange={(e) => setReportConfig({ ...reportConfig, type: e.target.value })}
                                        className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                                    >
                                        <option value="analytics">{t('institution_admin.report_type_analytics')}</option>
                                        <option value="users">{t('institution_admin.report_type_users')}</option>
                                        <option value="presentations">{t('institution_admin.report_type_presentations')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">{t('institution_admin.report_format')}</label>
                                    <select
                                        value={reportConfig.format}
                                        onChange={(e) => setReportConfig({ ...reportConfig, format: e.target.value })}
                                        className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                                    >
                                        <option value="pdf">PDF</option>
                                        <option value="excel">Excel</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">{t('institution_admin.schedule')}</label>
                                    <select
                                        value={reportConfig.schedule}
                                        onChange={(e) => setReportConfig({ ...reportConfig, schedule: e.target.value })}
                                        className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                                    >
                                        <option value="none">{t('institution_admin.schedule_none')}</option>
                                        <option value="daily">{t('institution_admin.schedule_daily')}</option>
                                        <option value="weekly">{t('institution_admin.schedule_weekly')}</option>
                                        <option value="monthly">{t('institution_admin.schedule_monthly')}</option>
                                    </select>
                                </div>
                                {reportConfig.schedule !== 'none' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">{t('institution_admin.email_address')}</label>
                                        <input
                                            type="email"
                                            value={reportConfig.email}
                                            onChange={(e) => setReportConfig({ ...reportConfig, email: e.target.value })}
                                            className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                                            placeholder="admin@institution.com"
                                            required={reportConfig.schedule !== 'none'}
                                        />
                                    </div>
                                )}
                                <div className="flex gap-3 justify-end pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsReportsModalOpen(false)}
                                        className="px-4 py-2 border border-white/20 rounded-lg text-white hover:bg-white/10 transition-colors"
                                    >
                                        {t('institution_admin.cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-teal-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-teal-500/25 transition-all disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {loading ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                {t('institution_admin.generating')}
                                            </>
                                        ) : (
                                            <>
                                                <FileSpreadsheet className="w-4 h-4" />
                                                {t('institution_admin.generate')}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* API Key Modal */}
            <AnimatePresence>
                {isApiKeyModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                        onClick={() => setIsApiKeyModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#1e293b] rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-lg border border-white/10"
                        >
                            <div className="p-6 border-b border-white/10 flex items-center justify-between">
                                <h2 className="text-xl sm:text-2xl font-bold">{t('institution_admin.create_api_key')}</h2>
                                <button
                                    onClick={() => setIsApiKeyModalOpen(false)}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={(e) => { e.preventDefault(); handleCreateApiKey(); }} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">{t('institution_admin.api_key_name')}</label>
                                    <input
                                        type="text"
                                        value={newApiKey.name}
                                        onChange={(e) => setNewApiKey({ ...newApiKey, name: e.target.value })}
                                        className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                                        placeholder={t('institution_admin.api_key_name_placeholder')}
                                        required
                                    />
                                </div>
                                <div className="flex gap-3 justify-end pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsApiKeyModalOpen(false)}
                                        className="px-4 py-2 border border-white/20 rounded-lg text-white hover:bg-white/10 transition-colors"
                                    >
                                        {t('institution_admin.cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-teal-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-teal-500/25 transition-all disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {loading ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                {t('institution_admin.creating')}
                                            </>
                                        ) : (
                                            <>
                                                <Key className="w-4 h-4" />
                                                {t('institution_admin.create')}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Webhook Modal */}
            <AnimatePresence>
                {isWebhookModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                        onClick={() => setIsWebhookModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#1e293b] rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-lg border border-white/10"
                        >
                            <div className="p-6 border-b border-white/10 flex items-center justify-between">
                                <h2 className="text-xl sm:text-2xl font-bold">{t('institution_admin.create_webhook')}</h2>
                                <button
                                    onClick={() => setIsWebhookModalOpen(false)}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={(e) => { e.preventDefault(); handleCreateWebhook(); }} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">{t('institution_admin.webhook_url')}</label>
                                    <input
                                        type="url"
                                        value={newWebhook.url}
                                        onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                                        className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                                        placeholder="https://your-server.com/webhook"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">{t('institution_admin.webhook_secret')}</label>
                                    <input
                                        type="text"
                                        value={newWebhook.secret}
                                        onChange={(e) => setNewWebhook({ ...newWebhook, secret: e.target.value })}
                                        className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                                        placeholder={t('institution_admin.webhook_secret_placeholder')}
                                    />
                                </div>
                                <div className="flex gap-3 justify-end pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsWebhookModalOpen(false)}
                                        className="px-4 py-2 border border-white/20 rounded-lg text-white hover:bg-white/10 transition-colors"
                                    >
                                        {t('institution_admin.cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-teal-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-teal-500/25 transition-all disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {loading ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                {t('institution_admin.creating')}
                                            </>
                                        ) : (
                                            <>
                                                <Webhook className="w-4 h-4" />
                                                {t('institution_admin.create')}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Join Presentation Dialog */}
            <AnimatePresence>
                {isJoinDialogOpen && (
                    <JoinPresentationDialog onCancel={setIsJoinDialogOpen} />
                )}
            </AnimatePresence>
        </div>
    );
};

export default InstitutionAdmin;


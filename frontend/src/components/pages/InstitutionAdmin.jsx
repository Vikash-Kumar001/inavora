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
    Eye,
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
    Image as ImageIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import { translateError } from '../../utils/errorTranslator';
import api from '../../config/api';
import { io } from 'socket.io-client';
import { JoinPresentationDialog } from '../common/JoinPresentationDialog';

const InstitutionAdmin = () => {
    const navigate = useNavigate();
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
    
    // Modals
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [isBrandingModalOpen, setIsBrandingModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
    const [newUser, setNewUser] = useState({ email: '', displayName: '' });
    
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
        } else if (activeTab === 'branding') {
            // Branding data will be loaded from institution
        } else if (activeTab === 'settings') {
            // Settings data will be loaded from institution
        }
    }, [activeTab, isAuthenticated, currentPage, usersPage, searchQuery, presentationStatus]);

    const verifyToken = async (token) => {
        try {
            const response = await api.get('/institution-admin/verify', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
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
            sessionStorage.removeItem('institutionAdminToken');
            setIsAuthenticated(false);
            navigate('/login', { state: { from: '/institution-admin' } });
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
                    limit: 20,
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
                params: { period: 30 }
            });
            if (response.data.success) {
                setAnalytics(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
            toast.error(t('institution_admin.fetch_analytics_error'));
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await api.post('/institution-admin/users', newUser);
            if (response.data.success) {
                toast.success(t('institution_admin.user_added_success'));
                setNewUser({ email: '', displayName: '' });
                setIsAddUserModalOpen(false);
                fetchUsers();
                fetchStats();
            }
        } catch (error) {
            toast.error(translateError(error, t, 'institution_admin.add_user_error'));
        } finally {
            setLoading(false);
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

    const handleExport = async (type) => {
        try {
            const response = await api.get('/institution-admin/export', {
                params: { type }
            });
            
            if (response.data.success) {
                // Create blob and download
                const blob = new Blob([JSON.stringify(response.data.data, null, 2)], { type: 'application/json' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `institution-${type}-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                
                toast.success(t('institution_admin.export_success', { type }));
            }
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
        <div className="min-h-screen bg-[#0f172a] text-white overflow-x-hidden font-sans">
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
                            <span className="hidden sm:inline">Logout</span>
                        </button>
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center border border-white/30 px-3 py-1 rounded-lg gap-2 text-xs sm:text-sm font-medium text-gray-300 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">Back</span>
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
                        Join Presentation
                    </button>
                    <button
                        onClick={() => navigate('/presentation/new')}
                        className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-teal-500 text-white font-bold px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-teal-500/25 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus className="h-5 w-5" />
                        New Presentation
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 sm:gap-4 mb-6 sm:mb-8 border-b border-white/10 overflow-x-auto">
                    {[
                        { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                        { id: 'users', label: 'Users', icon: Users },
                        { id: 'presentations', label: 'Presentations', icon: Presentation },
                        { id: 'analytics', label: 'Analytics', icon: TrendingUp },
                        { id: 'branding', label: 'Branding', icon: Palette },
                        { id: 'settings', label: 'Settings', icon: Settings }
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
                            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Dashboard Overview</h2>
                            <p className="text-gray-400 text-sm sm:text-base">Monitor your institution's activity and performance</p>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
                            <div className="bg-white/5 border border-white/10 p-4 sm:p-6 rounded-xl sm:rounded-2xl">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-gray-400 text-xs sm:text-sm">Total Users</span>
                                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                                </div>
                                <p className="text-2xl sm:text-3xl font-bold">{stats.totalUsers || 0}</p>
                                <p className="text-xs sm:text-sm text-gray-500 mt-1">{stats.activeUsers || 0} active</p>
                            </div>

                            <div className="bg-white/5 border border-white/10 p-4 sm:p-6 rounded-xl sm:rounded-2xl">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-gray-400 text-xs sm:text-sm">Presentations</span>
                                    <Presentation className="w-4 h-4 sm:w-5 sm:h-5 text-teal-400" />
                                </div>
                                <p className="text-2xl sm:text-3xl font-bold">{stats.totalPresentations || 0}</p>
                                <p className="text-xs sm:text-sm text-gray-500 mt-1">{stats.livePresentations || 0} live</p>
                            </div>

                            <div className="bg-white/5 border border-white/10 p-4 sm:p-6 rounded-xl sm:rounded-2xl">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-gray-400 text-xs sm:text-sm">Total Slides</span>
                                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                                </div>
                                <p className="text-2xl sm:text-3xl font-bold">{stats.totalSlides || 0}</p>
                                <p className="text-xs sm:text-sm text-gray-500 mt-1">{stats.recentPresentations || 0} recent</p>
                            </div>

                            <div className="bg-white/5 border border-white/10 p-4 sm:p-6 rounded-xl sm:rounded-2xl">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-gray-400 text-xs sm:text-sm">Total Responses</span>
                                    <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                                </div>
                                <p className="text-2xl sm:text-3xl font-bold">{stats.totalResponses || 0}</p>
                                <p className="text-xs sm:text-sm text-gray-500 mt-1">{stats.recentResponses || 0} recent</p>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                            <h3 className="text-lg sm:text-xl font-bold mb-4">Quick Actions</h3>
                            <div className="flex flex-wrap gap-3 sm:gap-4">
                                <button
                                    onClick={() => setActiveTab('users')}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm sm:text-base"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add User
                                </button>
                                <button
                                    onClick={() => handleExport('presentations')}
                                    className="flex items-center gap-2 px-4 py-2 bg-teal-500/20 text-teal-400 rounded-lg hover:bg-teal-500/30 transition-colors text-sm sm:text-base"
                                >
                                    <Download className="w-4 h-4" />
                                    Export Presentations
                                </button>
                                <button
                                    onClick={() => handleExport('users')}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors text-sm sm:text-base"
                                >
                                    <Download className="w-4 h-4" />
                                    Export Users
                                </button>
                                <button
                                    onClick={() => setActiveTab('analytics')}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors text-sm sm:text-base"
                                >
                                    <TrendingUp className="w-4 h-4" />
                                    View Analytics
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
                                <h2 className="text-2xl sm:text-3xl font-bold mb-2">User Management</h2>
                                <p className="text-gray-400 text-sm sm:text-base">Manage institution users</p>
                            </div>
                            <button
                                onClick={() => setIsAddUserModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-teal-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-teal-500/25 transition-all text-sm sm:text-base"
                            >
                                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                                Add User
                            </button>
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
                                    placeholder="Search users by name or email..."
                                    className="w-full pl-10 sm:pl-12 pr-4 py-2 sm:py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-sm sm:text-base"
                                />
                            </div>
                        </div>

                        {/* Users List */}
                        {usersLoading ? (
                            <div className="text-center py-12">
                                <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-gray-400">Loading users...</p>
                            </div>
                        ) : users.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>No users found</p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-3 sm:space-y-4">
                                    {users.map((user) => (
                                        <div key={user.id} className="bg-white/5 border border-white/10 p-4 sm:p-6 rounded-xl sm:rounded-2xl">
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                                                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                                    {user.photoURL ? (
                                                        <img src={user.photoURL} alt={user.displayName} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full" />
                                                    ) : (
                                                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center text-white font-bold text-sm sm:text-base">
                                                            {user.displayName.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-base sm:text-lg font-bold truncate">{user.displayName}</h3>
                                                        <p className="text-gray-400 text-xs sm:text-sm truncate">{user.email}</p>
                                                        <div className="flex flex-wrap gap-2 sm:gap-3 mt-1 sm:mt-2">
                                                            <span className="text-xs text-gray-500">{user.presentationCount || 0} presentations</span>
                                                            <span className="text-xs text-gray-500">{user.slideCount || 0} slides</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 sm:gap-3">
                                                    <button
                                                        onClick={() => handleRemoveUser(user.id)}
                                                        className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Pagination */}
                                {usersPagination.pages > 1 && (
                                    <div className="flex items-center justify-center gap-2 mt-6">
                                        <button
                                            onClick={() => setUsersPage(prev => Math.max(1, prev - 1))}
                                            disabled={usersPage === 1}
                                            className="px-3 py-2 bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Previous
                                        </button>
                                        <span className="text-sm text-gray-400">
                                            Page {usersPagination.page} of {usersPagination.pages}
                                        </span>
                                        <button
                                            onClick={() => setUsersPage(prev => Math.min(usersPagination.pages, prev + 1))}
                                            disabled={usersPage === usersPagination.pages}
                                            className="px-3 py-2 bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Next
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
                            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Presentations</h2>
                            <p className="text-gray-400 text-sm sm:text-base">View all presentations by institution users</p>
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
                                    placeholder="Search presentations..."
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
                                <option value="all">All Presentations</option>
                                <option value="live">Live</option>
                                <option value="ended">Ended</option>
                            </select>
                        </div>

                        {/* Presentations List */}
                        {presentationsLoading ? (
                            <div className="text-center py-12">
                                <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-gray-400">Loading presentations...</p>
                            </div>
                        ) : presentations.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <Presentation className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>No presentations found</p>
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
                                            Previous
                                        </button>
                                        <span className="text-sm text-gray-400">
                                            Page {pagination.page} of {pagination.pages}
                                        </span>
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
                                            disabled={currentPage === pagination.pages}
                                            className="px-3 py-2 bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                        >
                                            Next
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
                        <div className="mb-6 sm:mb-8">
                            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Analytics</h2>
                            <p className="text-gray-400 text-sm sm:text-base">Track engagement and usage metrics</p>
                        </div>

                        {analytics ? (
                            <div className="space-y-6">
                                {/* Summary Cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                                    <div className="bg-white/5 border border-white/10 p-4 sm:p-6 rounded-xl sm:rounded-2xl">
                                        <p className="text-gray-400 text-xs sm:text-sm mb-2">Total Presentations</p>
                                        <p className="text-2xl sm:text-3xl font-bold">{analytics.totalPresentations || 0}</p>
                                        <p className="text-xs text-gray-500 mt-1">Last {analytics.period} days</p>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 p-4 sm:p-6 rounded-xl sm:rounded-2xl">
                                        <p className="text-gray-400 text-xs sm:text-sm mb-2">Total Responses</p>
                                        <p className="text-2xl sm:text-3xl font-bold">{analytics.totalResponses || 0}</p>
                                        <p className="text-xs text-gray-500 mt-1">Last {analytics.period} days</p>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 p-4 sm:p-6 rounded-xl sm:rounded-2xl">
                                        <p className="text-gray-400 text-xs sm:text-sm mb-2">Top Presentations</p>
                                        <p className="text-2xl sm:text-3xl font-bold">{analytics.topPresentations?.length || 0}</p>
                                        <p className="text-xs text-gray-500 mt-1">By engagement</p>
                                    </div>
                                </div>

                                {/* Top Presentations */}
                                {analytics.topPresentations && analytics.topPresentations.length > 0 && (
                                    <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                                        <h3 className="text-lg sm:text-xl font-bold mb-4">Top Presentations</h3>
                                        <div className="space-y-3">
                                            {analytics.topPresentations.map((pres, index) => (
                                                <div key={pres.presentationId} className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                                                    <div className="flex items-center gap-3 sm:gap-4">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center text-white font-bold text-sm">
                                                            {index + 1}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-sm sm:text-base">{pres.title}</p>
                                                            <p className="text-xs sm:text-sm text-gray-400">Code: {pres.accessCode}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-lg sm:text-xl font-bold text-teal-400">{pres.responseCount}</p>
                                                        <p className="text-xs text-gray-400">responses</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-gray-400">Loading analytics...</p>
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
                            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Custom Branding</h2>
                            <p className="text-gray-400 text-sm sm:text-base">Customize your institution's branding</p>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                            <form onSubmit={handleUpdateBranding} className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Primary Color</label>
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
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Secondary Color</label>
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
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Logo URL</label>
                                        <input
                                            type="url"
                                            value={branding.logoUrl}
                                            onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
                                            className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-sm"
                                            placeholder="https://example.com/logo.png"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Custom Domain (Optional)</label>
                                        <input
                                            type="text"
                                            value={branding.customDomain}
                                            onChange={(e) => setBranding({ ...branding, customDomain: e.target.value })}
                                            className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-sm"
                                            placeholder="presentations.yourinstitution.com"
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
                                            Save Branding
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="mb-6 sm:mb-8">
                            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Settings</h2>
                            <p className="text-gray-400 text-sm sm:text-base">Manage institution settings and features</p>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                            <form onSubmit={handleUpdateSettings} className="space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-black/20 rounded-lg">
                                        <div>
                                            <h3 className="font-semibold mb-1">AI Features</h3>
                                            <p className="text-sm text-gray-400">Enable AI-powered features for presentations</p>
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
                                            <h3 className="font-semibold mb-1">Export Results</h3>
                                            <p className="text-sm text-gray-400">Allow users to export presentation results</p>
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
                                            <h3 className="font-semibold mb-1">Watermark</h3>
                                            <p className="text-sm text-gray-400">Show watermark on presentations</p>
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
                                            <h3 className="font-semibold mb-1">Advanced Analytics</h3>
                                            <p className="text-sm text-gray-400">Enable detailed analytics tracking</p>
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
                                            Save Settings
                                        </>
                                    )}
                                </button>
                            </form>
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
                                    <h2 className="text-xl sm:text-2xl font-bold">Add User</h2>
                                    <button
                                        onClick={() => setIsAddUserModalOpen(false)}
                                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 hover:text-white" />
                                    </button>
                                </div>

                                <form onSubmit={handleAddUser} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Email *</label>
                                        <input
                                            type="email"
                                            required
                                            value={newUser.email}
                                            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-black/30 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-sm sm:text-base"
                                            placeholder="user@example.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Display Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={newUser.displayName}
                                            onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-black/30 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-sm sm:text-base"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div className="flex gap-3 sm:gap-4 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setIsAddUserModalOpen(false)}
                                            className="flex-1 py-2.5 sm:py-3 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-all text-sm sm:text-base"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="flex-1 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-teal-500 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-teal-500/25 transition-all disabled:opacity-50 text-sm sm:text-base"
                                        >
                                            {loading ? 'Adding...' : 'Add User'}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    </>
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


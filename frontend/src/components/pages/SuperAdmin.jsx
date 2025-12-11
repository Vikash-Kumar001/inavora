// eslint-disable-next-line
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../config/api';
import { useTranslation } from 'react-i18next';
import { translateError } from '../../utils/errorTranslator';

// Icons
import { 
  TrendingUp, Briefcase, FileText, Lock, ArrowLeft, Plus, Edit2, Trash2, 
  CheckCircle, Clock, MapPin, Users, Download, X, Eye, ChevronDown,
  ChevronUp, Filter, Search, Bell
} from 'lucide-react';

const SuperAdmin = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({});
  const [jobPostings, setJobPostings] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentJob, setCurrentJob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const fileInputRef = useRef(null);

  // Check authentication on mount
  useEffect(() => {
    const token = sessionStorage.getItem('superAdminToken');
    if (token) {
      // Verify token with backend
      verifyToken(token);
    }
  }, []);

  const verifyToken = async (token) => {
    try {
      const response = await api.get('/super-admin/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.data.success) {
        setIsAuthenticated(true);
      } else {
        sessionStorage.removeItem('superAdminToken');
        setIsAuthenticated(false);
      }
    } catch (error) {
      sessionStorage.removeItem('superAdminToken');
      setIsAuthenticated(false);
    }
  };

  // Socket.IO connection for real-time updates
  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:4001');
        
    socket.on('new-application', (data) => {
      toast.success(t('toasts.super_admin.new_application', { candidateName: data.candidateName, position: data.position }));
      setNotifications(prev => [data, ...prev]);
      fetchApplications();
      fetchStats();
    });

    socket.on('job-posting-created', () => {
      fetchJobPostings();
    });

    socket.on('job-posting-updated', () => {
      fetchJobPostings();
    });

    socket.on('job-posting-deleted', () => {
      fetchJobPostings();
    });

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchJobPostings();
    fetchApplications();
    fetchStats();
  }, [activeTab, isAuthenticated]);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (!password) {
      setPasswordError('Please enter a password');
      return;
    }

    try {
      const response = await api.post('/super-admin/login', { password });
      
      if (response.data.success && response.data.token) {
        // Store token in sessionStorage
        sessionStorage.setItem('superAdminToken', response.data.token);
        setIsAuthenticated(true);
        setPassword('');
        setPasswordError('');
        toast.success(t('super_admin.access_granted'));
      } else {
        setPasswordError('Invalid password. Please try again.');
        setPassword('');
        toast.error(t('super_admin.invalid_password'));
      }
    } catch (error) {
      const errorMessage = translateError(error, t, 'common.something_went_wrong');
      setPasswordError(errorMessage);
      setPassword('');
      toast.error(errorMessage);
    }
  };

  const fetchJobPostings = async () => {
    try {
      const response = await api.get('/job-postings');
      if (response.data.success) {
        setJobPostings(response.data.data.jobPostings || response.data.data);
      }
    } catch (error) {
      console.error('Error fetching job postings:', error);
      toast.error(t('super_admin.fetch_job_postings_error'));
    }
  };

  const fetchApplications = async () => {
    try {
      const response = await api.get('/careers/applications');
      if (response.data.success) {
        setApplications(response.data.data.applications || response.data.data);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/job-postings/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleOpenModal = (job = null) => {
    if (job) {
      setCurrentJob(job);
      setFormData({
        title: job.title || '',
        department: job.department || '',
        location: job.location || 'Remote / Chennai',
        type: job.type || 'Full-time',
        description: job.description || '',
        requirements: job.requirements || [],
        responsibilities: job.responsibilities || [],
        benefits: job.benefits || [],
        salaryRange: job.salaryRange || { min: '', max: '', currency: 'INR' },
        experienceLevel: job.experienceLevel || 'Mid Level',
        status: job.status || 'draft',
        expiresAt: job.expiresAt ? new Date(job.expiresAt).toISOString().split('T')[0] : ''
      });
    } else {
      setCurrentJob(null);
      setFormData({
        title: '',
        department: '',
        location: 'Remote / Chennai',
        type: 'Full-time',
        description: '',
        requirements: [],
        responsibilities: [],
        benefits: [],
        salaryRange: { min: '', max: '', currency: 'INR' },
        experienceLevel: 'Mid Level',
        status: 'draft',
        expiresAt: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentJob(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        salaryRange: {
          min: formData.salaryRange.min ? parseInt(formData.salaryRange.min) : null,
          max: formData.salaryRange.max ? parseInt(formData.salaryRange.max) : null,
          currency: formData.salaryRange.currency
        }
      };

      if (currentJob) {
        await api.put(`/job-postings/${currentJob._id}`, payload);
        toast.success(t('super_admin.job_posting_updated'));
      } else {
        await api.post('/job-postings', payload);
        toast.success(t('super_admin.job_posting_created'));
      }

      fetchJobPostings();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving job posting:', error);
      toast.error(translateError(error, t, 'super_admin.save_job_posting_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('super_admin.delete_job_confirm'))) return;

    try {
      await api.delete(`/job-postings/${id}`);
      toast.success(t('super_admin.job_posting_deleted'));
      fetchJobPostings();
    } catch (error) {
      console.error('Error deleting job posting:', error);
      toast.error(t('super_admin.delete_job_posting_error'));
    }
  };

  const handleUpdateApplicationStatus = async (id, status) => {
    try {
      await api.patch(`/careers/applications/${id}/status`, { status });
      toast.success(t('super_admin.application_status_updated'));
      fetchApplications();
      fetchStats();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(t('super_admin.update_status_error'));
    }
  };

  const addItem = (type, value) => {
    if (value.trim()) {
      // Split by newlines to handle pasted multi-line content
      const lines = value.split(/\r?\n/).filter(line => line.trim());
      
      // Process each line: remove bullet points, numbers, dashes, and trim
      const processedItems = lines.map(line => {
        // Remove common bullet point markers: •, -, *, numbers with dots, etc.
        let cleaned = line.trim()
          .replace(/^[•\-\*]\s*/, '') // Remove bullet points
          .replace(/^\d+[\.\)]\s*/, '') // Remove numbered lists (1., 2), etc.)
          .replace(/^[○●▪▫]\s*/, '') // Remove other bullet types
          .trim();
        return cleaned;
      }).filter(item => item.length > 0); // Remove empty items

      if (processedItems.length > 0) {
        setFormData(prev => ({
          ...prev,
          [type]: [...prev[type], ...processedItems]
        }));
        if (type === 'requirements') setNewRequirement('');
        if (type === 'responsibilities') setNewResponsibility('');
        if (type === 'benefits') setNewBenefit('');
      }
    }
  };

  const removeItem = (type, index) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'draft': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'closed': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  const handleDownloadResume = async (resumeUrl, fileName) => {
    try {
      // Fetch the file
      const response = await fetch(resumeUrl);
      const blob = await response.blob();
      
      // Create a blob URL
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Create a temporary link element
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName || 'resume.pdf';
      document.body.appendChild(link);
      
      // Trigger download
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      
      toast.success(t('super_admin.resume_downloaded'));
    } catch (error) {
      console.error('Error downloading resume:', error);
      toast.error(t('super_admin.download_resume_error'));
      // Fallback: open in new tab
      window.open(resumeUrl, '_blank');
    }
  };

  const getApplicationStatusColor = (status) => {
    switch (status) {
      case 'accepted': return 'bg-green-500/20 text-green-400';
      case 'rejected': return 'bg-red-500/20 text-red-400';
      case 'shortlisted': return 'bg-blue-500/20 text-blue-400';
      case 'interview': return 'bg-purple-500/20 text-purple-400';
      case 'reviewing': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  // Show password modal if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-white overflow-x-hidden font-sans flex items-center justify-center p-4">
        {/* Background */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-600/10 blur-[120px] animate-pulse delay-1000" />
        </div>

        {/* Password Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 bg-[#1e293b] border border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl"
        >
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Super Admin Access</h2>
            <p className="text-gray-400 text-sm sm:text-base">Please enter the password to continue</p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                }}
                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                placeholder="Enter password"
                autoFocus
              />
              {passwordError && (
                <p className="text-red-400 text-sm mt-2">{passwordError}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-teal-500 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-teal-500/25 transition-all"
            >
              Access Dashboard
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-gray-400 hover:text-white text-sm transition-colors flex items-center justify-center gap-2 mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </button>
          </div>
        </motion.div>
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
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
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
            <span className="text-sm text-gray-400">Super Admin</span>
          </div>

          <div className="flex items-center gap-4">
            {notifications.length > 0 && (
              <div className="relative">
                <Bell className="w-5 h-5 text-teal-400" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center">
                  {notifications.length}
                </span>
              </div>
            )}
            <button
              onClick={() => {
                sessionStorage.removeItem('superAdminToken');
                setIsAuthenticated(false);
                toast.success(t('super_admin.logged_out'));
                navigate('/');
              }}
              className="flex items-center border border-red-500/30 px-3 py-1 rounded-lg gap-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
            >
              <Lock className="w-4 h-4" />
              {t('super_admin.logout')}
            </button>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center border border-white/30 px-3 py-1 rounded-lg gap-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('super_admin.back')}
            </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 pt-24 pb-20 container mx-auto px-6">
        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-white/10">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
            { id: 'jobs', label: 'Job Postings', icon: Briefcase },
            { id: 'applications', label: 'Applications', icon: FileText }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-teal-400 text-teal-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">{t('super_admin.stats.total_jobs')}</span>
                  <Briefcase className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-3xl font-bold">{stats.totalJobs || 0}</p>
                <p className="text-sm text-gray-400 mt-1">{stats.activeJobs || 0} {t('super_admin.stats.active')}</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">{t('super_admin.stats.total_applications')}</span>
                  <FileText className="w-5 h-5 text-teal-400" />
                </div>
                <p className="text-3xl font-bold">{stats.totalApplications || 0}</p>
                <p className="text-sm text-gray-400 mt-1">{stats.pendingApplications || 0} {t('super_admin.stats.pending')}</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">{t('super_admin.stats.active_jobs')}</span>
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-3xl font-bold">{stats.activeJobs || 0}</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">{t('super_admin.stats.pending_review')}</span>
                  <Clock className="w-5 h-5 text-yellow-400" />
                </div>
                <p className="text-3xl font-bold">{stats.pendingApplications || 0}</p>
              </div>
            </div>

            {/* Recent Applications */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-4">{t('super_admin.recent_applications')}</h3>
              <div className="space-y-3">
                {stats.recentApplications?.slice(0, 5).map((app, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-black/20 rounded-xl">
                    <div>
                      <p className="font-medium">{app.firstName} {app.lastName}</p>
                      <p className="text-sm text-gray-400">{app.position}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs ${getApplicationStatusColor(app.status)}`}>
                      {app.status}
                    </span>
                  </div>
                )) || <p className="text-gray-400">{t('super_admin.no_recent_applications')}</p>}
              </div>
            </div>
          </motion.div>
        )}

        {/* Job Postings Tab */}
        {activeTab === 'jobs' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">{t('super_admin.job_postings')}</h2>
              <button
                onClick={() => handleOpenModal()}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-teal-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-teal-500/25 transition-all"
              >
                <Plus className="w-5 h-5" />
                {t('super_admin.create_job_posting')}
              </button>
            </div>

            <div className="grid gap-4">
              {jobPostings.map((job) => (
                <div key={job._id} className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold mb-2">{job.title}</h3>
                      <div className="flex flex-wrap gap-3 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-4 h-4" />
                          {job.department}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {job.applicationCount || 0} applications
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs border ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                      <button
                        onClick={() => handleOpenModal(job)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(job._id)}
                        className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-300 mb-4 line-clamp-2">{job.description}</p>
                </div>
              ))}
              {jobPostings.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{t('super_admin.no_job_postings_yet')}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Applications Tab */}
        {activeTab === 'applications' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-2xl font-bold mb-6">{t('super_admin.job_applications')}</h2>
            <div className="space-y-4">
              {applications.map((app) => (
                <div key={app._id} className="bg-white/5 border border-white/10 p-4 sm:p-6 rounded-xl sm:rounded-2xl">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4">
                    <div className="flex-1 cursor-pointer min-w-0" onClick={() => {
                      setSelectedApplication(app);
                      setIsApplicationModalOpen(true);
                    }}>
                      <h3 className="text-base sm:text-lg font-bold break-words">{app.firstName} {app.lastName}</h3>
                      <p className="text-gray-400 text-sm sm:text-base break-all">{app.email}</p>
                      <p className="text-xs sm:text-sm text-gray-400 mt-1">{app.position} - {app.department}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Applied: {new Date(app.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-medium border ${getApplicationStatusColor(app.status)} text-center sm:text-left`}>
                        {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                      </span>
                      <div className="relative">
                        <select
                          value={app.status}
                          onChange={(e) => handleUpdateApplicationStatus(app._id, e.target.value)}
                          className="w-full sm:w-auto px-3 sm:px-4 py-2 sm:py-2.5 bg-black/40 border border-white/20 rounded-lg text-xs sm:text-sm text-white font-medium cursor-pointer hover:bg-black/60 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all appearance-none pr-8 sm:pr-10 min-w-[120px] sm:min-w-[160px] shadow-lg backdrop-blur-sm"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 0.5rem center',
                            backgroundSize: '14px 14px'
                          }}
                        >
                          <option value="pending" className="bg-[#1e293b] text-yellow-400 py-2">Pending</option>
                          <option value="reviewing" className="bg-[#1e293b] text-yellow-400 py-2">Reviewing</option>
                          <option value="shortlisted" className="bg-[#1e293b] text-blue-400 py-2">Shortlisted</option>
                          <option value="interview" className="bg-[#1e293b] text-purple-400 py-2">Interview</option>
                          <option value="accepted" className="bg-[#1e293b] text-green-400 py-2">Accepted</option>
                          <option value="rejected" className="bg-[#1e293b] text-red-400 py-2">Rejected</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedApplication(app);
                        setIsApplicationModalOpen(true);
                      }}
                      className="text-teal-400 hover:text-teal-300 flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">{t('super_admin.view_details')}</span>
                      <span className="sm:hidden">{t('super_admin.view')}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (app.resume?.url) {
                          handleDownloadResume(app.resume.url, app.resume.fileName);
                        }
                      }}
                      className="text-teal-400 hover:text-teal-300 flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      {t('super_admin.resume')}
                    </button>
                    {app.linkedinUrl && (
                      <a 
                        href={app.linkedinUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-blue-400 hover:text-blue-300"
                        onClick={(e) => e.stopPropagation()}
                      >
                        LinkedIn
                      </a>
                    )}
                  </div>
                </div>
              ))}
              {applications.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No applications yet</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </main>

      {/* Create/Edit Job Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#1e293b] border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 max-w-5xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto shadow-2xl"
              >
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                  {/* Header - Fixed */}
                  <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-white/10 flex-shrink-0 gap-3">
                    <h2 className="text-xl sm:text-2xl font-bold text-white flex-1">{currentJob ? 'Edit Job Posting' : 'Create Job Posting'}</h2>
                    <button type="button" onClick={handleCloseModal} className="p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0">
                      <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 hover:text-white" />
                    </button>
                  </div>

                  {/* Scrollable Content */}
                  <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 space-y-4 sm:space-y-6 custom-scrollbar min-h-0">
                    {/* Basic Information */}
                    <div className="bg-white/5 border border-white/10 rounded-lg sm:rounded-xl p-4 sm:p-5">
                      <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 pb-2 border-b border-white/10">Basic Information</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Job Title *</label>
                          <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-black/30 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-sm sm:text-base"
                            placeholder="Senior Frontend Developer"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Department *</label>
                          <input
                            type="text"
                            required
                            value={formData.department}
                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-black/30 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-sm sm:text-base"
                            placeholder="Engineering"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Location</label>
                          <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-black/30 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-sm sm:text-base"
                            placeholder="Remote / Chennai"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Job Type</label>
                          <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-black/30 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-sm sm:text-base"
                          >
                            <option value="Full-time">Full-time</option>
                            <option value="Part-time">Part-time</option>
                            <option value="Contract">Contract</option>
                            <option value="Internship">Internship</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Experience Level</label>
                          <select
                            value={formData.experienceLevel}
                            onChange={(e) => setFormData({ ...formData, experienceLevel: e.target.value })}
                            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-black/30 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-sm sm:text-base"
                          >
                            <option value="Entry Level">Entry Level</option>
                            <option value="Mid Level">Mid Level</option>
                            <option value="Senior Level">Senior Level</option>
                            <option value="Executive">Executive</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                          <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-black/30 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-sm sm:text-base"
                          >
                            <option value="draft">Draft</option>
                            <option value="active">Active</option>
                            <option value="closed">Closed</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="bg-white/5 border border-white/10 rounded-lg sm:rounded-xl p-4 sm:p-5">
                      <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 pb-2 border-b border-white/10">Description *</h3>
                      <textarea
                        required
                        rows={5}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-black/30 border border-white/10 rounded-lg text-white resize-none focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all custom-scrollbar text-sm sm:text-base"
                        placeholder="Job description..."
                      />
                    </div>

                    {/* Requirements */}
                    <div className="bg-white/5 border border-white/10 rounded-lg sm:rounded-xl p-4 sm:p-5">
                      <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 pb-2 border-b border-white/10">Requirements</h3>
                      <div className="mb-3">
                        <textarea
                          value={newRequirement}
                          onChange={(e) => setNewRequirement(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              addItem('requirements', newRequirement);
                            }
                          }}
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-black/30 border border-white/10 rounded-lg text-white resize-none min-h-[40px] max-h-[120px] focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all custom-scrollbar text-sm sm:text-base"
                          placeholder="Add requirement(s) and press Enter. Paste multiple lines to add multiple requirements at once."
                          rows={1}
                        />
                      </div>
                      {formData.requirements.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {formData.requirements.map((req, index) => (
                            <span key={index} className="flex items-center gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-teal-500/20 text-teal-300 rounded-lg text-xs sm:text-sm border border-teal-500/30">
                              <span className="break-words max-w-[200px] sm:max-w-[300px]">{req}</span>
                              <button 
                                type="button" 
                                onClick={() => removeItem('requirements', index)}
                                className="hover:bg-teal-500/30 rounded p-0.5 transition-colors flex-shrink-0"
                              >
                                <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Responsibilities */}
                    <div className="bg-white/5 border border-white/10 rounded-lg sm:rounded-xl p-4 sm:p-5">
                      <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 pb-2 border-b border-white/10">Responsibilities</h3>
                      <div className="mb-3">
                        <textarea
                          value={newResponsibility}
                          onChange={(e) => setNewResponsibility(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              addItem('responsibilities', newResponsibility);
                            }
                          }}
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-black/30 border border-white/10 rounded-lg text-white resize-none min-h-[40px] max-h-[120px] focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all custom-scrollbar text-sm sm:text-base"
                          placeholder="Add responsibility(ies) and press Enter. Paste multiple lines to add multiple responsibilities at once."
                          rows={1}
                        />
                      </div>
                      {formData.responsibilities.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {formData.responsibilities.map((resp, index) => (
                            <span key={index} className="flex items-center gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-500/20 text-blue-300 rounded-lg text-xs sm:text-sm border border-blue-500/30">
                              <span className="break-words max-w-[200px] sm:max-w-[300px]">{resp}</span>
                              <button 
                                type="button" 
                                onClick={() => removeItem('responsibilities', index)}
                                className="hover:bg-blue-500/30 rounded p-0.5 transition-colors flex-shrink-0"
                              >
                                <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer - Fixed */}
                  <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-white/10 flex-shrink-0">
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        className="w-full sm:flex-1 py-2.5 sm:py-3 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-all text-sm sm:text-base"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full sm:flex-1 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-teal-500 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-teal-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                      >
                        {loading ? (
                          <>
                            <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span className="hidden sm:inline">Saving...</span>
                            <span className="sm:hidden">Saving</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span className="hidden sm:inline">{currentJob ? 'Update' : 'Create'} Job Posting</span>
                            <span className="sm:hidden">{currentJob ? 'Update' : 'Create'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Application Details Modal */}
      <AnimatePresence>
        {isApplicationModalOpen && selectedApplication && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsApplicationModalOpen(false);
                setSelectedApplication(null);
              }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#1e293b] border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 max-w-5xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto shadow-2xl"
              >
                {/* Header - Fixed */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-white/10">
                  <h2 className="text-xl sm:text-2xl font-bold text-white">Application Details</h2>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                      <label className="text-xs sm:text-sm font-medium text-gray-300 whitespace-nowrap flex items-center">Update Status</label>
                      <select
                        value={selectedApplication.status}
                        onChange={(e) => {
                          handleUpdateApplicationStatus(selectedApplication._id, e.target.value);
                          setSelectedApplication({ ...selectedApplication, status: e.target.value });
                        }}
                        className="px-3 sm:px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-xs sm:text-sm min-w-[140px] sm:min-w-[150px]"
                      >
                        <option value="pending">Pending</option>
                        <option value="reviewing">Reviewing</option>
                        <option value="shortlisted">Shortlisted</option>
                        <option value="interview">Interview</option>
                        <option value="accepted">Accepted</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                    <button 
                      onClick={() => {
                        setIsApplicationModalOpen(false);
                        setSelectedApplication(null);
                      }}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors self-start sm:self-auto"
                    >
                      <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 hover:text-white" />
                    </button>
                  </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 space-y-4 sm:space-y-6 custom-scrollbar">
                  {/* Personal Information */}
                  <div className="bg-white/5 border border-white/10 rounded-lg sm:rounded-xl p-4 sm:p-5">
                    <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 pb-2 border-b border-white/10">Personal Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Name</p>
                        <p className="text-white font-medium break-words text-sm sm:text-base">{selectedApplication.firstName} {selectedApplication.lastName}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Email</p>
                        <a href={`mailto:${selectedApplication.email}`} className="text-blue-400 hover:text-blue-300 font-medium break-all text-sm sm:text-base">
                          {selectedApplication.email}
                        </a>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Phone</p>
                        <a href={`tel:${selectedApplication.phone}`} className="text-white font-medium break-words text-sm sm:text-base">
                          {selectedApplication.phone}
                        </a>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Location</p>
                        <p className="text-white font-medium break-words text-sm sm:text-base">{selectedApplication.location}</p>
                      </div>
                    </div>
                  </div>

                  {/* Position Information */}
                  <div className="bg-white/5 border border-white/10 rounded-lg sm:rounded-xl p-4 sm:p-5">
                    <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 pb-2 border-b border-white/10">Position Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Position</p>
                        <p className="text-white font-medium break-words text-sm sm:text-base">{selectedApplication.position}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Department</p>
                        <p className="text-white font-medium break-words text-sm sm:text-base">{selectedApplication.department}</p>
                      </div>
                      {selectedApplication.expectedSalary && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Expected Salary</p>
                          <p className="text-white font-medium break-words text-sm sm:text-base">{selectedApplication.expectedSalary}</p>
                        </div>
                      )}
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Availability</p>
                        <p className="text-white font-medium break-words text-sm sm:text-base">{selectedApplication.availability}</p>
                      </div>
                    </div>
                  </div>

                  {/* Professional Links */}
                  {(selectedApplication.linkedinUrl || selectedApplication.portfolioUrl || selectedApplication.githubUrl) && (
                    <div className="bg-white/5 border border-white/10 rounded-lg sm:rounded-xl p-4 sm:p-5">
                      <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 pb-2 border-b border-white/10">Professional Links</h3>
                      <div className="flex flex-wrap gap-2 sm:gap-3">
                        {selectedApplication.linkedinUrl && (
                          <a 
                            href={selectedApplication.linkedinUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors break-all text-xs sm:text-sm"
                          >
                            <span className="font-medium">LinkedIn</span>
                            <span className="opacity-75 truncate max-w-[150px] sm:max-w-[200px]">{selectedApplication.linkedinUrl}</span>
                          </a>
                        )}
                        {selectedApplication.portfolioUrl && (
                          <a 
                            href={selectedApplication.portfolioUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-teal-500/20 text-teal-400 rounded-lg hover:bg-teal-500/30 transition-colors break-all text-xs sm:text-sm"
                          >
                            <span className="font-medium">Portfolio</span>
                            <span className="opacity-75 truncate max-w-[150px] sm:max-w-[200px]">{selectedApplication.portfolioUrl}</span>
                          </a>
                        )}
                        {selectedApplication.githubUrl && (
                          <a 
                            href={selectedApplication.githubUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-gray-500/20 text-gray-300 rounded-lg hover:bg-gray-500/30 transition-colors break-all text-xs sm:text-sm"
                          >
                            <span className="font-medium">GitHub</span>
                            <span className="opacity-75 truncate max-w-[150px] sm:max-w-[200px]">{selectedApplication.githubUrl}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Cover Letter */}
                  {selectedApplication.coverLetter && (
                    <div className="bg-white/5 border border-white/10 rounded-lg sm:rounded-xl p-4 sm:p-5">
                      <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 pb-2 border-b border-white/10">Cover Letter</h3>
                      <div className="bg-black/30 border border-white/10 rounded-lg p-3 sm:p-4 max-h-60 overflow-y-auto">
                        <p className="text-gray-300 whitespace-pre-wrap break-words leading-relaxed text-sm sm:text-base">{selectedApplication.coverLetter}</p>
                      </div>
                    </div>
                  )}

                  {/* Why Inavora */}
                  {selectedApplication.whyInavora && (
                    <div className="bg-white/5 border border-white/10 rounded-lg sm:rounded-xl p-4 sm:p-5">
                      <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 pb-2 border-b border-white/10">Why Inavora?</h3>
                      <div className="bg-black/30 border border-white/10 rounded-lg p-3 sm:p-4 max-h-60 overflow-y-auto">
                        <p className="text-gray-300 whitespace-pre-wrap break-words leading-relaxed text-sm sm:text-base">{selectedApplication.whyInavora}</p>
                      </div>
                    </div>
                  )}

                  {/* Additional Info */}
                  {selectedApplication.additionalInfo && (
                    <div className="bg-white/5 border border-white/10 rounded-lg sm:rounded-xl p-4 sm:p-5">
                      <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 pb-2 border-b border-white/10">Additional Information</h3>
                      <div className="bg-black/30 border border-white/10 rounded-lg p-3 sm:p-4 max-h-60 overflow-y-auto">
                        <p className="text-gray-300 whitespace-pre-wrap break-words leading-relaxed text-sm sm:text-base">{selectedApplication.additionalInfo}</p>
                      </div>
                    </div>
                  )}

                  {/* Resume */}
                  {selectedApplication.resume?.url && (
                    <div className="bg-white/5 border border-white/10 rounded-lg sm:rounded-xl p-4 sm:p-5">
                      <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 pb-2 border-b border-white/10">Resume</h3>
                      <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
                        <a 
                          href={selectedApplication.resume.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-3 bg-teal-500/20 text-teal-400 rounded-lg hover:bg-teal-500/30 transition-colors font-medium text-sm sm:text-base"
                        >
                          <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                          View Resume
                        </a>
                        <button
                          onClick={() => {
                            if (selectedApplication.resume?.url) {
                              handleDownloadResume(
                                selectedApplication.resume.url,
                                selectedApplication.resume.fileName
                              );
                            }
                          }}
                          className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-3 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors font-medium text-sm sm:text-base"
                        >
                          <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                          Download Resume
                        </button>
                      </div>
                      {selectedApplication.resume.fileName && (
                        <p className="text-xs sm:text-sm text-gray-400 mt-3">
                          File: {selectedApplication.resume.fileName}
                          {selectedApplication.resume.fileSize && (
                            <span className="ml-2">
                              ({(selectedApplication.resume.fileSize / 1024).toFixed(1)} KB)
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SuperAdmin;


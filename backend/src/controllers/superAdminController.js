const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const Logger = require('../utils/logger');
const superAdminService = require('../services/superAdminService');
const User = require('../models/User');
const Institution = require('../models/Institution');
const Settings = require('../models/Settings');

/**
 * Login Super Admin
 * @route POST /api/super-admin/login
 * @access Public
 */
const loginSuperAdmin = asyncHandler(async (req, res, next) => {
  const { password } = req.body;

  if (!password) {
    throw new AppError('Password is required', 400, 'VALIDATION_ERROR');
  }

  const correctPassword = process.env.SUPER_ADMIN_PASSWORD;

  if (!correctPassword) {
    Logger.error('SUPER_ADMIN_PASSWORD not configured in environment variables');
    throw new AppError('Server configuration error. Please contact administrator.', 500, 'CONFIG_ERROR');
  }

  if (password !== correctPassword) {
    throw new AppError('Invalid password', 401, 'UNAUTHORIZED');
  }

  const token = jwt.sign(
    { 
      superAdmin: true,
      type: 'super_admin',
      timestamp: Date.now()
    },
    process.env.SUPER_ADMIN_JWT_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.SUPER_ADMIN_TOKEN_EXPIRES_IN || '8h' }
  );

  res.status(200).json({
    success: true,
    message: 'Login successful',
    token,
    expiresIn: process.env.SUPER_ADMIN_TOKEN_EXPIRES_IN || '8h'
  });
});

/**
 * Verify Super Admin Token
 * @route GET /api/super-admin/verify
 * @access Private (Super Admin)
 */
const verifyToken = asyncHandler(async (req, res, next) => {
  res.status(200).json({
    success: true,
    message: 'Token is valid',
    authenticated: true
  });
});

/**
 * Get Dashboard Stats
 * @route GET /api/super-admin/dashboard/stats
 * @access Private (Super Admin)
 */
const getDashboardStats = asyncHandler(async (req, res, next) => {
  const stats = await superAdminService.getPlatformStats();
  
  res.status(200).json({
    success: true,
    data: stats
  });
});

/**
 * Get Users List
 * @route GET /api/super-admin/users
 * @access Private (Super Admin)
 */
const getUsers = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 50, search, plan, status, dateFrom, dateTo } = req.query;
  
  const filters = {
    search,
    plan,
    status,
    dateFrom,
    dateTo
  };

  const result = await superAdminService.getUsers(filters, parseInt(page), parseInt(limit));
  
  res.status(200).json({
    success: true,
    data: result
  });
});

/**
 * Get User Details
 * @route GET /api/super-admin/users/:id
 * @access Private (Super Admin)
 */
const getUserById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  
  const result = await superAdminService.getUserById(id);
  
  res.status(200).json({
    success: true,
    data: result
  });
});

/**
 * Update User Plan
 * @route PUT /api/super-admin/users/:id/plan
 * @access Private (Super Admin)
 */
const updateUserPlan = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { plan, status, endDate } = req.body;
  
  const user = await User.findById(id);
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  // Warn if trying to update institution user's plan directly
  if (user.isInstitutionUser && user.institutionId && plan) {
    Logger.warn(`Attempting to update plan for institution user ${id}. Institution users should be managed through their institution.`);
    // Still allow the update, but log a warning
  }

  if (plan) {
    user.subscription.plan = plan;
  }
  if (status) {
    user.subscription.status = status;
  }
  if (endDate) {
    user.subscription.endDate = new Date(endDate);
  }

  await user.save();
  
  res.status(200).json({
    success: true,
    message: user.isInstitutionUser ? 
      'User plan updated successfully. Note: This user is linked to an institution. Changes may be overridden by institution plan.' :
      'User plan updated successfully',
    data: user
  });
});

/**
 * Update User Status
 * @route PUT /api/super-admin/users/:id/status
 * @access Private (Super Admin)
 */
const updateUserStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const user = await User.findById(id);
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  user.subscription.status = status;
  await user.save();
  
  res.status(200).json({
    success: true,
    message: 'User status updated successfully',
    data: user
  });
});

/**
 * Get Institutions List
 * @route GET /api/super-admin/institutions
 * @access Private (Super Admin)
 */
const getInstitutions = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 50, search, status, dateFrom, dateTo } = req.query;
  
  const filters = {
    search,
    status,
    dateFrom,
    dateTo
  };

  const result = await superAdminService.getInstitutions(filters, parseInt(page), parseInt(limit));
  
  res.status(200).json({
    success: true,
    data: result
  });
});

/**
 * Get Institution Details
 * @route GET /api/super-admin/institutions/:id
 * @access Private (Super Admin)
 */
const getInstitutionById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  
  const result = await superAdminService.getInstitutionById(id);
  
  res.status(200).json({
    success: true,
    data: result
  });
});

/**
 * Update Institution Plan
 * @route PUT /api/super-admin/institutions/:id/plan
 * @access Private (Super Admin)
 */
const updateInstitutionPlan = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { status, endDate, maxUsers } = req.body;
  
  const institution = await Institution.findById(id);
  if (!institution) {
    throw new AppError('Institution not found', 404, 'NOT_FOUND');
  }

  if (status) {
    institution.subscription.status = status;
  }
  if (endDate) {
    institution.subscription.endDate = new Date(endDate);
  }
  if (maxUsers) {
    institution.subscription.maxUsers = parseInt(maxUsers);
  }

  await institution.save();
  
  res.status(200).json({
    success: true,
    message: 'Institution plan updated successfully',
    data: institution
  });
});

/**
 * Get Payments List
 * @route GET /api/super-admin/payments
 * @access Private (Super Admin)
 */
const getPayments = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 50, status, plan, dateFrom, dateTo } = req.query;
  
  const filters = {
    status,
    plan,
    dateFrom,
    dateTo
  };

  const result = await superAdminService.getPayments(filters, parseInt(page), parseInt(limit));
  
  res.status(200).json({
    success: true,
    data: result
  });
});

/**
 * Get Payment Statistics
 * @route GET /api/super-admin/payments/stats
 * @access Private (Super Admin)
 */
const getPaymentStats = asyncHandler(async (req, res, next) => {
  const stats = await superAdminService.getPaymentStats();
  
  res.status(200).json({
    success: true,
    data: stats
  });
});

/**
 * Get Presentations List
 * @route GET /api/super-admin/presentations
 * @access Private (Super Admin)
 */
const getPresentations = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 50, search, isLive, dateFrom, dateTo } = req.query;
  
  const filters = {
    search,
    isLive,
    dateFrom,
    dateTo
  };

  const result = await superAdminService.getPresentations(filters, parseInt(page), parseInt(limit));
  
  res.status(200).json({
    success: true,
    data: result
  });
});

/**
 * Get Growth Trends
 * @route GET /api/super-admin/analytics/growth
 * @access Private (Super Admin)
 */
const getGrowthTrends = asyncHandler(async (req, res, next) => {
  const { days = 30 } = req.query;
  
  const trends = await superAdminService.getGrowthTrends(parseInt(days));
  
  res.status(200).json({
    success: true,
    data: trends
  });
});

/**
 * Get Settings
 * @route GET /api/super-admin/settings
 * @access Private (Super Admin)
 */
const getSettings = asyncHandler(async (req, res, next) => {
  const settings = await Settings.getSettings();
  
  res.status(200).json({
    success: true,
    data: settings
  });
});

/**
 * Update Settings
 * @route PUT /api/super-admin/settings
 * @access Private (Super Admin)
 */
const updateSettings = asyncHandler(async (req, res, next) => {
  const { system, notifications, security, platform } = req.body;
  
  let settings = await Settings.findOne();
  if (!settings) {
    settings = new Settings({});
  }
  
  // Update system settings
  if (system) {
    if (system.maintenanceMode !== undefined) {
      settings.system.maintenanceMode = system.maintenanceMode;
    }
    if (system.registrationEnabled !== undefined) {
      settings.system.registrationEnabled = system.registrationEnabled;
    }
    if (system.maxUsersPerInstitution !== undefined) {
      settings.system.maxUsersPerInstitution = system.maxUsersPerInstitution;
    }
    if (system.maintenanceMessage !== undefined) {
      settings.system.maintenanceMessage = system.maintenanceMessage;
    }
  }
  
  // Update notification settings
  if (notifications) {
    if (notifications.emailNotifications !== undefined) {
      settings.notifications.emailNotifications = notifications.emailNotifications;
    }
    if (notifications.newUserAlerts !== undefined) {
      settings.notifications.newUserAlerts = notifications.newUserAlerts;
    }
    if (notifications.paymentAlerts !== undefined) {
      settings.notifications.paymentAlerts = notifications.paymentAlerts;
    }
    if (notifications.systemAlerts !== undefined) {
      settings.notifications.systemAlerts = notifications.systemAlerts;
    }
    if (notifications.adminEmail !== undefined) {
      settings.notifications.adminEmail = notifications.adminEmail;
    }
  }
  
  // Update security settings
  if (security) {
    if (security.sessionTimeout !== undefined) {
      settings.security.sessionTimeout = security.sessionTimeout;
    }
    if (security.requireEmailVerification !== undefined) {
      settings.security.requireEmailVerification = security.requireEmailVerification;
    }
    if (security.enable2FA !== undefined) {
      settings.security.enable2FA = security.enable2FA;
    }
    if (security.maxLoginAttempts !== undefined) {
      settings.security.maxLoginAttempts = security.maxLoginAttempts;
    }
    if (security.passwordMinLength !== undefined) {
      settings.security.passwordMinLength = security.passwordMinLength;
    }
  }
  
  // Update platform settings
  if (platform) {
    if (platform.siteName !== undefined) {
      settings.platform.siteName = platform.siteName;
    }
    if (platform.siteDescription !== undefined) {
      settings.platform.siteDescription = platform.siteDescription;
    }
    if (platform.supportEmail !== undefined) {
      settings.platform.supportEmail = platform.supportEmail;
    }
    if (platform.supportPhone !== undefined) {
      settings.platform.supportPhone = platform.supportPhone;
    }
  }
  
  await settings.save();
  
  // Clear settings cache to ensure fresh data
  const settingsService = require('../services/settingsService');
  settingsService.clearCache();
  
  Logger.info('Settings updated by super admin', {
    updatedBy: req.superAdmin?.email || 'unknown',
    changes: { system, notifications, security, platform }
  });
  
  res.status(200).json({
    success: true,
    message: 'Settings updated successfully',
    data: settings
  });
});

module.exports = {
  loginSuperAdmin,
  verifyToken,
  getDashboardStats,
  getUsers,
  getUserById,
  updateUserPlan,
  updateUserStatus,
  getInstitutions,
  getInstitutionById,
  updateInstitutionPlan,
  getPayments,
  getPaymentStats,
  getPresentations,
  getGrowthTrends,
  getSettings,
  updateSettings
};


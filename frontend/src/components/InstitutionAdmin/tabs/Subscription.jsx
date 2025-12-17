import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import {
    CreditCard,
    CheckCircle,
    AlertCircle,
    AlertTriangle,
    Bell,
    TrendingUp,
    Calendar,
    Clock,
    RefreshCw,
    ArrowUp,
    Sparkles,
    X,
    Receipt,
    DollarSign,
    Building2,
    Mail,
    User
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../config/api';
import { translateError } from '../../../utils/errorTranslator';
import { getBrandingColors, getRgbaColor, hexToRgb } from '../utils/brandingColors';

const Subscription = ({ institution, stats, onRefresh }) => {
    const { t } = useTranslation();
    const { primaryColor, secondaryColor } = getBrandingColors(institution);
    const [renewalLoading, setRenewalLoading] = useState(false);
    const [plans, setPlans] = useState([]);
    const [loadingPlans, setLoadingPlans] = useState(false);
    const [showPlanSelection, setShowPlanSelection] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [customUserCount, setCustomUserCount] = useState(10);
    const [showUpgrade, setShowUpgrade] = useState(false);
    const [payments, setPayments] = useState([]);
    const [loadingPayments, setLoadingPayments] = useState(false);

    // Calculate subscription status
    const subscription = institution?.subscription;
    const isActive = subscription?.status === 'active' && subscription?.endDate && new Date(subscription.endDate) > new Date();
    const isExpired = subscription?.status === 'expired' || (subscription?.endDate && new Date(subscription.endDate) < new Date());
    const daysRemaining = subscription?.endDate ? Math.ceil((new Date(subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;
    const userUsagePercent = subscription?.maxUsers ? ((stats?.totalUsers || 0) / subscription.maxUsers) * 100 : 0;
    const showUserWarning = userUsagePercent >= 80;
    const showRenewalWarning = daysRemaining !== null && daysRemaining <= 30 && daysRemaining > 0;

    // Determine plan name based on maxUsers
    const getPlanName = (maxUsers) => {
        if (!maxUsers) return 'Institution';
        if (maxUsers === 10) return 'Basic';
        if (maxUsers === 50) return 'Professional';
        return 'Custom';
    };

    const currentPlanName = getPlanName(subscription?.maxUsers);

    // Fetch available plans
    useEffect(() => {
        const fetchPlans = async () => {
            if (isExpired || showUpgrade) {
                setLoadingPlans(true);
                try {
                    const response = await api.get('/institution/register/plans');
                    if (response.data.success) {
                        setPlans(response.data.plans || []);
                    }
                } catch (error) {
                    console.error('Error fetching plans:', error);
                    toast.error('Failed to load plans');
                } finally {
                    setLoadingPlans(false);
                }
            }
        };
        fetchPlans();
    }, [isExpired, showUpgrade]);

    // Fetch payment history
    useEffect(() => {
        const fetchPayments = async () => {
            setLoadingPayments(true);
            try {
                const response = await api.get('/institution-admin/payments');
                if (response.data.success) {
                    setPayments(response.data.payments || []);
                }
            } catch (error) {
                console.error('Error fetching payments:', error);
            } finally {
                setLoadingPayments(false);
            }
        };
        fetchPayments();
    }, []);

    // Handle plan selection for renewal/upgrade
    const handleSelectPlan = (plan) => {
        setSelectedPlan(plan);
        if (plan.isCustom) {
            setCustomUserCount(Math.max(plan.minUsers || 10, subscription?.maxUsers || 10));
        }
    };

    // Handle subscription renewal/upgrade with plan selection
    const handleRenewSubscription = async (planToUse = null) => {
        const plan = planToUse || selectedPlan;
        
        // If expired and no plan selected, show plan selection
        if (isExpired && !plan && !showPlanSelection) {
            setShowPlanSelection(true);
            return;
        }

        // If upgrading and no plan selected, show plan selection
        if (showUpgrade && !plan && !showPlanSelection) {
            setShowPlanSelection(true);
            return;
        }

        // Validate plan selection
        if (!plan) {
            toast.error('Please select a plan');
            return;
        }

        // Validate custom plan
        if (plan.isCustom) {
            if (!customUserCount || customUserCount < plan.minUsers) {
                toast.error(`Minimum ${plan.minUsers} users required for Custom plan`);
                return;
            }
        }

        const confirmMessage = isExpired 
            ? `Renew subscription with ${plan.name} plan?`
            : `Upgrade to ${plan.name} plan? This will update your subscription.`;
        
        if (!window.confirm(confirmMessage)) {
            return;
        }

        setRenewalLoading(true);

        try {
            // Wait for Razorpay to be available
            let retries = 0;
            while (!window.Razorpay && retries < 10) {
                await new Promise(resolve => setTimeout(resolve, 100));
                retries++;
            }

            if (!window.Razorpay) {
                const script = document.createElement('script');
                script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                script.async = true;
                
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Razorpay script loading timeout'));
                    }, 10000);
                    
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
                    
                    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
                    if (existingScript) {
                        clearTimeout(timeout);
                        if (window.Razorpay) {
                            resolve();
                        } else {
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

            // Create renewal/upgrade payment order with plan selection
            const requestData = {
                billingCycle: subscription?.billingCycle || 'yearly',
                plan: plan.id,
                ...(plan.isCustom && { customUserCount })
            };

            const response = await api.post('/institution-admin/subscription/renew', requestData);

            if (response.data.success) {
                if (!response.data.orderId || !response.data.keyId) {
                    throw new Error('Invalid payment response: missing orderId or keyId');
                }

                if (!window.Razorpay) {
                    throw new Error('Razorpay SDK not loaded. Please refresh the page and try again.');
                }

                // Initialize Razorpay payment
                const options = {
                    key: response.data.keyId,
                    amount: response.data.amount,
                    currency: response.data.currency || 'INR',
                    name: 'Inavora',
                    description: `${isExpired ? 'Renew' : 'Upgrade'} Institution Subscription - ${plan.name} Plan - ${subscription?.billingCycle || 'Yearly'}`,
                    order_id: response.data.orderId,
                    handler: async function (paymentResponse) {
                        try {
                            setRenewalLoading(true);
                            
                            // Verify payment
                            const verifyResponse = await api.post('/institution-admin/subscription/verify-renewal', {
                                razorpayOrderId: paymentResponse.razorpay_order_id,
                                razorpayPaymentId: paymentResponse.razorpay_payment_id,
                                razorpaySignature: paymentResponse.razorpay_signature
                            });

                            if (verifyResponse.data.success) {
                                toast.success(
                                    isExpired 
                                        ? (t('institution_admin.subscription_renewed_success') || 'Subscription renewed successfully!')
                                        : (t('institution_admin.subscription_upgraded_success') || 'Subscription upgraded successfully!')
                                );
                                setShowPlanSelection(false);
                                setShowUpgrade(false);
                                setSelectedPlan(null);
                                if (onRefresh) {
                                    onRefresh();
                                }
                                // Reload page to refresh institution data
                                window.location.reload();
                            } else {
                                toast.error(verifyResponse.data.message || t('institution_admin.payment_verification_failed'));
                            }
                        } catch (error) {
                            console.error('Payment verification error:', error);
                            const errorMsg = error.response?.data?.message || error.message || t('institution_admin.payment_verification_failed');
                            toast.error(errorMsg);
                        } finally {
                            setRenewalLoading(false);
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
                            setRenewalLoading(false);
                        }
                    }
                };

                const razorpay = new window.Razorpay(options);
                
                razorpay.on('payment.failed', function (response) {
                    console.error('Payment failed:', response.error);
                    const errorMsg = response.error?.description || 
                                    response.error?.reason || 
                                    response.error?.code ||
                                    t('institution_admin.payment_initiation_failed');
                    toast.error(t('institution_admin.payment_failed', { error: errorMsg }));
                    setRenewalLoading(false);
                });
                
                razorpay.open();
            } else {
                throw new Error(response.data.message || 'Failed to create payment order');
            }
        } catch (error) {
            console.error('Renewal error:', error);
            let errorMessage = t('institution_admin.renewal_initiation_failed') || 'Failed to initiate renewal.';
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            toast.error(errorMessage);
            setRenewalLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">{t('institution_admin.subscription_billing')}</h1>
                <p className="text-gray-400">{t('institution_admin.subscription_description')}</p>
            </div>

            <div className="space-y-6">
                {/* Institution Information - Always Visible */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Building2 className="w-5 h-5" style={{ color: secondaryColor }} />
                        Institution Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <p className="text-gray-400 text-sm mb-1">Institution Name</p>
                            <p className="text-white font-medium">{institution?.name || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm mb-1">Institution Email</p>
                            <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-gray-400" />
                                <p className="text-white">{institution?.email || 'N/A'}</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm mb-1">Admin Name</p>
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-400" />
                                <p className="text-white">{institution?.adminName || 'N/A'}</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm mb-1">Admin Email</p>
                            <p className="text-white">{institution?.adminEmail || 'N/A'}</p>
                        </div>
                    </div>
                </div>

                {/* Payment History - Always Visible */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Receipt className="w-5 h-5" style={{ color: secondaryColor }} />
                        Payment History
                    </h3>
                    {loadingPayments ? (
                        <div className="flex items-center justify-center py-8">
                            <div 
                                className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
                                style={{ borderColor: `${secondaryColor} transparent transparent transparent` }}
                            ></div>
                        </div>
                    ) : payments.length > 0 ? (
                        <div className="space-y-3">
                            {payments.map((payment) => (
                                <div
                                    key={payment.id}
                                    className="flex items-center justify-between p-4 bg-black/20 rounded-lg border border-white/5 hover:bg-black/30 transition-colors"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <DollarSign className="w-5 h-5" style={{ color: secondaryColor }} />
                                            <p className="text-lg font-semibold text-white">
                                                {new Intl.NumberFormat('en-IN', {
                                                    style: 'currency',
                                                    currency: payment.currency || 'INR'
                                                }).format(payment.amount)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-gray-400">
                                            <span className="capitalize">{payment.plan || 'institution'}</span>
                                            <span>•</span>
                                            <span>{new Date(payment.createdAt).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}</span>
                                            {payment.orderId && (
                                                <>
                                                    <span>•</span>
                                                    <span className="font-mono text-xs">Order: {payment.orderId.slice(-8)}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                        payment.status === 'captured' 
                                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                            : payment.status === 'failed'
                                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                            : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                    }`}>
                                        {payment.status === 'captured' && <CheckCircle className="w-3 h-3 inline mr-1" />}
                                        {payment.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Receipt className="w-12 h-12 mx-auto mb-3 text-gray-500 opacity-50" />
                            <p className="text-gray-400">No payment history found</p>
                        </div>
                    )}
                </div>

            {subscription ? (
                <div className="space-y-6">
                    {/* Plan Details */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <CreditCard className="w-5 h-5" style={{ color: secondaryColor }} />
                            {t('institution_admin.current_plan')}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <div>
                                <p className="text-gray-400 text-sm mb-1">{t('institution_admin.plan')}</p>
                                <div className="flex items-center gap-2">
                                    <p className="text-lg font-semibold text-white">{currentPlanName}</p>
                                    {subscription?.maxUsers && (
                                        <span className="text-sm text-gray-400">({subscription.maxUsers} users)</span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm mb-1">{t('institution_admin.status')}</p>
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                    isActive && !isExpired
                                        ? 'bg-green-500/20 text-green-400' 
                                        : isExpired
                                        ? 'bg-red-500/20 text-red-400'
                                        : 'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                    {isActive && !isExpired && <CheckCircle className="w-4 h-4 mr-1" />}
                                    {isExpired ? (t('institution_admin.expired') || 'Expired') : (isActive ? 'Active' : subscription.status)}
                                </span>
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm mb-1">{t('institution_admin.billing_cycle')}</p>
                                <p className="text-lg font-semibold text-white capitalize">{subscription.billingCycle || 'Yearly'}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm mb-1">{t('institution_admin.renewal_date')}</p>
                                <p className="text-lg font-semibold text-white">
                                    {subscription.endDate 
                                        ? new Date(subscription.endDate).toLocaleDateString()
                                        : 'N/A'}
                                </p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-6 pt-6 border-t border-white/10 flex flex-wrap gap-3">
                            {isExpired && (
                                <button
                                    onClick={() => {
                                        setShowPlanSelection(true);
                                        setShowUpgrade(false);
                                    }}
                                    disabled={renewalLoading}
                                    className="px-6 py-3 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    style={{
                                        background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})`,
                                        boxShadow: `0 10px 15px -3px ${getRgbaColor(secondaryColor, 0.25)}`
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!e.target.disabled) {
                                            e.target.style.boxShadow = `0 10px 15px -3px ${getRgbaColor(secondaryColor, 0.4)}`;
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.boxShadow = `0 10px 15px -3px ${getRgbaColor(secondaryColor, 0.25)}`;
                                    }}
                                >
                                    <RefreshCw className="w-5 h-5" />
                                    {t('institution_admin.renew_subscription') || 'Renew Subscription'}
                                </button>
                            )}
                            {showRenewalWarning && !isExpired && (
                                <button
                                    onClick={() => handleRenewSubscription()}
                                    disabled={renewalLoading}
                                    className="px-6 py-3 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    style={{
                                        background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})`,
                                        boxShadow: `0 10px 15px -3px ${getRgbaColor(secondaryColor, 0.25)}`
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!e.target.disabled) {
                                            e.target.style.boxShadow = `0 10px 15px -3px ${getRgbaColor(secondaryColor, 0.4)}`;
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.boxShadow = `0 10px 15px -3px ${getRgbaColor(secondaryColor, 0.25)}`;
                                    }}
                                >
                                    {renewalLoading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            {t('institution_admin.processing') || 'Processing...'}
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="w-5 h-5" />
                                            {t('institution_admin.renew_now') || 'Renew Now'}
                                        </>
                                    )}
                                </button>
                            )}
                            {isActive && !isExpired && (
                                <button
                                    onClick={() => {
                                        setShowUpgrade(true);
                                        setShowPlanSelection(true);
                                        setSelectedPlan(null);
                                    }}
                                    disabled={renewalLoading}
                                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-pink-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <ArrowUp className="w-5 h-5" />
                                    {t('institution_admin.upgrade_plan') || 'Upgrade Plan'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Plan Selection Modal */}
                    {showPlanSelection && (isExpired || showUpgrade) && (
                        <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                                    <Sparkles className="w-5 h-5" style={{ color: secondaryColor }} />
                                    {isExpired 
                                        ? (t('institution_admin.select_plan_to_renew') || 'Select Plan to Renew')
                                        : (t('institution_admin.select_plan_to_upgrade') || 'Select Plan to Upgrade')
                                    }
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowPlanSelection(false);
                                        setShowUpgrade(false);
                                        setSelectedPlan(null);
                                    }}
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {loadingPlans ? (
                                <div className="flex items-center justify-center py-8">
                                    <div 
                                        className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
                                        style={{ borderColor: `${secondaryColor} transparent transparent transparent` }}
                                    ></div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {plans.map((plan) => {
                                        const isSelected = selectedPlan?.id === plan.id;
                                        const isCurrentPlan = !plan.isCustom && plan.maxUsers === subscription?.maxUsers;
                                        const price = plan.prices?.yearly || 0;
                                        const priceInRupees = (price / 100).toLocaleString('en-IN');

                                        return (
                                            <div
                                                key={plan.id}
                                                onClick={() => !isCurrentPlan && handleSelectPlan(plan)}
                                                className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all ${
                                                    isSelected
                                                        ? ''
                                                        : isCurrentPlan
                                                        ? 'border-gray-500 bg-gray-500/10 cursor-not-allowed opacity-60'
                                                        : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                                                }`}
                                                style={isSelected ? {
                                                    borderColor: secondaryColor,
                                                    backgroundColor: getRgbaColor(secondaryColor, 0.1)
                                                } : {}}
                                            >
                                                {plan.badge && (
                                                    <span 
                                                        className="absolute top-4 right-4 px-2 py-1 text-xs font-semibold rounded"
                                                        style={{
                                                            backgroundColor: getRgbaColor(secondaryColor, 0.2),
                                                            color: secondaryColor
                                                        }}
                                                    >
                                                        {plan.badge}
                                                    </span>
                                                )}
                                                {isCurrentPlan && (
                                                    <span 
                                                        className="absolute top-4 right-4 px-2 py-1 text-xs font-semibold rounded"
                                                        style={{
                                                            backgroundColor: getRgbaColor(primaryColor, 0.2),
                                                            color: primaryColor
                                                        }}
                                                    >
                                                        Current
                                                    </span>
                                                )}
                                                <h4 className="text-xl font-bold text-white mb-2">{plan.name}</h4>
                                                <div className="mb-4">
                                                    <span className="text-3xl font-bold text-white">₹{priceInRupees}</span>
                                                    <span className="text-gray-400 text-sm">/year</span>
                                                </div>
                                                <div className="mb-4">
                                                    <p className="text-white font-medium">
                                                        {plan.isCustom ? 'Custom' : plan.maxUsers} {plan.isCustom ? 'Users' : 'Users'}
                                                    </p>
                                                    {plan.isCustom && plan.minUsers && (
                                                        <p className="text-gray-400 text-sm">Min: {plan.minUsers} users</p>
                                                    )}
                                                </div>
                                                <ul className="space-y-2 mb-4">
                                                    {plan.features?.slice(0, 3).map((feature, idx) => (
                                                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                                                            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: secondaryColor }} />
                                                            <span>{feature}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                                {plan.isCustom && isSelected && (
                                                    <div className="mt-4">
                                                        <label className="block text-sm text-gray-300 mb-2">
                                                            Number of Users
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min={plan.minUsers || 10}
                                                            value={customUserCount}
                                                            onChange={(e) => setCustomUserCount(Math.max(plan.minUsers || 10, parseInt(e.target.value) || plan.minUsers || 10))}
                                                            className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                                                        />
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            Price: ₹{((plan.prices?.yearly || 0) / 100 + (customUserCount - (plan.minUsers || 10)) * ((plan.prices?.perUser || 0) / 100)).toLocaleString('en-IN')}/year
                                                        </p>
                                                    </div>
                                                )}
                                                {!isCurrentPlan && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (!plan.isCustom) {
                                                                handleSelectPlan(plan);
                                                            }
                                                            handleRenewSubscription(plan);
                                                        }}
                                                        disabled={renewalLoading || (plan.isCustom && !isSelected)}
                                                        className={`w-full mt-4 px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                                            isSelected || !plan.isCustom
                                                                ? 'text-white'
                                                                : 'bg-white/10 hover:bg-white/20 text-white'
                                                        }`}
                                                        style={(isSelected || !plan.isCustom) ? {
                                                            backgroundColor: secondaryColor
                                                        } : {}}
                                                        onMouseEnter={(e) => {
                                                            if (!e.target.disabled && (isSelected || !plan.isCustom)) {
                                                                const rgb = hexToRgb(secondaryColor);
                                                                if (rgb) {
                                                                    e.target.style.backgroundColor = `rgb(${Math.max(0, rgb.r - 20)}, ${Math.max(0, rgb.g - 20)}, ${Math.max(0, rgb.b - 20)})`;
                                                                }
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            if (isSelected || !plan.isCustom) {
                                                                e.target.style.backgroundColor = secondaryColor;
                                                            }
                                                        }}
                                                    >
                                                        {renewalLoading ? 'Processing...' : (isExpired ? 'Renew' : 'Upgrade')}
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Alerts & Notifications */}
                    {(showUserWarning || showRenewalWarning || isExpired) && !showPlanSelection && (
                        <div className="space-y-3">
                            {isExpired && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-red-400 mb-1">{t('institution_admin.subscription_expired') || 'Subscription Expired'}</h4>
                                        <p className="text-sm text-gray-300">{t('institution_admin.subscription_expired_message') || 'Your subscription has expired. Please renew to continue using all features.'}</p>
                                    </div>
                                </div>
                            )}
                            {showUserWarning && (
                                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-yellow-400 mb-1">{t('institution_admin.user_limit_warning_80')}</h4>
                                        <p className="text-sm text-gray-300">{t('institution_admin.user_limit_warning_60', { percent: Math.round(userUsagePercent) })}</p>
                                    </div>
                                </div>
                            )}
                            {showRenewalWarning && !isExpired && (
                                <div 
                                    className="border rounded-xl p-4 flex items-start gap-3"
                                    style={{
                                        backgroundColor: getRgbaColor(primaryColor, 0.1),
                                        borderColor: getRgbaColor(primaryColor, 0.3)
                                    }}
                                >
                                    <Bell className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: primaryColor }} />
                                    <div className="flex-1">
                                        <h4 className="font-semibold mb-1" style={{ color: primaryColor }}>{t('institution_admin.renewal_warning_title')}</h4>
                                        <p className="text-sm text-gray-300">{t('institution_admin.renewal_warning_message', { days: daysRemaining })}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

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
                                    {stats?.totalUsers || subscription.currentUsers || 0} / {subscription.maxUsers || 10}
                                </span>
                            </div>
                            <div className="w-full bg-black/30 rounded-full h-3 overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all ${
                                        userUsagePercent > 0.8 
                                            ? 'bg-red-500' 
                                            : userUsagePercent > 0.6
                                            ? 'bg-yellow-500'
                                            : 'bg-teal-500'
                                    }`}
                                    style={{ 
                                        width: `${Math.min(userUsagePercent, 100)}%` 
                                    }}
                                />
                            </div>
                            {userUsagePercent > 0.8 && (
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
                                <p className="text-2xl font-bold text-white">{stats?.totalPresentations || 0}</p>
                            </div>
                            <div className="p-4 bg-black/20 rounded-lg">
                                <p className="text-gray-400 text-xs mb-1">{t('institution_admin.total_responses_label_stats')}</p>
                                <p className="text-2xl font-bold text-white">{stats?.totalResponses || 0}</p>
                            </div>
                            <div className="p-4 bg-black/20 rounded-lg">
                                <p className="text-gray-400 text-xs mb-1">{t('institution_admin.active_users_30_days')}</p>
                                <p className="text-2xl font-bold text-white">{stats?.activeUsers || 0}</p>
                            </div>
                        </div>
                    </div>

                    {/* Subscription Period */}
                    {subscription.startDate && subscription.endDate && (
                        <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 backdrop-blur-sm">
                            <h3 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <Calendar className="w-5 h-5" style={{ color: secondaryColor }} />
                                {t('institution_admin.subscription_period')}
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-gray-400 text-sm mb-1">{t('institution_admin.start_date')}</p>
                                    <p className="text-lg font-semibold text-white">
                                        {new Date(subscription.startDate).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm mb-1">{t('institution_admin.end_date')}</p>
                                    <p className="text-lg font-semibold text-white">
                                        {new Date(subscription.endDate).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </p>
                                </div>
                            </div>
                            {subscription.endDate && daysRemaining !== null && (
                                <div className={`mt-4 p-3 rounded-lg ${
                                    daysRemaining <= 0 
                                        ? 'bg-red-500/10 border border-red-500/20'
                                        : daysRemaining <= 30
                                        ? 'bg-yellow-500/10 border border-yellow-500/20'
                                        : 'bg-blue-500/10 border border-blue-500/20'
                                }`}>
                                    <div className="flex items-center gap-2">
                                        <Clock className={`w-4 h-4 ${
                                            daysRemaining <= 0 
                                                ? 'text-red-400'
                                                : daysRemaining <= 30
                                                ? 'text-yellow-400'
                                                : 'text-blue-400'
                                        }`} />
                                        <span className={`text-sm ${
                                            daysRemaining <= 0 
                                                ? 'text-red-300'
                                                : daysRemaining <= 30
                                                ? 'text-yellow-300'
                                                : ''
                                        }`}>
                                            {daysRemaining <= 0 
                                                ? t('institution_admin.subscription_expired') || 'Subscription Expired'
                                                : `${daysRemaining} ${t('institution_admin.days_remaining') || 'days remaining'}`
                                            }
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    {/* No Subscription State */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-8 backdrop-blur-sm text-center">
                        <CreditCard className="w-16 h-16 mx-auto mb-4 text-gray-400 opacity-50" />
                        <h3 className="text-xl font-semibold text-white mb-2">{t('institution_admin.no_active_subscription') || 'No Active Subscription'}</h3>
                        <p className="text-gray-400 mb-6">
                            {t('institution_admin.no_subscription_message') || 'Your institution does not have an active subscription. Contact support to set up a subscription plan.'}
                        </p>
                        <div className="bg-white/5 border border-white/10 rounded-lg p-6 mt-6">
                            <h4 className="text-lg font-semibold text-white mb-4">{t('institution_admin.institution_plan_features') || 'Institution Plan Features'}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                                <div className="flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: secondaryColor }} />
                                    <div>
                                        <p className="text-white font-medium">{t('institution_admin.admin_dashboard') || 'Admin Dashboard'}</p>
                                        <p className="text-gray-400 text-sm">{t('institution_admin.admin_dashboard_desc') || 'Complete management interface'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: secondaryColor }} />
                                    <div>
                                        <p className="text-white font-medium">{t('institution_admin.custom_branding')}</p>
                                        <p className="text-gray-400 text-sm">{t('institution_admin.custom_branding_desc') || 'Your logo and colors'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: secondaryColor }} />
                                    <div>
                                        <p className="text-white font-medium">{t('institution_admin.bulk_user_management') || 'Bulk User Management'}</p>
                                        <p className="text-gray-400 text-sm">{t('institution_admin.bulk_user_management_desc') || 'Import and manage users easily'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: secondaryColor }} />
                                    <div>
                                        <p className="text-white font-medium">{t('institution_admin.advanced_analytics')}</p>
                                        <p className="text-gray-400 text-sm">{t('institution_admin.advanced_analytics_desc') || 'Detailed insights and reports'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            )}

                {/* Usage Statistics - Always Visible */}
                {stats && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" style={{ color: secondaryColor }} />
                            {t('institution_admin.usage_statistics')}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="p-4 bg-black/20 rounded-lg">
                                <p className="text-gray-400 text-xs mb-1">{t('institution_admin.users_label')}</p>
                                <p className="text-2xl font-bold text-white">{stats?.totalUsers || 0}</p>
                            </div>
                            <div className="p-4 bg-black/20 rounded-lg">
                                <p className="text-gray-400 text-xs mb-1">{t('institution_admin.presentations_label')}</p>
                                <p className="text-2xl font-bold text-white">{stats?.totalPresentations || 0}</p>
                            </div>
                            <div className="p-4 bg-black/20 rounded-lg">
                                <p className="text-gray-400 text-xs mb-1">{t('institution_admin.total_responses_label_stats')}</p>
                                <p className="text-2xl font-bold text-white">{stats?.totalResponses || 0}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default Subscription;

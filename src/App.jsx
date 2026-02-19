import { AlertCircle, Calendar, Check, ChevronDown, ChevronRight, Clock, DollarSign, Download, Edit2, Eye, Package, RefreshCw, Save, Settings, Upload, Users, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

// === GOOGLE SHEETS API CONFIGURATION ===
// Replace this with your actual Apps Script Web App URL after deployment
const SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycby0ZC97kWFg-VuRXxGR8qZOyICY1ZkFesAk5G1J9VtlVoGQ0aEmpEC1jg-Wng5bT_zo/exec';
// Example: 'https://script.google.com/macros/s/AKfycby.../exec'

const SUB_DEPARTMENTS = ['Tops', 'Bottoms', 'Outerwear', 'Accessories'];

// Dynamic current week calculator based on the fiscal/capacity year start date
const YEAR_START = new Date(2026, 1, 2); // Feb 2, 2026 = Week 1 start
const getCurrentWeekNumber = () => {
    const now = new Date();
    const diffMs = now - YEAR_START;
    if (diffMs < 0) return 1;
    return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
};
const ADMIN_EMAILS = ['bhanu.ashwani@gmail.com', 'sourcing@onequince.com'];

// === API HELPER FUNCTIONS ===
const api = {
    async get(action, params = {}) {
        const url = new URL(SHEETS_API_URL);
        url.searchParams.append('action', action);
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

        const response = await fetch(url);
        return response.json();
    },

    async post(action, data) {
        const url = new URL(SHEETS_API_URL);
        url.searchParams.append('action', action);

        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        return response.json();
    }
};

const normalizeEmail = (email = '') => email.trim().toLowerCase();
const normalizeString = (value = '') => value.toString().trim();

const getVendorEmail = (vendor) => {
    // First try designated fields
    const designated = normalizeEmail(
        vendor.login_email || vendor.email || vendor.gmail_id || vendor.vendor_email || vendor.email_id || ''
    );
    if (designated) return designated;

    // Fallback: scan all values for something that looks like an email
    for (const key in vendor) {
        const val = String(vendor[key] || '').trim();
        if (val.includes('@') && val.includes('.')) return normalizeEmail(val);
    }
    return '';
};

const getVendorPassword = (vendor) => {
    const designated = normalizeString(vendor.password || vendor.vendor_password || vendor.login_password || vendor.passcode || '');
    if (designated) return designated;
    return '';
};

const getUserEmail = (user) => normalizeEmail(
    user.email || user.gmail_id || user.login_email || user.username || user.user_email || ''
);

const getUserPassword = (user) => normalizeString(
    user.password || user.user_password || user.login_password || user.passcode || ''
);

const getUserVendorId = (user) => normalizeString(
    user.vendor_id || user.vendorId || user.vendor_code || user.vendor || ''
);

const getUserRole = (user) => normalizeString(user.role || user.user_role || '').toLowerCase();
const normalizeVendorKey = (value = '') => normalizeString(value).toLowerCase();
const normalizeSubDeptMode = (value = '') => {
    const mode = normalizeString(value).toLowerCase();
    if (!mode) return 'vendor';
    if (
        mode === 'subdept' ||
        mode === 'sub_dept' ||
        mode === 'sub-dept' ||
        mode === 'subdepartment' ||
        mode === 'sub_department' ||
        mode === 'sub-department' ||
        mode === 'sebdept' // common typo seen in sheet data
    ) {
        return 'subdept';
    }
    if (
        (mode.includes('sub') && mode.includes('dept')) ||
        (mode.includes('seb') && mode.includes('dept'))
    ) {
        return 'subdept';
    }
    return 'vendor';
};
const resolveVendorFromList = (vendorList, vendorRef) => {
    const refKey = normalizeVendorKey(vendorRef);
    if (!refKey || !Array.isArray(vendorList)) return null;

    // Primary: vendor_id match (normalized)
    let found = vendorList.find(v => normalizeVendorKey(v.id) === refKey) || null;
    if (found) return found;

    // Fallback: submissions occasionally carry vendor name in vendor_id
    found = vendorList.find(v => normalizeVendorKey(v.name) === refKey) || null;
    if (found) return found;

    // Fallback: ignore spaces/underscores/dashes differences
    const compactRef = refKey.replace(/[\s_-]+/g, '');
    return vendorList.find(v => normalizeVendorKey(v.id).replace(/[\s_-]+/g, '') === compactRef) || null;
};

const App = () => {
    const [vendors, setVendors] = useState([]);
    const [authUsers, setAuthUsers] = useState([]);
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [loggingIn, setLoggingIn] = useState(false);
    const [loggedInEmail, setLoggedInEmail] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);

    // Fetch vendors on mount
    useEffect(() => {
        loadVendors();
    }, []);

    const loadVendors = async () => {
        setLoading(true);
        setError(null);
        try {
            const [vendorData, userData] = await Promise.all([
                api.get('getAllVendors'),
                api.get('getUsers').catch(() => [])
            ]);

            if (vendorData.error) {
                setError(vendorData.error);
            } else {
                const transformedVendors = vendorData.map(v => ({
                    id: v.vendor_id,
                    name: v.vendor_name,
                    type: v.tracking_type,
                    subDeptMode: normalizeSubDeptMode(v.subdept_mode),
                    status: v.status,
                    loginEmail: getVendorEmail(v),
                    loginPassword: getVendorPassword(v)
                }));
                setVendors(transformedVendors);
            }

            if (Array.isArray(userData) && userData.length > 0) {
                setAuthUsers(userData.map(u => ({
                    email: getUserEmail(u),
                    password: getUserPassword(u),
                    vendorId: getUserVendorId(u),
                    role: getUserRole(u),
                    status: normalizeString(u.status || 'active').toLowerCase()
                })));
            } else {
                setAuthUsers([]);
            }
        } catch (err) {
            setError('Failed to connect to database. Please check your API URL configuration.');
            console.error('API Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const authenticateVendor = async (event) => {
        event.preventDefault();
        const normalizedEmail = normalizeEmail(email);
        setLoggingIn(true);
        setLoginError('');
        setError(null);

        if (!normalizedEmail || !password) {
            setLoginError('Enter both Gmail ID and password.');
            setLoggingIn(false);
            return;
        }

        let matchedVendor = null;
        let authErrorMessage = '';
        const adminEmailMatch = ADMIN_EMAILS.includes(normalizedEmail);
        let liveUsers = authUsers;

        // Refresh users at login time to avoid stale auth data.
        try {
            const latestUsers = await api.get('getUsers');
            if (Array.isArray(latestUsers)) {
                liveUsers = latestUsers.map(u => ({
                    email: getUserEmail(u),
                    password: getUserPassword(u),
                    vendorId: getUserVendorId(u),
                    role: getUserRole(u),
                    status: normalizeString(u.status || 'active').toLowerCase()
                }));
                setAuthUsers(liveUsers);
            }
        } catch (refreshUsersError) {
            console.warn('Unable to refresh getUsers during login; using cached users.', refreshUsersError);
        }

        // 1) Admin authentication (ProductionTeam) from Apps Script.
        try {
            const prodAuth = await api.get('authenticateProduction', {
                email: normalizedEmail,
                password
            });
            if (prodAuth && prodAuth.success) {
                setIsAdmin(true);
                setSelectedVendor(null);
                setLoggedInEmail(normalizedEmail);
                setPassword('');
                setLoggingIn(false);
                return;
            }
        } catch (prodAuthError) {
            console.warn('authenticateProduction check failed, using fallback.', prodAuthError);
        }

        // 2) Vendor authentication from Apps Script.
        try {
            const vendorAuth = await api.get('authenticateVendor', {
                email: normalizedEmail,
                password
            });

            if (vendorAuth && vendorAuth.success) {
                const vendorId = vendorAuth.vendor_id || vendorAuth.id;
                const vendorName = normalizeString(vendorAuth.vendor_name || vendorAuth.name || '');
                const authEmail = normalizeEmail(vendorAuth.login_email || normalizedEmail);

                // Preferred mapping by vendor_id.
                if (vendorId) {
                    matchedVendor = vendors.find(v => String(v.id) === String(vendorId)) || null;
                }

                // Fallback mapping when Apps Script response doesn't include vendor_id.
                if (!matchedVendor && authEmail) {
                    matchedVendor = vendors.find(v => normalizeEmail(v.loginEmail) === authEmail) || null;
                }
                if (!matchedVendor && vendorName) {
                    matchedVendor = vendors.find(v => normalizeString(v.name) === vendorName) || null;
                }

                // Last resort: synthesize a vendor object so successful auth can proceed.
                if (!matchedVendor) {
                    const syntheticId = vendorId || vendorName || authEmail || `vendor-${Date.now()}`;
                    matchedVendor = {
                        id: String(syntheticId),
                        name: vendorName || String(syntheticId),
                        type: vendorAuth.tracking_type || 'unit',
                        subDeptMode: normalizeSubDeptMode(vendorAuth.subdept_mode),
                        status: String(vendorAuth.status || 'active').toLowerCase(),
                        loginEmail: authEmail
                    };
                    setVendors(prev => {
                        const exists = prev.some(v => String(v.id) === String(matchedVendor.id));
                        if (exists) return prev;
                        return [...prev, matchedVendor];
                    });
                }
            } else if (vendorAuth && vendorAuth.error) {
                authErrorMessage = vendorAuth.error;
            }
        } catch (vendorAuthError) {
            console.warn('authenticateVendor check failed, using local fallback.', vendorAuthError);
        }

        // Secondary fallback: users sheet style dataset.
        if (!matchedVendor) {
            const matchedUser = liveUsers.find(user =>
                String(user.status || 'active').toLowerCase() === 'active' &&
                String(user.email || '').toLowerCase() === normalizedEmail &&
                String(user.password || '') === String(password)
            ) || null;

            if (matchedUser) {
                if (matchedUser.role === 'admin' || (adminEmailMatch && !matchedUser.vendorId)) {
                    setIsAdmin(true);
                    setSelectedVendor(null);
                    setLoggedInEmail(normalizedEmail);
                    setPassword('');
                    setLoggingIn(false);
                    return;
                }

                if (matchedUser.vendorId) {
                    matchedVendor = vendors.find(v => String(v.id) === String(matchedUser.vendorId)) || null;
                }
            }
        }

        // Admin allowlist fallback (when users sheet is not available).
        if (adminEmailMatch && !matchedVendor && liveUsers.length === 0) {
            setIsAdmin(true);
            setSelectedVendor(null);
            setLoggedInEmail(normalizedEmail);
            setPassword('');
            setLoggingIn(false);
            return;
        }

        // Fallback: match against fields returned by getAllVendors.
        if (!matchedVendor) {
            matchedVendor = vendors.find(v =>
                v.status === 'active' &&
                v.loginEmail === normalizedEmail &&
                normalizeString(v.loginPassword) === normalizeString(password)
            ) || null;
        }

        if (!matchedVendor) {
            const hasUsersCredentials = liveUsers.some(user => user.email && user.password);
            const hasVendorCredentials = vendors.some(v => v.loginEmail && normalizeString(v.loginPassword));
            const missingCredentialSources = !hasUsersCredentials && !hasVendorCredentials;
            const matchingUsersByEmail = liveUsers.filter(user => user.email === normalizedEmail);
            const matchingVendorsByEmail = vendors.filter(v => v.loginEmail === normalizedEmail);
            const emailExistsInAuthSources = matchingUsersByEmail.length > 0 || matchingVendorsByEmail.length > 0;
            const inactiveVendorMatch = matchingVendorsByEmail.some(v => String(v.status || '').toLowerCase() !== 'active');
            const wrongPasswordInUsers = matchingUsersByEmail.length > 0 && !matchingUsersByEmail.some(user => String(user.password || '') === String(password));
            const wrongPasswordInVendors = matchingVendorsByEmail.length > 0 && !matchingVendorsByEmail.some(v => normalizeString(v.loginPassword) === normalizeString(password));

            let diagnosticError = 'Invalid Gmail ID/password, or no vendor mapping found.';
            if (authErrorMessage === 'Invalid credentials') {
                diagnosticError = 'Invalid Gmail ID/password.';
            } else if (inactiveVendorMatch) {
                diagnosticError = 'Your vendor is marked inactive. Contact production team.';
            } else if (!emailExistsInAuthSources && missingCredentialSources) {
                diagnosticError = 'Login data not found in Apps Script response. Check Vendors/ProductionTeam sheets and deployed script version.';
            } else if (!emailExistsInAuthSources) {
                diagnosticError = 'Email not found in login data. Verify login_email in Vendors or email in ProductionTeam.';
            } else if (wrongPasswordInUsers || wrongPasswordInVendors) {
                diagnosticError = 'Password does not match the stored value for this email.';
            } else if (authErrorMessage === 'Invalid action' && missingCredentialSources) {
                diagnosticError = 'Login API not configured in Apps Script. Ensure authenticateVendor/getUsers are deployed and login columns exist in sheet data.';
            }

            setLoginError(
                diagnosticError
            );
            setLoggingIn(false);
            return;
        }

        setSelectedVendor(matchedVendor);
        setIsAdmin(false);
        setLoggedInEmail(normalizedEmail);
        setPassword('');
        setLoggingIn(false);
    };

    const handleLogout = () => {
        setSelectedVendor(null);
        setIsAdmin(false);
        setLoggedInEmail('');
        setPassword('');
        setLoginError('');
    };

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                background: '#f8f9fb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <RefreshCw size={48} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
                    <p style={{ marginTop: '1rem', color: '#64748b' }}>Loading vendors...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                minHeight: '100vh',
                background: '#f8f9fb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            }}>
                <div style={{
                    background: 'white',
                    border: '1px solid #fee2e2',
                    borderRadius: '8px',
                    padding: '2rem',
                    maxWidth: '500px',
                    textAlign: 'center'
                }}>
                    <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 1rem auto' }} />
                    <h2 style={{ margin: '0 0 0.5rem 0', color: '#1e293b' }}>Connection Error</h2>
                    <p style={{ margin: '0 0 1.5rem 0', color: '#64748b' }}>{error}</p>
                    <button
                        onClick={loadVendors}
                        style={{
                            background: '#3b82f6',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.625rem 1.5rem',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            margin: '0 auto'
                        }}
                    >
                        <RefreshCw size={16} />
                        Retry Connection
                    </button>
                    <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                        Make sure you've configured the SHEETS_API_URL in the app code
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: '#f8f9fb',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            color: '#1e293b'
        }}>
            <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
            {/* Header */}
            <header style={{
                background: '#1e3a5f',
                padding: '0.75rem 2rem',
                position: 'sticky',
                top: 0,
                zIndex: 1000,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                        <span style={{ fontSize: '1.5rem', fontWeight: '600', color: 'white' }}>Quince</span>
                        <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>
                            Factory Capacity Management
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        {selectedVendor || isAdmin ? (
                            <>
                                <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.8)' }}>
                                    {isAdmin ? `Admin User • ${loggedInEmail}` : `${selectedVendor.name} (${selectedVendor.id}) • ${loggedInEmail}`}
                                </div>
                                <button
                                    onClick={handleLogout}
                                    style={{
                                        background: 'rgba(255,255,255,0.15)',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        borderRadius: '6px',
                                        padding: '0.5rem 1rem',
                                        color: 'white',
                                        fontSize: '0.875rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.8)' }}>
                                Vendor Login Required
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            {isAdmin ? (
                <ProductionInterface vendors={vendors} onRefresh={loadVendors} />
            ) : selectedVendor ? (
                <VendorInterface vendor={selectedVendor} loggedInEmail={loggedInEmail} />
            ) : (
                <div style={{ maxWidth: '420px', margin: '3rem auto', padding: '0 1rem' }}>
                    <form
                        onSubmit={authenticateVendor}
                        style={{
                            background: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '10px',
                            padding: '1.5rem',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                        }}
                    >
                        <h2 style={{ margin: '0 0 0.375rem 0', color: '#1e293b', fontSize: '1.25rem' }}>Vendor Login</h2>
                        <p style={{ margin: '0 0 1.25rem 0', color: '#64748b', fontSize: '0.875rem' }}>
                            Use the Gmail ID and password mapped to your vendor account.
                        </p>

                        <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.8125rem', color: '#475569', fontWeight: '500' }}>
                            Gmail ID
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="vendor@gmail.com"
                            style={{
                                width: '100%',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                padding: '0.625rem 0.75rem',
                                marginBottom: '0.875rem',
                                fontSize: '0.875rem'
                            }}
                        />

                        <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.8125rem', color: '#475569', fontWeight: '500' }}>
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            style={{
                                width: '100%',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                padding: '0.625rem 0.75rem',
                                marginBottom: '1rem',
                                fontSize: '0.875rem'
                            }}
                        />

                        {(loginError || error) && (
                            <div style={{
                                marginBottom: '1rem',
                                padding: '0.625rem 0.75rem',
                                background: '#fef2f2',
                                color: '#b91c1c',
                                border: '1px solid #fecaca',
                                borderRadius: '6px',
                                fontSize: '0.8125rem'
                            }}>
                                {loginError || error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loggingIn}
                            style={{
                                width: '100%',
                                background: loggingIn ? '#94a3b8' : '#1e3a5f',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '0.625rem 1rem',
                                color: 'white',
                                cursor: loggingIn ? 'not-allowed' : 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: '600'
                            }}
                        >
                            {loggingIn ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

const VendorInterface = ({ vendor, loggedInEmail }) => {
    const [activeTab, setActiveTab] = useState('capacity');
    const [defaultCapacity, setDefaultCapacity] = useState(1000);
    const [dollarLimit, setDollarLimit] = useState(500000);
    const [weekOverrides, setWeekOverrides] = useState({});
    const [subDeptCapacities, setSubDeptCapacities] = useState({
        'Tops': 400,
        'Bottoms': 300,
        'Outerwear': 200,
        'Accessories': 100
    });
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasPendingSubmission, setHasPendingSubmission] = useState(false);
    const [pendingEntries, setPendingEntries] = useState([]);

    const tabs = [
        { id: 'capacity', label: 'Capacity Input', icon: Calendar },
        { id: 'upload', label: 'Bulk Upload', icon: Upload },
        { id: 'history', label: 'Submission History', icon: Clock }
    ];

    // Load capacity data when vendor changes
    useEffect(() => {
        loadCapacityData();
        loadPendingStatus();
    }, [vendor.id]);

    const loadPendingStatus = async () => {
        try {
            const submissions = await api.get('getSubmissions', { status: 'pending' });
            const vendorPending = (submissions || []).filter(
                s => String(s.vendor_id) === String(vendor.id)
            );
            setHasPendingSubmission(vendorPending.length > 0);

            // Try to load pending entries from the most recent pending submission
            if (vendorPending.length > 0) {
                const latestPending = vendorPending[vendorPending.length - 1];
                try {
                    const detail = await api.get('getSubmissionDetails', {
                        submission_id: latestPending.submission_id
                    });
                    if (detail && detail.data_snapshot && detail.data_snapshot.entries) {
                        setPendingEntries(detail.data_snapshot.entries);
                    } else {
                        setPendingEntries([]);
                    }
                } catch (detailErr) {
                    console.warn('Could not load pending submission details for indicators.', detailErr);
                    setPendingEntries([]);
                }
            } else {
                setPendingEntries([]);
            }
        } catch (err) {
            console.error('Error checking pending status:', err);
        }
    };

    const loadCapacityData = async () => {
        setLoading(true);
        try {
            const year = 2026;

            // Load capacity data
            const capacityData = await api.get('getCapacity', {
                vendor_id: vendor.id,
                year: year
            });

            // Load dollar limit if applicable
            if (vendor.type === 'value' || vendor.type === 'both') {
                const limitData = await api.get('getDollarLimit', { vendor_id: vendor.id });
                if (limitData && limitData.dollar_limit) {
                    setDollarLimit(limitData.dollar_limit);
                }
            }

            // Process capacity data
            if (capacityData && capacityData.length > 0) {
                const overrides = {};
                let defaultCap = 1000;
                const subDeptCaps = {
                    'Tops': 400,
                    'Bottoms': 300,
                    'Outerwear': 200,
                    'Accessories': 100
                };

                capacityData.forEach(entry => {
                    if (entry.is_override) {
                        if (entry.subdept) {
                            // Sub-dept override
                            if (!overrides[entry.subdept]) overrides[entry.subdept] = {};
                            overrides[entry.subdept][entry.week_number] = entry.capacity_value;
                        } else {
                            // Vendor-level override
                            overrides[entry.week_number] = entry.capacity_value;
                        }
                    } else {
                        // Default capacity
                        if (entry.subdept) {
                            subDeptCaps[entry.subdept] = entry.capacity_value;
                        } else {
                            defaultCap = entry.capacity_value;
                        }
                    }
                });

                setDefaultCapacity(defaultCap);
                setWeekOverrides(overrides);
                setSubDeptCapacities(subDeptCaps);
            }
        } catch (err) {
            console.error('Error loading capacity data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const year = 2026;
            const entries = [];

            // Build capacity entries based on vendor settings
            if (vendor.subDeptMode === 'vendor') {
                // Add default capacity for all 52 weeks
                for (let week = 1; week <= 52; week++) {
                    entries.push({
                        week_number: week,
                        capacity_value: weekOverrides[week] || defaultCapacity,
                        subdept: '',
                        is_override: weekOverrides[week] !== undefined
                    });
                }
            } else {
                // Add default capacity for each sub-dept for all 52 weeks
                SUB_DEPARTMENTS.forEach(dept => {
                    for (let week = 1; week <= 52; week++) {
                        const deptOverrides = weekOverrides[dept] || {};
                        entries.push({
                            week_number: week,
                            capacity_value: deptOverrides[week] || subDeptCapacities[dept],
                            subdept: dept,
                            is_override: deptOverrides[week] !== undefined
                        });
                    }
                });
            }

            // Do NOT save capacity directly — submit for approval only.
            // The data is stored in the submission snapshot and applied only when approved.
            await api.post('submitForApproval', {
                vendor_id: vendor.id,
                submitted_by: loggedInEmail || 'Vendor User',
                submission_type: 'manual',
                comments: '',
                entries: entries,
                dollar_limit: (vendor.type === 'value' || vendor.type === 'both') ? dollarLimit : null,
                year: year,
                default_capacity: defaultCapacity,
                week_overrides: weekOverrides,
                subdept_capacities: subDeptCapacities
            });

            alert('Capacity data submitted for approval! Changes will be applied once approved by the Production team.');
            setIsEditing(false);
            loadCapacityData();
            loadPendingStatus();

        } catch (err) {
            console.error('Error saving capacity data:', err);
            alert('Failed to submit capacity data. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <RefreshCw size={32} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
                <p style={{ marginTop: '1rem', color: '#64748b' }}>Loading capacity data...</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Vendor Info Banner */}
            <div style={{
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1.5rem',
                marginBottom: '1.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                        <h2 style={{ margin: '0 0 0.75rem 0', fontSize: '1.25rem', color: '#1e293b', fontWeight: '600' }}>{vendor.name}</h2>
                        <div style={{ display: 'flex', gap: '2rem', fontSize: '0.875rem', color: '#64748b' }}>
                            <div>
                                <span style={{ color: '#94a3b8' }}>Vendor ID:</span> <strong style={{ color: '#1e293b' }}>{vendor.id}</strong>
                            </div>
                            <div>
                                <span style={{ color: '#94a3b8' }}>Tracking Mode:</span>{' '}
                                <span style={{
                                    background: '#dbeafe',
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '16px',
                                    color: '#1e40af',
                                    fontWeight: '500',
                                    fontSize: '0.75rem'
                                }}>
                                    {vendor.type === 'both' ? 'Unit + $ Value' : vendor.type === 'unit' ? 'Unit Capacity' : '$ Value Only'}
                                </span>
                            </div>
                            <div>
                                <span style={{ color: '#94a3b8' }}>Sub-Dept Mode:</span>{' '}
                                <span style={{
                                    background: '#e0e7ff',
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '16px',
                                    color: '#4338ca',
                                    fontWeight: '500',
                                    fontSize: '0.75rem'
                                }}>
                                    {vendor.subDeptMode === 'vendor' ? 'Vendor Level' : 'By Sub-Department'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            if (isEditing) {
                                handleSave();
                            } else {
                                setIsEditing(true);
                            }
                        }}
                        disabled={saving}
                        style={{
                            background: saving ? '#cbd5e1' : isEditing ? '#10b981' : '#3b82f6',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.625rem 1.25rem',
                            color: 'white',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                    >
                        {saving ? (
                            <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</>
                        ) : isEditing ? (
                            <><Save size={16} /> Save Changes</>
                        ) : (
                            <><Edit2 size={16} /> Edit Capacity</>
                        )}
                    </button>
                </div>
            </div>

            {/* Pending Submission Banner */}
            {hasPendingSubmission && (
                <div style={{
                    background: '#fef3c7',
                    border: '1px solid #fcd34d',
                    borderRadius: '8px',
                    padding: '1rem 1.5rem',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                }}>
                    <Clock size={20} color="#f59e0b" style={{ flexShrink: 0 }} />
                    <div>
                        <div style={{ fontSize: '0.875rem', color: '#92400e', fontWeight: '600' }}>
                            Pending Approval
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: '#a16207', marginTop: '0.125rem' }}>
                            You have a capacity submission awaiting Production team approval. The data shown below is the last approved version. Your submitted changes will appear once approved.
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div style={{
                background: 'white',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                border: '1px solid #e2e8f0'
            }}>
                <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid #e2e8f0' }}>
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                                    padding: '1rem 1.5rem',
                                    color: activeTab === tab.id ? '#3b82f6' : '#64748b',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Icon size={18} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Tab Content */}
                <div style={{ padding: '1.5rem' }}>
                    {activeTab === 'capacity' && (
                        <CapacityInput
                            vendor={vendor}
                            defaultCapacity={defaultCapacity}
                            setDefaultCapacity={setDefaultCapacity}
                            dollarLimit={dollarLimit}
                            setDollarLimit={setDollarLimit}
                            weekOverrides={weekOverrides}
                            setWeekOverrides={setWeekOverrides}
                            subDeptCapacities={subDeptCapacities}
                            setSubDeptCapacities={setSubDeptCapacities}
                            isEditing={isEditing}
                            pendingEntries={pendingEntries}
                        />
                    )}
                    {activeTab === 'upload' && (
                        <BulkUpload
                            vendor={vendor}
                            loggedInEmail={loggedInEmail}
                            onUploadSuccess={loadCapacityData}
                        />
                    )}
                    {activeTab === 'history' && <SubmissionHistory vendor={vendor} />}
                </div>
            </div>
        </div>
    );
};

const CapacityInput = ({ vendor, defaultCapacity, setDefaultCapacity, dollarLimit, setDollarLimit, weekOverrides, setWeekOverrides, subDeptCapacities, setSubDeptCapacities, isEditing, pendingEntries = [] }) => {
    const [overrideMode, setOverrideMode] = useState('single');
    const [selectedWeek, setSelectedWeek] = useState(null);
    const [rangeStart, setRangeStart] = useState(null);
    const [rangeEnd, setRangeEnd] = useState(null);
    const [overrideValue, setOverrideValue] = useState('');
    const [selectedSubDept, setSelectedSubDept] = useState('Tops');

    const weeks = Array.from({ length: 52 }, (_, i) => i + 1);
    const currentWeek = getCurrentWeekNumber();

    // Build a lookup of pending changes: { "week" or "week|subdept" => pendingCapacityValue }
    const pendingWeekMap = {};
    if (pendingEntries.length > 0) {
        pendingEntries.forEach(entry => {
            const key = vendor.subDeptMode === 'subdept'
                ? `${entry.week_number}|${entry.subdept || ''}`
                : `${entry.week_number}`;
            pendingWeekMap[key] = entry.capacity_value;
        });
    }

    const getWeekDateRange = (weekNumber) => {
        const startDate = new Date(2026, 1, 2);
        const weekStartDate = new Date(startDate);
        weekStartDate.setDate(startDate.getDate() + (weekNumber - 1) * 7);

        const weekEndDate = new Date(weekStartDate);
        weekEndDate.setDate(weekStartDate.getDate() + 6);

        const formatDate = (date) => {
            const month = date.getMonth() + 1;
            const day = date.getDate();
            return `${month}/${day}`;
        };

        return `${formatDate(weekStartDate)}-${formatDate(weekEndDate)}`;
    };

    const addOverride = () => {
        if (overrideMode === 'single' && selectedWeek && overrideValue) {
            setWeekOverrides(prev => ({ ...prev, [selectedWeek]: parseInt(overrideValue) }));
            setSelectedWeek(null);
            setOverrideValue('');
        } else if (overrideMode === 'range' && rangeStart && rangeEnd && overrideValue) {
            const newOverrides = {};
            for (let i = rangeStart; i <= rangeEnd; i++) {
                newOverrides[i] = parseInt(overrideValue);
            }
            setWeekOverrides(prev => ({ ...prev, ...newOverrides }));
            setRangeStart(null);
            setRangeEnd(null);
            setOverrideValue('');
        }
    };

    return (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
            {/* Default Capacity Section */}
            <div>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#1e293b', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Settings size={18} color="#3b82f6" />
                    Default Weekly Capacity
                </h3>

                {vendor.subDeptMode === 'vendor' ? (
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500' }}>
                            Default Capacity (units/week)
                        </label>
                        <input
                            type="number"
                            value={defaultCapacity}
                            onChange={(e) => setDefaultCapacity(parseInt(e.target.value))}
                            disabled={!isEditing}
                            style={{
                                width: '300px',
                                background: 'white',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                padding: '0.625rem 0.875rem',
                                color: '#1e293b',
                                fontSize: '0.875rem'
                            }}
                        />
                        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                            This default will auto-populate all weeks. You can override specific weeks below.
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                        {SUB_DEPARTMENTS.map(dept => (
                            <div key={dept}>
                                <label style={{ display: 'block', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500' }}>
                                    {dept} (units/week)
                                </label>
                                <input
                                    type="number"
                                    value={subDeptCapacities[dept]}
                                    onChange={(e) => setSubDeptCapacities(prev => ({ ...prev, [dept]: parseInt(e.target.value) }))}
                                    disabled={!isEditing}
                                    style={{
                                        width: '100%',
                                        background: 'white',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '6px',
                                        padding: '0.625rem 0.875rem',
                                        color: '#1e293b',
                                        fontSize: '0.875rem'
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {(vendor.type === 'value' || vendor.type === 'both') && (
                    <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500' }}>
                            <DollarSign size={16} style={{ display: 'inline', marginRight: '0.25rem', verticalAlign: 'text-bottom' }} />
                            Maximum Working Capital Limit
                        </label>
                        <input
                            type="number"
                            value={dollarLimit}
                            onChange={(e) => setDollarLimit(parseInt(e.target.value))}
                            disabled={!isEditing}
                            style={{
                                width: '300px',
                                background: 'white',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                padding: '0.625rem 0.875rem',
                                color: '#1e293b',
                                fontSize: '0.875rem'
                            }}
                        />
                        <div style={{
                            marginTop: '1rem',
                            background: '#dbeafe',
                            border: '1px solid #93c5fd',
                            borderRadius: '6px',
                            padding: '0.875rem'
                        }}>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#1e40af', lineHeight: '1.5' }}>
                                <strong>How this works:</strong> This represents the maximum dollar value that can be outstanding for Quince at any time, including:
                            </p>
                            <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem', fontSize: '0.75rem', color: '#1e40af', lineHeight: '1.5' }}>
                                <li>Value of current inventory held for Quince</li>
                                <li>Value of open/in-progress POs (not yet production complete)</li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            {/* Week Overrides Section */}
            {vendor.type !== 'value' && (
                <div style={{ marginTop: '1rem' }}>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#1e293b', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={18} color="#3b82f6" />
                        Week-Level Overrides
                    </h3>

                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <button
                            onClick={() => setOverrideMode('single')}
                            disabled={!isEditing}
                            style={{
                                background: overrideMode === 'single' ? '#dbeafe' : 'white',
                                border: `1px solid ${overrideMode === 'single' ? '#3b82f6' : '#cbd5e1'}`,
                                borderRadius: '6px',
                                padding: '0.5rem 1rem',
                                color: overrideMode === 'single' ? '#1e40af' : '#64748b',
                                cursor: isEditing ? 'pointer' : 'not-allowed',
                                fontSize: '0.875rem',
                                fontWeight: '500'
                            }}
                        >
                            Single Week
                        </button>
                        <button
                            onClick={() => setOverrideMode('range')}
                            disabled={!isEditing}
                            style={{
                                background: overrideMode === 'range' ? '#dbeafe' : 'white',
                                border: `1px solid ${overrideMode === 'range' ? '#3b82f6' : '#cbd5e1'}`,
                                borderRadius: '6px',
                                padding: '0.5rem 1rem',
                                color: overrideMode === 'range' ? '#1e40af' : '#64748b',
                                cursor: isEditing ? 'pointer' : 'not-allowed',
                                fontSize: '0.875rem',
                                fontWeight: '500'
                            }}
                        >
                            Date Range
                        </button>
                    </div>

                    {vendor.subDeptMode === 'subdept' && (
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500' }}>
                                Sub-Department
                            </label>
                            <select
                                value={selectedSubDept}
                                onChange={(e) => setSelectedSubDept(e.target.value)}
                                disabled={!isEditing}
                                style={{
                                    background: 'white',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '6px',
                                    padding: '0.625rem 0.875rem',
                                    color: '#1e293b',
                                    fontSize: '0.875rem',
                                    width: '200px'
                                }}
                            >
                                {SUB_DEPARTMENTS.map(dept => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'end', flexWrap: 'wrap' }}>
                        {overrideMode === 'single' ? (
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500' }}>
                                    Week Number
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="52"
                                    value={selectedWeek || ''}
                                    onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
                                    disabled={!isEditing}
                                    placeholder="e.g., 42"
                                    style={{
                                        width: '120px',
                                        background: 'white',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '6px',
                                        padding: '0.625rem 0.875rem',
                                        color: '#1e293b',
                                        fontSize: '0.875rem'
                                    }}
                                />
                            </div>
                        ) : (
                            <>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500' }}>
                                        Start Week
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="52"
                                        value={rangeStart || ''}
                                        onChange={(e) => setRangeStart(parseInt(e.target.value))}
                                        disabled={!isEditing}
                                        placeholder="e.g., 40"
                                        style={{
                                            width: '120px',
                                            background: 'white',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '6px',
                                            padding: '0.625rem 0.875rem',
                                            color: '#1e293b',
                                            fontSize: '0.875rem'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500' }}>
                                        End Week
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="52"
                                        value={rangeEnd || ''}
                                        onChange={(e) => setRangeEnd(parseInt(e.target.value))}
                                        disabled={!isEditing}
                                        placeholder="e.g., 48"
                                        style={{
                                            width: '120px',
                                            background: 'white',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '6px',
                                            padding: '0.625rem 0.875rem',
                                            color: '#1e293b',
                                            fontSize: '0.875rem'
                                        }}
                                    />
                                </div>
                            </>
                        )}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500' }}>
                                Capacity (units)
                            </label>
                            <input
                                type="number"
                                value={overrideValue}
                                onChange={(e) => setOverrideValue(e.target.value)}
                                disabled={!isEditing}
                                placeholder="e.g., 1500"
                                style={{
                                    width: '150px',
                                    background: 'white',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '6px',
                                    padding: '0.625rem 0.875rem',
                                    color: '#1e293b',
                                    fontSize: '0.875rem'
                                }}
                            />
                        </div>
                        <button
                            onClick={addOverride}
                            disabled={!isEditing}
                            style={{
                                background: isEditing ? '#10b981' : '#cbd5e1',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '0.625rem 1.25rem',
                                color: 'white',
                                cursor: isEditing ? 'pointer' : 'not-allowed',
                                fontSize: '0.875rem',
                                fontWeight: '500'
                            }}
                        >
                            Add Override
                        </button>
                    </div>

                    {/* Capacity Calendar View */}
                    <div style={{ marginTop: '2rem' }}>
                        <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#64748b', fontWeight: '600' }}>
                            52-Week Capacity Overview
                        </h4>
                        {vendor.subDeptMode === 'subdept' && (
                            <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
                                {SUB_DEPARTMENTS.map(dept => (
                                    <button
                                        key={dept}
                                        onClick={() => setSelectedSubDept(dept)}
                                        style={{
                                            background: selectedSubDept === dept ? '#e0e7ff' : 'white',
                                            border: `1px solid ${selectedSubDept === dept ? '#6366f1' : '#cbd5e1'}`,
                                            borderRadius: '6px',
                                            padding: '0.375rem 0.875rem',
                                            color: selectedSubDept === dept ? '#4338ca' : '#64748b',
                                            cursor: 'pointer',
                                            fontSize: '0.8125rem',
                                            fontWeight: '500'
                                        }}
                                    >
                                        {dept}
                                    </button>
                                ))}
                            </div>
                        )}
                        {/* Pending changes legend */}
                        {pendingEntries.length > 0 && (
                            <div style={{
                                marginBottom: '0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.75rem',
                                color: '#92400e',
                                background: '#fffbeb',
                                border: '1px solid #fcd34d',
                                borderRadius: '6px',
                                padding: '0.5rem 0.75rem'
                            }}>
                                <div style={{
                                    width: '8px', height: '8px', borderRadius: '50%',
                                    background: '#f59e0b', border: '1px solid #d97706', flexShrink: 0
                                }} />
                                <span>Amber cells have pending changes awaiting Production approval. Hover to see proposed value.</span>
                            </div>
                        )}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(13, 1fr)',
                            gap: '0.5rem',
                            maxHeight: '350px',
                            overflow: 'auto',
                            padding: '1rem',
                            background: '#f8fafc',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0'
                        }}>
                            {weeks.map(week => {
                                const capacity = vendor.subDeptMode === 'subdept'
                                    ? ((weekOverrides[selectedSubDept] || {})[week] || subDeptCapacities[selectedSubDept] || 0)
                                    : (weekOverrides[week] || defaultCapacity);
                                const isOverride = vendor.subDeptMode === 'subdept'
                                    ? ((weekOverrides[selectedSubDept] || {})[week] !== undefined)
                                    : (weekOverrides[week] !== undefined);
                                const isPast = week < currentWeek;
                                const isCurrent = week === currentWeek;
                                const dateRange = getWeekDateRange(week);

                                // Check if this week has a pending change
                                const pendingKey = vendor.subDeptMode === 'subdept'
                                    ? `${week}|${selectedSubDept}`
                                    : `${week}`;
                                const hasPending = pendingWeekMap[pendingKey] !== undefined;
                                const pendingValue = hasPending ? pendingWeekMap[pendingKey] : null;
                                const pendingDiffers = hasPending && Number(pendingValue) !== Number(capacity);

                                return (
                                    <div
                                        key={week}
                                        style={{
                                            background: pendingDiffers
                                                ? '#fffbeb'
                                                : isCurrent
                                                    ? '#dbeafe'
                                                    : isOverride
                                                        ? '#e0e7ff'
                                                        : isPast
                                                            ? '#f1f5f9'
                                                            : 'white',
                                            border: `1px solid ${pendingDiffers
                                                ? '#f59e0b'
                                                : isCurrent
                                                    ? '#3b82f6'
                                                    : isOverride
                                                        ? '#6366f1'
                                                        : '#e2e8f0'
                                                }`,
                                            borderRadius: '6px',
                                            padding: '0.5rem',
                                            textAlign: 'center',
                                            opacity: isPast ? 0.6 : 1,
                                            position: 'relative'
                                        }}
                                        title={pendingDiffers
                                            ? `Week ${week} (${dateRange}): Current ${capacity.toLocaleString()} → Pending ${Number(pendingValue).toLocaleString()} units`
                                            : `Week ${week} (${dateRange}): ${capacity.toLocaleString()} units`
                                        }
                                    >
                                        {/* Pending change indicator dot */}
                                        {pendingDiffers && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '3px',
                                                right: '3px',
                                                width: '7px',
                                                height: '7px',
                                                borderRadius: '50%',
                                                background: '#f59e0b',
                                                border: '1px solid #d97706'
                                            }} />
                                        )}
                                        <div style={{ fontSize: '0.625rem', color: '#64748b', marginBottom: '0.125rem', fontWeight: '600' }}>
                                            W{week}
                                        </div>
                                        <div style={{ fontSize: '0.5rem', color: '#94a3b8', marginBottom: '0.25rem', lineHeight: '1' }}>
                                            {dateRange}
                                        </div>
                                        <div style={{
                                            fontSize: '0.75rem',
                                            fontWeight: '700',
                                            color: isOverride ? '#4338ca' : '#1e293b'
                                        }}>
                                            {capacity.toLocaleString()}
                                        </div>
                                        {/* Pending value shown below current */}
                                        {pendingDiffers && (
                                            <div style={{
                                                fontSize: '0.5625rem',
                                                fontWeight: '600',
                                                color: '#d97706',
                                                marginTop: '0.125rem',
                                                lineHeight: '1'
                                            }}>
                                                → {Number(pendingValue).toLocaleString()}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

const BulkUpload = ({ vendor, loggedInEmail, onUploadSuccess }) => {
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    const handleFileSelected = (file) => {
        if (!file) return;
        setSelectedFile(file);
        setStatusMessage('');
    };

    const handleInputChange = (event) => {
        const file = event.target.files && event.target.files[0];
        handleFileSelected(file);
    };

    const handleDrop = (event) => {
        event.preventDefault();
        setDragActive(false);
        const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
        handleFileSelected(file);
    };

    const openFilePicker = () => {
        const input = document.getElementById('bulk-upload-file-input');
        if (input) input.click();
    };

    const parseCsvRows = (csvText) => {
        const lines = csvText
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean);

        if (lines.length < 2) {
            throw new Error('Template has no data rows.');
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const dataLines = lines.slice(1);

        return dataLines.map((line, index) => {
            const values = line.split(',').map(v => v.trim());
            const row = {};
            headers.forEach((header, i) => {
                row[header] = values[i] || '';
            });
            row.__rowNum = index + 2;
            return row;
        });
    };

    const validateAndTransformRows = (rows) => {
        const entries = [];
        const includeSubDept = vendor.subDeptMode === 'subdept';
        const seen = new Set();
        let parsedDollarLimit = null;
        const currentWeek = getCurrentWeekNumber();

        rows.forEach((row) => {
            const week = Number(row.week_number);
            const capacity = Number(row.capacity_value);

            if (!Number.isInteger(week) || week < 1 || week > 52) {
                throw new Error(`Invalid week_number at row ${row.__rowNum}. Must be 1-52.`);
            }
            if (week < currentWeek) {
                throw new Error(`Week ${week} at row ${row.__rowNum} is in the past (current week is ${currentWeek}). You cannot upload capacity data for past weeks.`);
            }
            if (!Number.isFinite(capacity) || capacity <= 0) {
                throw new Error(`Invalid capacity_value at row ${row.__rowNum}. Must be > 0.`);
            }

            let subdept = '';
            if (includeSubDept) {
                subdept = (row.subdept || '').trim();
                if (!SUB_DEPARTMENTS.includes(subdept)) {
                    throw new Error(`Invalid subdept at row ${row.__rowNum}. Use one of: ${SUB_DEPARTMENTS.join(', ')}.`);
                }
            }

            const key = includeSubDept ? `${week}|${subdept}` : `${week}`;
            if (seen.has(key)) {
                throw new Error(`Duplicate entry found for ${includeSubDept ? `week ${week}, ${subdept}` : `week ${week}`}.`);
            }
            seen.add(key);

            if (vendor.type === 'value' || vendor.type === 'both') {
                const rowLimit = row.dollar_limit ? Number(row.dollar_limit) : NaN;
                if (!Number.isNaN(rowLimit)) {
                    if (!Number.isFinite(rowLimit) || rowLimit <= 0) {
                        throw new Error(`Invalid dollar_limit at row ${row.__rowNum}. Must be > 0.`);
                    }
                    if (parsedDollarLimit === null) {
                        parsedDollarLimit = rowLimit;
                    }
                }
            }

            entries.push({
                week_number: week,
                capacity_value: capacity,
                subdept,
                is_override: true
            });
        });

        return { entries, dollarLimit: parsedDollarLimit };
    };

    const handleUploadToSheet = async () => {
        if (!selectedFile) {
            setStatusMessage('Select a file before uploading.');
            return;
        }

        const lowerName = selectedFile.name.toLowerCase();
        if (!lowerName.endsWith('.csv')) {
            setStatusMessage('Only .csv upload is supported right now. Please use the downloaded CSV template.');
            return;
        }

        setUploading(true);
        setStatusMessage('');

        try {
            const csvText = await selectedFile.text();
            const rows = parseCsvRows(csvText);
            const { entries, dollarLimit: parsedDollarLimit } = validateAndTransformRows(rows);

            // Do NOT save capacity directly — submit for approval only.
            // The data is stored in the submission snapshot and applied only when approved.
            await api.post('submitForApproval', {
                vendor_id: vendor.id,
                submitted_by: loggedInEmail || 'Vendor User',
                submission_type: 'bulk_upload',
                comments: `Bulk upload file: ${selectedFile.name}`,
                // Snapshot stores the actual data for later application on approval
                entries: entries,
                dollar_limit: parsedDollarLimit,
                year: 2026,
                csv_content: csvText,
                csv_filename: selectedFile.name
            });

            setStatusMessage(`Validated ${entries.length} rows and submitted for approval. Changes will be applied once approved by the Production team.`);
            setSelectedFile(null);
            // Refresh submission history but NOT capacity data (not yet applied)
        } catch (err) {
            console.error('Bulk upload failed:', err);
            setStatusMessage(err.message || 'Bulk upload failed. Please check the file format.');
        } finally {
            setUploading(false);
        }
    };

    const handleDownloadTemplate = () => {
        const includeDollarLimit = vendor.type === 'value' || vendor.type === 'both';
        const filenameSafeVendor = (vendor.name || vendor.id || 'vendor').toString().replace(/\s+/g, '_').toLowerCase();
        let headers = [];
        let sampleRows = [];

        if (vendor.subDeptMode === 'subdept') {
            headers = ['week_number', 'subdept', 'capacity_value'];
            if (includeDollarLimit) headers.push('dollar_limit');
            sampleRows = [
                ['1', 'Tops', '400'],
                ['1', 'Bottoms', '300'],
                ['1', 'Outerwear', '200'],
                ['1', 'Accessories', '100']
            ];
        } else {
            headers = ['week_number', 'capacity_value'];
            if (includeDollarLimit) headers.push('dollar_limit');
            sampleRows = [['1', '1000']];
        }

        if (includeDollarLimit) {
            sampleRows = sampleRows.map(row => [...row, '500000']);
        }

        const csvContent = [headers.join(','), ...sampleRows.map(row => row.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filenameSafeVendor}_bulk_upload_template.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
            {/* Template Download */}
            <div>
                <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', color: '#1e293b', fontWeight: '600' }}>
                    Download Template
                </h3>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#64748b' }}>
                    Download the Excel template pre-configured for your vendor settings ({vendor.type === 'both' ? 'Unit Capacity + $ Value' : vendor.type}).
                </p>
                <button
                    onClick={handleDownloadTemplate}
                    style={{
                        background: 'white',
                        border: '1px solid #3b82f6',
                        borderRadius: '6px',
                        padding: '0.625rem 1.25rem',
                        color: '#3b82f6',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    <Download size={16} />
                    Download Template
                </button>
            </div>

            {/* Upload Area */}
            <div
                onDragEnter={() => setDragActive(true)}
                onDragLeave={() => setDragActive(false)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                style={{
                    background: dragActive ? '#dbeafe' : '#f8fafc',
                    border: `2px dashed ${dragActive ? '#3b82f6' : '#cbd5e1'}`,
                    borderRadius: '8px',
                    padding: '3rem',
                    textAlign: 'center',
                    transition: 'all 0.2s'
                }}
            >
                <Upload size={48} color="#3b82f6" style={{ margin: '0 auto 1rem auto' }} />
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#1e293b', fontWeight: '600' }}>
                    Drop your file here or click to browse
                </h3>
                <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.875rem', color: '#64748b' }}>
                    Supported formats: .xlsx, .xls, .csv
                </p>
                <input
                    id="bulk-upload-file-input"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleInputChange}
                    style={{ display: 'none' }}
                />
                <button
                    onClick={openFilePicker}
                    style={{
                        background: '#3b82f6',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.625rem 1.5rem',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}
                >
                    Select File
                </button>
                <button
                    onClick={handleUploadToSheet}
                    disabled={!selectedFile || uploading}
                    style={{
                        marginLeft: '0.75rem',
                        background: !selectedFile || uploading ? '#cbd5e1' : '#10b981',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.625rem 1.5rem',
                        color: 'white',
                        cursor: !selectedFile || uploading ? 'not-allowed' : 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}
                >
                    {uploading ? 'Uploading...' : 'Upload to Google Sheet'}
                </button>
                {selectedFile && (
                    <p style={{ margin: '0.75rem 0 0 0', fontSize: '0.8125rem', color: '#0f766e', fontWeight: '500' }}>
                        Selected: {selectedFile.name}
                    </p>
                )}
                {statusMessage && (
                    <p style={{
                        margin: '0.5rem 0 0 0',
                        fontSize: '0.8125rem',
                        color: statusMessage.startsWith('Uploaded') ? '#0f766e' : '#b91c1c',
                        fontWeight: '500'
                    }}>
                        {statusMessage}
                    </p>
                )}
            </div>

            {/* Validation Rules */}
            <div>
                <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', color: '#1e293b', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={18} color="#f59e0b" />
                    Validation Rules
                </h3>
                <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.875rem', color: '#64748b', lineHeight: '1.8' }}>
                    <li>All capacity values must be positive numbers</li>
                    <li>Week numbers must be between 1 and 52</li>
                    <li style={{ color: '#b91c1c', fontWeight: '500' }}>Week numbers must not be in the past (current week or later only)</li>
                    <li>Default capacity is required</li>
                    {vendor.subDeptMode === 'subdept' && <li>Capacity must be provided for all sub-departments</li>}
                    {(vendor.type === 'value' || vendor.type === 'both') && <li>$ Value limit must be a positive number</li>}
                    <li>No duplicate week entries allowed</li>
                </ul>
            </div>
        </div>
    );
};

const SubmissionHistory = ({ vendor }) => {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSubmissions();
    }, [vendor.id]);

    const loadSubmissions = async () => {
        setLoading(true);
        try {
            const data = await api.get('getSubmissions');
            // Filter submissions for this vendor
            const vendorSubmissions = data.filter(s => s.vendor_id === vendor.id);
            setSubmissions(vendorSubmissions);
        } catch (err) {
            console.error('Error loading submissions:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <RefreshCw size={32} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
                <p style={{ marginTop: '1rem', color: '#64748b' }}>Loading submission history...</p>
            </div>
        );
    }

    if (submissions.length === 0) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                <Clock size={48} color="#cbd5e1" style={{ margin: '0 auto 1rem auto' }} />
                <p>No submissions yet</p>
            </div>
        );
    }

    return (
        <div style={{
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            overflow: 'hidden'
        }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ background: '#f8fafc' }}>
                        <th style={{ padding: '0.875rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>Submission ID</th>
                        <th style={{ padding: '0.875rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>Date</th>
                        <th style={{ padding: '0.875rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>Type</th>
                        <th style={{ padding: '0.875rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>Submitted By</th>
                        <th style={{ padding: '0.875rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                        <th style={{ padding: '0.875rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {submissions.map((sub, idx) => (
                        <tr key={sub.submission_id} style={{ borderBottom: idx < submissions.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                            <td style={{ padding: '0.875rem', fontSize: '0.875rem', color: '#1e293b' }}>{sub.submission_id}</td>
                            <td style={{ padding: '0.875rem', fontSize: '0.875rem', color: '#64748b' }}>{sub.submitted_date}</td>
                            <td style={{ padding: '0.875rem', fontSize: '0.875rem', color: '#64748b', textTransform: 'capitalize' }}>{sub.submission_type}</td>
                            <td style={{ padding: '0.875rem', fontSize: '0.875rem', color: '#64748b' }}>{sub.submitted_by}</td>
                            <td style={{ padding: '0.875rem' }}>
                                <span style={{
                                    background: sub.status === 'approved' ? '#d1fae5' : sub.status === 'rejected' ? '#fee2e2' : '#fef3c7',
                                    color: sub.status === 'approved' ? '#065f46' : sub.status === 'rejected' ? '#991b1b' : '#92400e',
                                    padding: '0.25rem 0.625rem',
                                    borderRadius: '12px',
                                    fontSize: '0.75rem',
                                    fontWeight: '500',
                                    textTransform: 'uppercase'
                                }}>
                                    {sub.status}
                                </span>
                            </td>
                            <td style={{ padding: '0.875rem' }}>
                                <button
                                    style={{
                                        background: 'white',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '6px',
                                        padding: '0.375rem 0.75rem',
                                        color: '#3b82f6',
                                        cursor: 'pointer',
                                        fontSize: '0.75rem',
                                        fontWeight: '500',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.375rem'
                                    }}
                                >
                                    <Eye size={14} />
                                    View
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const ProductionInterface = ({ vendors, onRefresh }) => {
    const [activeTab, setActiveTab] = useState('pending');
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        loadPendingCount();
    }, []);

    const loadPendingCount = async () => {
        try {
            const submissions = await api.get('getSubmissions', { status: 'pending' });
            setPendingCount(submissions.length);
        } catch (err) {
            console.error('Error loading pending count:', err);
        }
    };

    const tabs = [
        { id: 'pending', label: 'Pending Approvals', count: pendingCount },
        { id: 'vendors', label: 'Vendor Management', count: vendors.length },
        { id: 'dashboard', label: 'Capacity Dashboard', count: null },
    ];

    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Stats Overview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                {[
                    { label: 'Pending Approvals', value: pendingCount.toString(), icon: Clock, color: '#f59e0b', bgColor: '#fef3c7' },
                    { label: 'Active Vendors', value: vendors.filter(v => v.status === 'active').length.toString(), icon: Users, color: '#3b82f6', bgColor: '#dbeafe' },
                    { label: 'Total Vendors', value: vendors.length.toString(), icon: Package, color: '#10b981', bgColor: '#d1fae5' },
                    { label: 'Inactive Vendors', value: vendors.filter(v => v.status === 'inactive').length.toString(), icon: AlertCircle, color: '#64748b', bgColor: '#f1f5f9' },
                ].map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={idx}
                            style={{
                                background: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                padding: '1.5rem',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                                <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>{stat.label}</div>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    background: stat.bgColor,
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Icon size={20} color={stat.color} />
                                </div>
                            </div>
                            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1e293b' }}>{stat.value}</div>
                        </div>
                    );
                })}
            </div>

            {/* Tabs */}
            <div style={{
                background: 'white',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                border: '1px solid #e2e8f0'
            }}>
                <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid #e2e8f0' }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                                padding: '1rem 1.5rem',
                                color: activeTab === tab.id ? '#3b82f6' : '#64748b',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                transition: 'all 0.2s'
                            }}
                        >
                            {tab.label}
                            {tab.count !== null && (
                                <span style={{
                                    background: activeTab === tab.id ? '#dbeafe' : '#f1f5f9',
                                    color: activeTab === tab.id ? '#1e40af' : '#64748b',
                                    padding: '0.125rem 0.5rem',
                                    borderRadius: '10px',
                                    fontSize: '0.75rem',
                                    fontWeight: '600'
                                }}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div style={{ padding: '1.5rem' }}>
                    {activeTab === 'pending' && <PendingApprovals vendors={vendors} onApprove={loadPendingCount} />}
                    {activeTab === 'vendors' && <VendorManagement vendors={vendors} onUpdate={onRefresh} />}
                    {activeTab === 'dashboard' && <CapacityDashboard vendors={vendors} />}
                </div>
            </div>
        </div>
    );
};

const PendingApprovals = ({ vendors, onApprove }) => {
    const [expandedSubmission, setExpandedSubmission] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submissionDetails, setSubmissionDetails] = useState({});
    const resolveVendor = (vendorRef) => resolveVendorFromList(vendors, vendorRef);

    useEffect(() => {
        loadSubmissions();
    }, []);

    const loadSubmissions = async () => {
        setLoading(true);
        try {
            const data = await api.get('getSubmissions', { status: 'pending' });
            setSubmissions(data);
        } catch (err) {
            console.error('Error loading submissions:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadSubmissionDetail = async (submissionId, vendorId) => {
        if (submissionDetails[submissionId]) return; // already loaded
        try {
            // Attempt 1: Use getSubmissionDetails endpoint (has full snapshot with entries)
            let data = null;
            try {
                data = await api.get('getSubmissionDetails', { submission_id: submissionId });
            } catch (apiErr) {
                console.warn('getSubmissionDetails endpoint not available, trying fallback.', apiErr);
            }

            // If the endpoint returned an error or isn't available, build a fallback
            if (!data || data.error) {
                console.warn('getSubmissionDetails returned error or no data, falling back to getCapacity.');
                // Attempt 2: Load current capacity data for the vendor and wrap it as a pseudo-snapshot
                try {
                    const capacityData = await api.get('getCapacity', { vendor_id: vendorId, year: 2026 });
                    const entries = (capacityData || []).map(c => ({
                        week_number: c.week_number,
                        capacity_value: c.capacity_value,
                        subdept: c.subdept || '',
                        is_override: c.is_override || false
                    }));
                    data = {
                        submission_id: submissionId,
                        vendor_id: vendorId,
                        data_snapshot: { entries, year: 2026 },
                        _fallback: true
                    };
                } catch (capErr) {
                    console.error('Fallback getCapacity also failed:', capErr);
                    data = { _noData: true };
                }
            }

            // Handle old snapshot format: if data_snapshot exists but has no entries,
            // reconstruct entries from the old default_capacity/week_overrides/subdept_capacities fields
            if (data && data.data_snapshot && !data.data_snapshot.entries) {
                const snap = data.data_snapshot;
                const reconstructed = [];
                const v = resolveVendor(vendorId);

                if (v && v.subDeptMode === 'subdept' && snap.subdept_capacities) {
                    SUB_DEPARTMENTS.forEach(dept => {
                        const deptOverrides = (snap.week_overrides && snap.week_overrides[dept]) || {};
                        const deptDefault = snap.subdept_capacities[dept] || 0;
                        for (let w = 1; w <= 52; w++) {
                            reconstructed.push({
                                week_number: w,
                                capacity_value: deptOverrides[w] || deptDefault,
                                subdept: dept,
                                is_override: deptOverrides[w] !== undefined
                            });
                        }
                    });
                } else if (snap.default_capacity) {
                    const overrides = snap.week_overrides || {};
                    for (let w = 1; w <= 52; w++) {
                        reconstructed.push({
                            week_number: w,
                            capacity_value: overrides[w] || snap.default_capacity,
                            subdept: '',
                            is_override: overrides[w] !== undefined
                        });
                    }
                }

                if (reconstructed.length > 0) {
                    data.data_snapshot.entries = reconstructed;
                }
            }

            setSubmissionDetails(prev => ({ ...prev, [submissionId]: data || {} }));
        } catch (err) {
            console.error('Error loading submission details:', err);
            setSubmissionDetails(prev => ({ ...prev, [submissionId]: { _noData: true } }));
        }
    };

    const toggleExpand = (sub) => {
        const isExpanding = expandedSubmission !== sub.submission_id;
        setExpandedSubmission(isExpanding ? sub.submission_id : null);
        if (isExpanding) {
            loadSubmissionDetail(sub.submission_id, sub.vendor_id);
        }
    };

    const downloadCsv = (detail, vendorName) => {
        const snapshot = detail.data_snapshot;

        // If raw CSV content was stored, use it directly
        if (snapshot && snapshot.csv_content) {
            const blob = new Blob([snapshot.csv_content], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = snapshot.csv_filename || `${(vendorName || 'vendor').replace(/\s+/g, '_')}_bulk_upload.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            return;
        }

        // Fallback: reconstruct CSV from entries in snapshot (or from getCapacity fallback)
        const entries = (snapshot && snapshot.entries) ? snapshot.entries : [];
        if (entries.length === 0) {
            alert('No data available to download for this submission.');
            return;
        }

        const hasSubdept = entries.some(e => e.subdept);
        const hasDollarLimit = snapshot && snapshot.dollar_limit != null;
        let headers = ['week_number'];
        if (hasSubdept) headers.push('subdept');
        headers.push('capacity_value');
        if (hasDollarLimit) headers.push('dollar_limit');

        const rows = entries.map((e, idx) => {
            let row = [e.week_number];
            if (hasSubdept) row.push(e.subdept || '');
            row.push(e.capacity_value);
            if (hasDollarLimit) row.push(idx === 0 ? snapshot.dollar_limit : '');
            return row.join(',');
        });

        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${(vendorName || 'vendor').replace(/\s+/g, '_')}_submitted_data.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleApprove = async (submissionId, vendorId) => {
        try {
            // Load the submission details to get the data snapshot
            let detail = submissionDetails[submissionId];

            // If not cached or incomplete, try loading it
            if (!detail || (!detail.data_snapshot && !detail._noData)) {
                try {
                    detail = await api.get('getSubmissionDetails', { submission_id: submissionId });
                } catch (fetchErr) {
                    console.warn('Could not fetch submission details for apply:', fetchErr);
                }
            }

            const snapshot = detail && detail.data_snapshot;

            // Apply the capacity data from the snapshot
            if (snapshot && snapshot.entries && snapshot.entries.length > 0) {
                await api.post('saveCapacity', {
                    vendor_id: vendorId,
                    year: snapshot.year || 2026,
                    entries: snapshot.entries
                });
            }

            // Apply dollar limit if present
            if (snapshot && snapshot.dollar_limit != null) {
                await api.post('saveDollarLimit', {
                    vendor_id: vendorId,
                    dollar_limit: snapshot.dollar_limit
                });
            }

            // Update submission status to approved
            await api.post('updateSubmissionStatus', {
                submission_id: submissionId,
                status: 'approved',
                approved_by: 'Production Team',
                comments: ''
            });
            alert(snapshot && snapshot.entries
                ? 'Submission approved and capacity data applied!'
                : 'Submission approved! (No snapshot data found to apply — vendor data unchanged.)'
            );
            loadSubmissions();
            if (onApprove) onApprove();
        } catch (err) {
            console.error('Error approving submission:', err);
            alert('Failed to approve submission');
        }
    };

    const handleReject = async (submissionId, comments) => {
        try {
            await api.post('updateSubmissionStatus', {
                submission_id: submissionId,
                status: 'rejected',
                approved_by: 'Production Team', // In production, get from auth
                comments: comments || 'Rejected'
            });
            alert('Submission rejected');
            loadSubmissions();
            if (onApprove) onApprove();
        } catch (err) {
            console.error('Error rejecting submission:', err);
            alert('Failed to reject submission');
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <RefreshCw size={32} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
                <p style={{ marginTop: '1rem', color: '#64748b' }}>Loading pending approvals...</p>
            </div>
        );
    }

    if (submissions.length === 0) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                <Check size={48} color="#10b981" style={{ margin: '0 auto 1rem auto' }} />
                <p>No pending approvals</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'grid', gap: '1rem' }}>
            {submissions.map(sub => {
                const vendor = resolveVendor(sub.vendor_id);

                return (
                    <div
                        key={sub.submission_id}
                        style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            overflow: 'hidden'
                        }}
                    >
                        {/* Header */}
                        <div
                            style={{
                                padding: '1.25rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                                background: expandedSubmission === sub.submission_id ? 'white' : '#f8fafc'
                            }}
                            onClick={() => toggleExpand(sub)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                {expandedSubmission === sub.submission_id ? <ChevronDown size={20} color="#64748b" /> : <ChevronRight size={20} color="#64748b" />}
                                <div>
                                    <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9375rem', color: '#1e293b', fontWeight: '600' }}>
                                        {vendor ? vendor.name : 'Unknown Vendor'} <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '400' }}>({sub.vendor_id})</span>
                                    </h3>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                        Submitted by {sub.submitted_by} on {sub.submitted_date} • {sub.submission_type}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleApprove(sub.submission_id, sub.vendor_id);
                                    }}
                                    style={{
                                        background: '#10b981',
                                        border: 'none',
                                        borderRadius: '6px',
                                        padding: '0.5rem 1rem',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                        fontWeight: '500',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    <Check size={16} />
                                    Approve
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const comments = prompt('Reason for rejection (optional):');
                                        if (comments !== null) {
                                            handleReject(sub.submission_id, comments);
                                        }
                                    }}
                                    style={{
                                        background: 'white',
                                        border: '1px solid #ef4444',
                                        borderRadius: '6px',
                                        padding: '0.5rem 1rem',
                                        color: '#ef4444',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                        fontWeight: '500',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    <X size={16} />
                                    Reject
                                </button>
                            </div>
                        </div>

                        {/* Expanded Details - Shows actual submitted capacity data from snapshot */}
                        {expandedSubmission === sub.submission_id && (
                            <div style={{ padding: '1.25rem', background: 'white', borderTop: '1px solid #e2e8f0' }}>
                                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.875rem', color: '#1e293b', fontWeight: '600' }}>
                                    Submission Details
                                </h4>
                                <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
                                    <p style={{ margin: '0 0 0.25rem 0' }}>Type: {sub.submission_type}</p>
                                    <p style={{ margin: '0 0 0.25rem 0' }}>Submitted: {sub.submitted_date}</p>
                                    {sub.comments && <p style={{ margin: '0 0 0.25rem 0' }}>Comments: {sub.comments}</p>}
                                    {vendor && <p style={{ margin: '0 0 0.25rem 0' }}>Sub-Dept Mode: {vendor.subDeptMode === 'vendor' ? 'Vendor Level' : 'By Sub-Department'}</p>}
                                    {vendor && <p style={{ margin: '0' }}>Tracking Type: {vendor.type === 'both' ? 'Unit + $ Value' : vendor.type === 'unit' ? 'Unit Capacity' : '$ Value Only'}</p>}
                                </div>

                                {/* CSV Download Button for bulk uploads */}
                                {sub.submission_type === 'bulk_upload' && submissionDetails[sub.submission_id] && !submissionDetails[sub.submission_id]._noData && (
                                    <div style={{ marginBottom: '1rem' }}>
                                        <button
                                            onClick={() => downloadCsv(submissionDetails[sub.submission_id], vendor ? vendor.name : sub.vendor_id)}
                                            style={{
                                                background: 'white',
                                                border: '1px solid #3b82f6',
                                                borderRadius: '6px',
                                                padding: '0.5rem 1rem',
                                                color: '#3b82f6',
                                                cursor: 'pointer',
                                                fontSize: '0.8125rem',
                                                fontWeight: '500',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem'
                                            }}
                                        >
                                            <Download size={16} />
                                            {submissionDetails[sub.submission_id].data_snapshot && submissionDetails[sub.submission_id].data_snapshot.csv_content
                                                ? 'Download Uploaded CSV'
                                                : 'Download Submitted Data (CSV)'}
                                        </button>
                                    </div>
                                )}

                                {/* Capacity Data Table from snapshot */}
                                <h4 style={{ margin: '1rem 0 0.75rem 0', fontSize: '0.875rem', color: '#1e293b', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Eye size={16} color="#3b82f6" />
                                    Submitted Capacity Data
                                </h4>
                                {(() => {
                                    const detail = submissionDetails[sub.submission_id];
                                    if (!detail) {
                                        return (
                                            <div style={{ padding: '1rem', textAlign: 'center' }}>
                                                <RefreshCw size={20} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
                                                <p style={{ marginTop: '0.5rem', color: '#64748b', fontSize: '0.8125rem' }}>Loading submission data...</p>
                                            </div>
                                        );
                                    }
                                    if (detail._noData) {
                                        return (
                                            <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8125rem' }}>
                                                No capacity data available for this submission. The data may have been submitted before the snapshot feature was enabled.
                                            </div>
                                        );
                                    }
                                    const snapshot = detail.data_snapshot;
                                    const entries = snapshot && snapshot.entries ? snapshot.entries : [];
                                    if (entries.length === 0) {
                                        return (
                                            <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8125rem' }}>
                                                No capacity data found in this submission snapshot.
                                            </div>
                                        );
                                    }

                                    const hasSubdept = entries.some(e => e.subdept);

                                    return (
                                        <div style={{ maxHeight: '300px', overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                                            {snapshot.dollar_limit != null && (
                                                <div style={{ padding: '0.625rem 0.875rem', background: '#dbeafe', borderBottom: '1px solid #e2e8f0', fontSize: '0.8125rem', color: '#1e40af', fontWeight: '500' }}>
                                                    Dollar Limit: ${Number(snapshot.dollar_limit).toLocaleString()}
                                                </div>
                                            )}
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                                                <thead>
                                                    <tr style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                                                        <th style={{ padding: '0.625rem 0.875rem', textAlign: 'left', fontWeight: '600', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Week</th>
                                                        {hasSubdept && (
                                                            <th style={{ padding: '0.625rem 0.875rem', textAlign: 'left', fontWeight: '600', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Sub-Dept</th>
                                                        )}
                                                        <th style={{ padding: '0.625rem 0.875rem', textAlign: 'right', fontWeight: '600', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Capacity</th>
                                                        <th style={{ padding: '0.625rem 0.875rem', textAlign: 'center', fontWeight: '600', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Override?</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {entries
                                                        .sort((a, b) => {
                                                            const weekDiff = (a.week_number || 0) - (b.week_number || 0);
                                                            if (weekDiff !== 0) return weekDiff;
                                                            return (a.subdept || '').localeCompare(b.subdept || '');
                                                        })
                                                        .map((entry, idx) => (
                                                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                                <td style={{ padding: '0.5rem 0.875rem', color: '#1e293b' }}>W{entry.week_number}</td>
                                                                {hasSubdept && (
                                                                    <td style={{ padding: '0.5rem 0.875rem', color: '#64748b' }}>{entry.subdept || '—'}</td>
                                                                )}
                                                                <td style={{ padding: '0.5rem 0.875rem', textAlign: 'right', fontWeight: '600', color: '#1e293b' }}>
                                                                    {Number(entry.capacity_value).toLocaleString()}
                                                                </td>
                                                                <td style={{ padding: '0.5rem 0.875rem', textAlign: 'center' }}>
                                                                    {entry.is_override ? (
                                                                        <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '0.125rem 0.5rem', borderRadius: '8px', fontSize: '0.6875rem', fontWeight: '500' }}>Yes</span>
                                                                    ) : (
                                                                        <span style={{ color: '#94a3b8', fontSize: '0.6875rem' }}>Default</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

const VendorManagement = ({ vendors: initialVendors, onUpdate }) => {
    const [filter, setFilter] = useState('all');
    const [editingVendor, setEditingVendor] = useState(null);
    const [vendorSettings, setVendorSettings] = useState({});
    const [vendors, setVendors] = useState(initialVendors);

    // Update local state when prop changes
    useEffect(() => {
        setVendors(initialVendors);
    }, [initialVendors]);

    const filteredVendors = filter === 'all' ? vendors : vendors.filter(v => v.type === filter);

    const openEditModal = (vendor) => {
        setEditingVendor(vendor);
        setVendorSettings({
            type: vendor.type,
            subDeptMode: vendor.subDeptMode,
            status: vendor.status
        });
    };

    const closeEditModal = () => {
        setEditingVendor(null);
        setVendorSettings({});
    };

    const saveVendorSettings = async () => {
        try {
            await api.post('updateVendorSettings', {
                vendor_id: editingVendor.id,
                tracking_type: vendorSettings.type,
                subdept_mode: vendorSettings.subDeptMode,
                status: vendorSettings.status
            });

            // Update local state
            setVendors(vendors.map(v =>
                v.id === editingVendor.id
                    ? { ...v, ...vendorSettings }
                    : v
            ));

            alert('Vendor settings updated successfully!');
            closeEditModal();

            // Refresh parent data
            if (onUpdate) onUpdate();
        } catch (err) {
            console.error('Error updating vendor settings:', err);
            alert('Failed to update vendor settings');
        }
    };

    return (
        <div>
            {/* Filters */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {['all', 'unit', 'value', 'both'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        style={{
                            background: filter === f ? '#dbeafe' : 'white',
                            border: `1px solid ${filter === f ? '#3b82f6' : '#cbd5e1'}`,
                            borderRadius: '6px',
                            padding: '0.5rem 1rem',
                            color: filter === f ? '#1e40af' : '#64748b',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            textTransform: 'capitalize'
                        }}
                    >
                        {f === 'all' ? 'All Vendors' : f === 'both' ? 'Unit + $ Value' : f === 'unit' ? 'Unit Only' : '$ Value Only'}
                    </button>
                ))}
            </div>

            {/* Vendor Table */}
            <div style={{
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                overflow: 'hidden',
                background: 'white'
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc' }}>
                            <th style={{ padding: '0.875rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>Vendor</th>
                            <th style={{ padding: '0.875rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>Type</th>
                            <th style={{ padding: '0.875rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>Sub-Dept Mode</th>
                            <th style={{ padding: '0.875rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                            <th style={{ padding: '0.875rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredVendors.map((vendor, idx) => (
                            <tr key={vendor.id} style={{ borderBottom: idx < filteredVendors.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                <td style={{ padding: '0.875rem' }}>
                                    <div style={{ fontSize: '0.875rem', color: '#1e293b', fontWeight: '500' }}>{vendor.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{vendor.id}</div>
                                </td>
                                <td style={{ padding: '0.875rem' }}>
                                    <span style={{
                                        background: '#dbeafe',
                                        padding: '0.25rem 0.625rem',
                                        borderRadius: '12px',
                                        fontSize: '0.75rem',
                                        fontWeight: '500',
                                        color: '#1e40af',
                                        textTransform: 'capitalize'
                                    }}>
                                        {vendor.type === 'both' ? 'Unit + $' : vendor.type}
                                    </span>
                                </td>
                                <td style={{ padding: '0.875rem', fontSize: '0.875rem', color: '#64748b' }}>
                                    {vendor.subDeptMode === 'vendor' ? 'Vendor Level' : 'Sub-Department'}
                                </td>
                                <td style={{ padding: '0.875rem' }}>
                                    <span style={{
                                        background: vendor.status === 'active' ? '#d1fae5' : '#f1f5f9',
                                        color: vendor.status === 'active' ? '#065f46' : '#64748b',
                                        padding: '0.25rem 0.625rem',
                                        borderRadius: '12px',
                                        fontSize: '0.75rem',
                                        fontWeight: '500',
                                        textTransform: 'uppercase'
                                    }}>
                                        {vendor.status}
                                    </span>
                                </td>
                                <td style={{ padding: '0.875rem' }}>
                                    <button
                                        onClick={() => openEditModal(vendor)}
                                        style={{
                                            background: 'white',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '6px',
                                            padding: '0.375rem 0.75rem',
                                            color: '#3b82f6',
                                            cursor: 'pointer',
                                            fontSize: '0.75rem',
                                            fontWeight: '500',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.375rem'
                                        }}
                                    >
                                        <Settings size={14} />
                                        Configure
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Edit Vendor Settings Modal */}
            {editingVendor && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(15, 23, 42, 0.5)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000,
                    padding: '2rem'
                }} onClick={closeEditModal}>
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            width: '100%',
                            maxWidth: '600px',
                            maxHeight: '90vh',
                            overflow: 'auto',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                        }}
                    >
                        {/* Modal Header */}
                        <div style={{
                            padding: '1.5rem',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.125rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}>
                                    <Settings size={20} color="#3b82f6" />
                                    Configure Vendor Settings
                                </h2>
                                <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
                                    {editingVendor.name} ({editingVendor.id})
                                </p>
                            </div>
                            <button
                                onClick={closeEditModal}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#64748b',
                                    cursor: 'pointer',
                                    padding: '0.5rem',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div style={{ padding: '1.5rem', display: 'grid', gap: '1.5rem' }}>
                            {/* Capacity Tracking Type */}
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    color: '#1e293b',
                                    marginBottom: '0.75rem'
                                }}>
                                    Capacity Tracking Type
                                </label>
                                <div style={{ display: 'grid', gap: '0.75rem' }}>
                                    {[
                                        { value: 'unit', label: 'Unit Capacity Only', desc: 'Track manufacturing capacity in units per week' },
                                        { value: 'value', label: '$ Value Limit Only', desc: 'Track working capital exposure limit' },
                                        { value: 'both', label: 'Unit Capacity + $ Value', desc: 'Track both unit capacity and dollar limits' }
                                    ].map(option => (
                                        <label
                                            key={option.value}
                                            style={{
                                                background: vendorSettings.type === option.value ? '#dbeafe' : '#f8fafc',
                                                border: `1px solid ${vendorSettings.type === option.value ? '#3b82f6' : '#e2e8f0'}`,
                                                borderRadius: '8px',
                                                padding: '1rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'start',
                                                gap: '0.75rem',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <input
                                                type="radio"
                                                name="type"
                                                value={option.value}
                                                checked={vendorSettings.type === option.value}
                                                onChange={(e) => setVendorSettings({ ...vendorSettings, type: e.target.value })}
                                                style={{ marginTop: '0.25rem' }}
                                            />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.25rem' }}>
                                                    {option.label}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                    {option.desc}
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Sub-Department Mode */}
                            {(vendorSettings.type === 'unit' || vendorSettings.type === 'both') && (
                                <div>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        color: '#1e293b',
                                        marginBottom: '0.75rem'
                                    }}>
                                        Capacity Granularity
                                    </label>
                                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                                        {[
                                            { value: 'vendor', label: 'Vendor Level', desc: 'Single capacity value for entire vendor' },
                                            { value: 'subdept', label: 'By Sub-Department', desc: 'Separate capacity tracking per sub-department (non-transferable)' }
                                        ].map(option => (
                                            <label
                                                key={option.value}
                                                style={{
                                                    background: vendorSettings.subDeptMode === option.value ? '#e0e7ff' : '#f8fafc',
                                                    border: `1px solid ${vendorSettings.subDeptMode === option.value ? '#6366f1' : '#e2e8f0'}`,
                                                    borderRadius: '8px',
                                                    padding: '1rem',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'start',
                                                    gap: '0.75rem',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <input
                                                    type="radio"
                                                    name="subDeptMode"
                                                    value={option.value}
                                                    checked={vendorSettings.subDeptMode === option.value}
                                                    onChange={(e) => setVendorSettings({ ...vendorSettings, subDeptMode: e.target.value })}
                                                    style={{ marginTop: '0.25rem' }}
                                                />
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.25rem' }}>
                                                        {option.label}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                        {option.desc}
                                                    </div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Vendor Status */}
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    color: '#1e293b',
                                    marginBottom: '0.75rem'
                                }}>
                                    Vendor Status
                                </label>
                                <div style={{ display: 'grid', gap: '0.75rem' }}>
                                    {[
                                        { value: 'active', label: 'Active', desc: 'Vendor can receive new POs and capacity is tracked' },
                                        { value: 'inactive', label: 'Inactive', desc: 'Vendor temporarily not accepting new orders' }
                                    ].map(option => (
                                        <label
                                            key={option.value}
                                            style={{
                                                background: vendorSettings.status === option.value ? (option.value === 'active' ? '#d1fae5' : '#f1f5f9') : '#f8fafc',
                                                border: `1px solid ${vendorSettings.status === option.value ? (option.value === 'active' ? '#10b981' : '#94a3b8') : '#e2e8f0'}`,
                                                borderRadius: '8px',
                                                padding: '1rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'start',
                                                gap: '0.75rem',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <input
                                                type="radio"
                                                name="status"
                                                value={option.value}
                                                checked={vendorSettings.status === option.value}
                                                onChange={(e) => setVendorSettings({ ...vendorSettings, status: e.target.value })}
                                                style={{ marginTop: '0.25rem' }}
                                            />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.25rem' }}>
                                                    {option.label}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                    {option.desc}
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Warning message */}
                            <div style={{
                                background: '#fef3c7',
                                border: '1px solid #fcd34d',
                                borderRadius: '8px',
                                padding: '1rem',
                                display: 'flex',
                                gap: '0.75rem'
                            }}>
                                <AlertCircle size={20} color="#f59e0b" style={{ flexShrink: 0, marginTop: '0.125rem' }} />
                                <div style={{ fontSize: '0.75rem', color: '#92400e', lineHeight: '1.5' }}>
                                    <strong>Important:</strong> Changing capacity tracking settings will require the vendor to resubmit their capacity data in the new format. Any pending approvals will be invalidated.
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div style={{
                            padding: '1.5rem',
                            borderTop: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '0.75rem'
                        }}>
                            <button
                                onClick={closeEditModal}
                                style={{
                                    background: 'white',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '6px',
                                    padding: '0.625rem 1.25rem',
                                    color: '#64748b',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    fontWeight: '500'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveVendorSettings}
                                style={{
                                    background: '#3b82f6',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '0.625rem 1.25rem',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}
                            >
                                <Save size={16} />
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const CapacityDashboard = ({ vendors }) => {
    const weeklyData = Array.from({ length: 12 }, (_, i) => ({
        week: i + 1,
        capacity: 3000 + Math.random() * 1000,
        utilized: 2200 + Math.random() * 1000,
    }));

    return (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
            {/* Weekly Capacity vs Utilization */}
            <div>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#1e293b', fontWeight: '600' }}>
                    Weekly Capacity vs Utilization (Next 12 Weeks)
                </h3>
                <div style={{ height: '300px', display: 'flex', alignItems: 'end', gap: '0.75rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    {weeklyData.map((data, idx) => {
                        const maxValue = 4000;
                        const capacityHeight = (data.capacity / maxValue) * 100;
                        const utilizedHeight = (data.utilized / maxValue) * 100;
                        const utilizationPct = Math.round((data.utilized / data.capacity) * 100);

                        return (
                            <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'end', gap: '2px' }}>
                                    <div
                                        style={{
                                            height: `${capacityHeight}%`,
                                            background: '#dbeafe',
                                            border: '1px solid #93c5fd',
                                            borderRadius: '4px 4px 0 0',
                                            position: 'relative'
                                        }}
                                        title={`Capacity: ${Math.round(data.capacity)}`}
                                    />
                                    <div
                                        style={{
                                            height: `${utilizedHeight}%`,
                                            background: utilizationPct > 90 ? '#ef4444' : utilizationPct > 75 ? '#f59e0b' : '#10b981',
                                            borderRadius: '0 0 4px 4px',
                                            marginTop: `-${utilizedHeight}%`
                                        }}
                                        title={`Utilized: ${Math.round(data.utilized)} (${utilizationPct}%)`}
                                    />
                                </div>
                                <div style={{ fontSize: '0.625rem', color: '#64748b', fontWeight: '500' }}>W{data.week}</div>
                            </div>
                        );
                    })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1rem', fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '16px', height: '16px', background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: '3px' }} />
                        <span style={{ color: '#64748b' }}>Total Capacity</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '16px', height: '16px', background: '#10b981', borderRadius: '3px' }} />
                        <span style={{ color: '#64748b' }}>Utilized</span>
                    </div>
                </div>
            </div>

            {/* Vendor-Level Breakdown */}
            <div>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#1e293b', fontWeight: '600' }}>
                    Active Vendors
                </h3>
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {vendors.filter(v => v.status === 'active').map(vendor => {
                        return (
                            <div key={vendor.id} style={{
                                background: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                padding: '1rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <div style={{ fontSize: '0.875rem', color: '#1e293b', fontWeight: '500' }}>{vendor.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{vendor.id} • {vendor.type === 'both' ? 'Unit + $ Value' : vendor.type === 'unit' ? 'Unit Capacity' : '$ Value Only'}</div>
                                </div>
                                <span style={{
                                    background: '#d1fae5',
                                    color: '#065f46',
                                    padding: '0.25rem 0.625rem',
                                    borderRadius: '12px',
                                    fontSize: '0.75rem',
                                    fontWeight: '500',
                                    textTransform: 'uppercase'
                                }}>
                                    Active
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default App;

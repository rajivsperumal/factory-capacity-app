// ============================================================================
// PART 1: SETUP, IMPORTS, API HELPERS, AND AUTHENTICATION
// ============================================================================
// Copy this entire section first

import React, { useState, useEffect } from 'react';
import { Calendar, Upload, Check, X, TrendingUp, AlertCircle, Settings, Users, DollarSign, Package, Clock, Filter, Download, ChevronDown, ChevronRight, Edit2, Save, Eye, Bell, Menu, RefreshCw, LogOut, UserPlus, Trash2, FileText } from 'lucide-react';

// ====================================
// CONFIGURATION - UPDATE THIS URL
// ====================================
const SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycby0ZC97kWFg-VuRXxGR8qZOyICY1ZkFesAk5G1J9VtlVoGQ0aEmpEC1jg-Wng5bT_zo/exec';

const SUB_DEPARTMENTS = ['Tops', 'Bottoms', 'Outerwear', 'Accessories'];

// ====================================
// API HELPER FUNCTIONS
// ====================================
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

// ====================================
// UTILITY FUNCTIONS
// ====================================
const parseCSV = (text) => {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    data.push(row);
  }
  
  return data;
};

const getWeekDateRange = (weekNumber) => {
  const startDate = new Date(2026, 1, 2); // Feb 2, 2026 (month is 0-indexed)
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

// ====================================
// MAIN APP COMPONENT
// ====================================
const App = () => {
  const [userRole, setUserRole] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const handleLogout = () => {
    setUserRole(null);
    setCurrentUser(null);
  };

  if (!userRole) {
    return <LoginSelection onSelectRole={setUserRole} />;
  }

  if (!currentUser) {
    return (
      <LoginScreen 
        role={userRole} 
        onLogin={setCurrentUser}
        onBack={() => setUserRole(null)}
      />
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
            <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.875rem' }}>
              {userRole === 'vendor' ? currentUser.vendor_name : currentUser.name}
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
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </header>

      {userRole === 'vendor' ? (
        <VendorInterface vendor={currentUser} />
      ) : (
        <ProductionInterface currentUser={currentUser} />
      )}
    </div>
  );
};

// ====================================
// LOGIN SELECTION COMPONENT
// ====================================
const LoginSelection = ({ onSelectRole }) => {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8f9fb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '3rem',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
      }}>
        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.75rem', color: '#1e293b', textAlign: 'center' }}>
          Quince Factory Capacity
        </h1>
        <p style={{ margin: '0 0 2rem 0', fontSize: '0.875rem', color: '#64748b', textAlign: 'center' }}>
          Select your login type
        </p>

        <div style={{ display: 'grid', gap: '1rem' }}>
          <button
            onClick={() => onSelectRole('vendor')}
            style={{
              background: 'white',
              border: '2px solid #3b82f6',
              borderRadius: '8px',
              padding: '1.5rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#dbeafe'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: '#dbeafe',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Package size={24} color="#3b82f6" />
              </div>
              <div>
                <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.25rem' }}>
                  Vendor Login
                </div>
                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                  Access your capacity management
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => onSelectRole('production')}
            style={{
              background: 'white',
              border: '2px solid #10b981',
              borderRadius: '8px',
              padding: '1.5rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#d1fae5'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: '#d1fae5',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Users size={24} color="#10b981" />
              </div>
              <div>
                <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.25rem' }}>
                  Production Team Login
                </div>
                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                  Manage approvals and vendors
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

// ====================================
// LOGIN SCREEN COMPONENT
// ====================================
const LoginScreen = ({ role, onLogin, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const action = role === 'vendor' ? 'authenticateVendor' : 'authenticateProduction';
      const result = await api.get(action, { email, password });

      if (result.success) {
        onLogin(role === 'vendor' ? result.vendor : result.user);
      } else {
        setError(result.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('Connection error. Please check API URL configuration.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8f9fb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{
        background: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '3rem',
        maxWidth: '400px',
        width: '100%',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: role === 'vendor' ? '#dbeafe' : '#d1fae5',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem auto'
          }}>
            {role === 'vendor' ? <Package size={32} color="#3b82f6" /> : <Users size={32} color="#10b981" />}
          </div>
          <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', color: '#1e293b' }}>
            {role === 'vendor' ? 'Vendor Login' : 'Production Team Login'}
          </h2>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
            Enter your credentials to continue
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#1e293b', marginBottom: '0.5rem' }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '0.875rem',
                boxSizing: 'border-box'
              }}
              placeholder="your.email@company.com"
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#1e293b', marginBottom: '0.5rem' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '0.875rem',
                boxSizing: 'border-box'
              }}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div style={{
              background: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: '6px',
              padding: '0.75rem',
              marginBottom: '1.5rem',
              fontSize: '0.875rem',
              color: '#991b1b'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: loading ? '#cbd5e1' : (role === 'vendor' ? '#3b82f6' : '#10b981'),
              border: 'none',
              borderRadius: '6px',
              padding: '0.75rem',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: '1rem'
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <button
            type="button"
            onClick={onBack}
            style={{
              width: '100%',
              background: 'white',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '0.75rem',
              color: '#64748b',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Back
          </button>
        </form>
      </div>
    </div>
  );
};

// End of Part 1
// Continue with Part 2: Vendor Interface Components

// ============================================================================
// PART 2: VENDOR INTERFACE COMPONENTS
// ============================================================================
// Copy this section after Part 1

// ====================================
// VENDOR INTERFACE (MAIN CONTAINER)
// ====================================
const VendorInterface = ({ vendor }) => {
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

  const tabs = [
    { id: 'capacity', label: 'Capacity Input', icon: Calendar },
    { id: 'upload', label: 'Bulk Upload', icon: Upload },
    { id: 'history', label: 'Submission History', icon: Clock }
  ];

  useEffect(() => {
    loadCapacityData();
  }, [vendor.vendor_id]);

  const loadCapacityData = async () => {
    setLoading(true);
    try {
      const year = 2026;
      
      const capacityData = await api.get('getCapacity', { 
        vendor_id: vendor.vendor_id,
        year: year
      });
      
      if (vendor.tracking_type === 'value' || vendor.tracking_type === 'both') {
        const limitData = await api.get('getDollarLimit', { vendor_id: vendor.vendor_id });
        if (limitData && limitData.dollar_limit) {
          setDollarLimit(limitData.dollar_limit);
        }
      }
      
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
              if (!overrides[entry.subdept]) overrides[entry.subdept] = {};
              overrides[entry.subdept][entry.week_number] = entry.capacity_value;
            } else {
              overrides[entry.week_number] = entry.capacity_value;
            }
          } else {
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
      
      if (vendor.subdept_mode === 'vendor') {
        for (let week = 1; week <= 52; week++) {
          entries.push({
            week_number: week,
            capacity_value: weekOverrides[week] || defaultCapacity,
            subdept: '',
            is_override: weekOverrides[week] !== undefined
          });
        }
      } else {
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
      
      await api.post('saveCapacity', {
        vendor_id: vendor.vendor_id,
        year: year,
        entries: entries
      });
      
      if (vendor.tracking_type === 'value' || vendor.tracking_type === 'both') {
        await api.post('saveDollarLimit', {
          vendor_id: vendor.vendor_id,
          dollar_limit: dollarLimit
        });
      }
      
      await api.post('submitForApproval', {
        vendor_id: vendor.vendor_id,
        submitted_by: vendor.login_email,
        submission_type: 'manual',
        comments: '',
        default_capacity: defaultCapacity,
        week_overrides: weekOverrides,
        subdept_capacities: subDeptCapacities,
        dollar_limit: dollarLimit
      });
      
      alert('Capacity data saved and submitted for approval!');
      setIsEditing(false);
      loadCapacityData();
      
    } catch (err) {
      console.error('Error saving capacity data:', err);
      alert('Failed to save capacity data. Please try again.');
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
            <h2 style={{ margin: '0 0 0.75rem 0', fontSize: '1.25rem', color: '#1e293b', fontWeight: '600' }}>{vendor.vendor_name}</h2>
            <div style={{ display: 'flex', gap: '2rem', fontSize: '0.875rem', color: '#64748b' }}>
              <div>
                <span style={{ color: '#94a3b8' }}>Vendor ID:</span> <strong style={{ color: '#1e293b' }}>{vendor.vendor_id}</strong>
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
                  {vendor.tracking_type === 'both' ? 'Unit + $ Value' : vendor.tracking_type === 'unit' ? 'Unit Capacity' : '$ Value Only'}
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
                  {vendor.subdept_mode === 'vendor' ? 'Vendor Level' : 'By Sub-Department'}
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
            />
          )}
          {activeTab === 'upload' && <BulkUpload vendor={vendor} onUploadComplete={loadCapacityData} />}
          {activeTab === 'history' && <SubmissionHistory vendor={vendor} />}
        </div>
      </div>
    </div>
  );
};

// ====================================
// CAPACITY INPUT COMPONENT
// ====================================
const CapacityInput = ({ vendor, defaultCapacity, setDefaultCapacity, dollarLimit, setDollarLimit, weekOverrides, setWeekOverrides, subDeptCapacities, setSubDeptCapacities, isEditing }) => {
  const [overrideMode, setOverrideMode] = useState('single');
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);
  const [overrideValue, setOverrideValue] = useState('');
  const [selectedSubDept, setSelectedSubDept] = useState('Tops');

  const weeks = Array.from({ length: 52 }, (_, i) => i + 1);
  const currentWeek = 6;

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

        {vendor.subdept_mode === 'vendor' ? (
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

        {(vendor.tracking_type === 'value' || vendor.tracking_type === 'both') && (
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
                <strong>How this works:</strong> This represents the maximum dollar value that can be outstanding for Quince at any time.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Week Overrides Section */}
      {vendor.tracking_type !== 'value' && (
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

          {/* 52-Week Calendar View */}
          <div style={{ marginTop: '2rem' }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#64748b', fontWeight: '600' }}>
              52-Week Capacity Overview
            </h4>
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
                const capacity = weekOverrides[week] || defaultCapacity;
                const isOverride = weekOverrides[week] !== undefined;
                const isPast = week < currentWeek;
                const isCurrent = week === currentWeek;
                const dateRange = getWeekDateRange(week);

                return (
                  <div
                    key={week}
                    style={{
                      background: isCurrent
                        ? '#dbeafe'
                        : isOverride
                        ? '#e0e7ff'
                        : isPast
                        ? '#f1f5f9'
                        : 'white',
                      border: `1px solid ${
                        isCurrent
                          ? '#3b82f6'
                          : isOverride
                          ? '#6366f1'
                          : '#e2e8f0'
                      }`,
                      borderRadius: '6px',
                      padding: '0.5rem',
                      textAlign: 'center',
                      opacity: isPast ? 0.6 : 1
                    }}
                    title={`Week ${week} (${dateRange}): ${capacity.toLocaleString()} units`}
                  >
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

// Continue with Part 3...

// ============================================================================
// PART 3: BULK UPLOAD & SUBMISSION HISTORY COMPONENTS
// ============================================================================
// Copy this section after Part 2

// ====================================
// BULK UPLOAD COMPONENT
// ====================================
const BulkUpload = ({ vendor, onUploadComplete }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
      setSuccess('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const text = await file.text();
      const data = parseCSV(text);

      if (data.length === 0) {
        setError('File is empty or invalid');
        setUploading(false);
        return;
      }

      // Validate and transform data
      const entries = data.map(row => ({
        week_number: parseInt(row.week_number),
        capacity_value: parseInt(row.capacity_value),
        subdept: row.subdept || '',
        is_override: true
      }));

      // Upload to API
      const result = await api.post('bulkUploadCapacity', {
        vendor_id: vendor.vendor_id,
        year: 2026,
        entries: entries
      });

      if (result.success) {
        setSuccess(`Successfully uploaded ${result.count} entries!`);
        setFile(null);
        
        // Submit for approval
        await api.post('submitForApproval', {
          vendor_id: vendor.vendor_id,
          submitted_by: vendor.login_email,
          submission_type: 'bulk',
          comments: 'Bulk upload via CSV',
          default_capacity: 0,
          week_overrides: {},
          subdept_capacities: {},
          dollar_limit: 0
        });

        if (onUploadComplete) {
          onUploadComplete();
        }
      } else {
        setError(result.error || 'Upload failed');
      }
    } catch (err) {
      setError('Failed to process file: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = vendor.subdept_mode === 'subdept'
      ? 'week_number,subdept,capacity_value\n1,Tops,400\n1,Bottoms,300\n1,Outerwear,200\n1,Accessories,100'
      : 'week_number,capacity_value\n1,1000\n2,1000\n40,1500\n41,1500';
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'capacity_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <div>
        <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', color: '#1e293b', fontWeight: '600' }}>
          Download Template
        </h3>
        <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#64748b' }}>
          Download the CSV template for {vendor.subdept_mode === 'subdept' ? 'sub-department' : 'vendor-level'} capacity.
        </p>
        <button
          onClick={downloadTemplate}
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

      <div style={{
        background: '#f8fafc',
        border: '2px dashed #cbd5e1',
        borderRadius: '8px',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <Upload size={48} color="#3b82f6" style={{ margin: '0 auto 1rem auto' }} />
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#1e293b', fontWeight: '600' }}>
          Upload Capacity File
        </h3>
        <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.875rem', color: '#64748b' }}>
          CSV file only
        </p>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          id="file-upload"
        />
        <label htmlFor="file-upload" style={{
          background: '#3b82f6',
          border: 'none',
          borderRadius: '6px',
          padding: '0.625rem 1.5rem',
          color: 'white',
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: '500',
          display: 'inline-block'
        }}>
          Select File
        </label>
        {file && (
          <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#64748b' }}>
            Selected: {file.name}
          </div>
        )}
      </div>

      {error && (
        <div style={{
          background: '#fee2e2',
          border: '1px solid #fca5a5',
          borderRadius: '6px',
          padding: '0.875rem',
          fontSize: '0.875rem',
          color: '#991b1b'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          background: '#d1fae5',
          border: '1px solid #86efac',
          borderRadius: '6px',
          padding: '0.875rem',
          fontSize: '0.875rem',
          color: '#065f46'
        }}>
          {success}
        </div>
      )}

      {file && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          style={{
            background: uploading ? '#cbd5e1' : '#10b981',
            border: 'none',
            borderRadius: '6px',
            padding: '0.75rem 1.5rem',
            color: 'white',
            cursor: uploading ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            fontWeight: '600',
            width: '100%'
          }}
        >
          {uploading ? 'Uploading...' : 'Upload and Submit for Approval'}
        </button>
      )}

      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        padding: '1rem'
      }}>
        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#1e293b', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} color="#f59e0b" />
          Validation Rules
        </h4>
        <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.75rem', color: '#64748b', lineHeight: '1.8' }}>
          <li>All capacity values must be positive numbers</li>
          <li>Week numbers must be between 1 and 52</li>
          {vendor.subdept_mode === 'subdept' && <li>Capacity must be provided for all sub-departments</li>}
          <li>No duplicate week entries allowed for the same sub-department</li>
        </ul>
      </div>
    </div>
  );
};

// ====================================
// SUBMISSION HISTORY COMPONENT
// ====================================
const SubmissionHistory = ({ vendor }) => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingSubmission, setViewingSubmission] = useState(null);

  useEffect(() => {
    loadSubmissions();
  }, [vendor.vendor_id]);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const data = await api.get('getSubmissions');
      const vendorSubmissions = data.filter(s => s.vendor_id === vendor.vendor_id);
      setSubmissions(vendorSubmissions);
    } catch (err) {
      console.error('Error loading submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (submissionId) => {
    try {
      const details = await api.get('getSubmissionDetails', { submission_id: submissionId });
      setViewingSubmission(details);
    } catch (err) {
      console.error('Error loading submission details:', err);
      alert('Failed to load submission details');
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
    <>
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
                    onClick={() => handleView(sub.submission_id)}
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

      {/* View Submission Modal */}
      {viewingSubmission && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '2rem'
        }} onClick={() => setViewingSubmission(null)}>
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '800px',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.125rem', color: '#1e293b', fontWeight: '600' }}>
                  Submission Details
                </h2>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
                  {viewingSubmission.submission_id} • {viewingSubmission.submitted_date}
                </p>
              </div>
              <button
                onClick={() => setViewingSubmission(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '6px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {viewingSubmission.data_snapshot ? (
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                  {viewingSubmission.data_snapshot.default_capacity && (
                    <div>
                      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#64748b', fontWeight: '600' }}>
                        Default Capacity
                      </h3>
                      <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1e293b' }}>
                        {viewingSubmission.data_snapshot.default_capacity.toLocaleString()} units/week
                      </div>
                    </div>
                  )}

                  {viewingSubmission.data_snapshot.week_overrides && Object.keys(viewingSubmission.data_snapshot.week_overrides).length > 0 && (
                    <div>
                      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#64748b', fontWeight: '600' }}>
                        Week Overrides
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.5rem' }}>
                        {Object.entries(viewingSubmission.data_snapshot.week_overrides).map(([week, capacity]) => (
                          <div key={week} style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            padding: '0.75rem',
                            textAlign: 'center'
                          }}>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Week {week}</div>
                            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1e293b' }}>
                              {capacity.toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {viewingSubmission.data_snapshot.subdept_capacities && Object.keys(viewingSubmission.data_snapshot.subdept_capacities).length > 0 && (
                    <div>
                      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#64748b', fontWeight: '600' }}>
                        Sub-Department Capacities
                      </h3>
                      <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {Object.entries(viewingSubmission.data_snapshot.subdept_capacities).map(([dept, capacity]) => (
                          <div key={dept} style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            padding: '0.75rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>{dept}</span>
                            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1e293b' }}>
                              {capacity.toLocaleString()} units/week
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {viewingSubmission.data_snapshot.dollar_limit && viewingSubmission.data_snapshot.dollar_limit > 0 && (
                    <div>
                      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#64748b', fontWeight: '600' }}>
                        Dollar Value Limit
                      </h3>
                      <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1e293b' }}>
                        ${viewingSubmission.data_snapshot.dollar_limit.toLocaleString()}
                      </div>
                    </div>
                  )}

                  {viewingSubmission.status !== 'pending' && (
                    <div style={{
                      marginTop: '1rem',
                      paddingTop: '1rem',
                      borderTop: '1px solid #e2e8f0'
                    }}>
                      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#64748b', fontWeight: '600' }}>
                        Review Status
                      </h3>
                      <div style={{ fontSize: '0.875rem', color: '#1e293b' }}>
                        <strong>{viewingSubmission.status === 'approved' ? 'Approved' : 'Rejected'}</strong> by {viewingSubmission.approved_by} on {viewingSubmission.approval_date}
                      </div>
                      {viewingSubmission.comments && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#64748b' }}>
                          Comments: {viewingSubmission.comments}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                  <AlertCircle size={48} color="#cbd5e1" style={{ margin: '0 auto 1rem auto' }} />
                  <p>No data snapshot available for this submission.</p>
                  <p style={{ fontSize: '0.75rem' }}>Older submissions may not have detailed data stored.</p>
                </div>
              )}
            </div>

            <div style={{
              padding: '1.5rem',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setViewingSubmission(null)}
                style={{
                  background: '#3b82f6',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.625rem 1.5rem',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Continue with Part 4 (Production Interface)...

// ============================================================================
// PART 4: PRODUCTION INTERFACE COMPONENTS
// ============================================================================
// Copy this section after Part 3

// ====================================
// PRODUCTION INTERFACE (MAIN CONTAINER)
// ====================================
const ProductionInterface = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState('pending');
  const [vendors, setVendors] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [vendorsData, submissionsData] = await Promise.all([
        api.get('getAllVendors'),
        api.get('getSubmissions', { status: 'pending' })
      ]);

      const transformedVendors = vendorsData.map(v => ({
        id: v.vendor_id,
        name: v.vendor_name,
        type: v.tracking_type,
        subDeptMode: v.subdept_mode,
        status: v.status,
        login_email: v.login_email
      }));

      setVendors(transformedVendors);
      setPendingCount(submissionsData.length);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'pending', label: 'Pending Approvals', count: pendingCount },
    { id: 'vendors', label: 'Vendor Management', count: vendors.length },
    { id: 'team', label: 'Team Settings', count: null },
  ];

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <RefreshCw size={32} color="#10b981" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '1rem', color: '#64748b' }}>Loading...</p>
      </div>
    );
  }

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

        <div style={{ padding: '1.5rem' }}>
          {activeTab === 'pending' && <PendingApprovals vendors={vendors} onApprove={loadData} />}
          {activeTab === 'vendors' && <VendorManagement vendors={vendors} onUpdate={loadData} />}
          {activeTab === 'team' && <ProductionTeamManagement />}
        </div>
      </div>
    </div>
  );
};

// ====================================
// PENDING APPROVALS COMPONENT
// ====================================
const PendingApprovals = ({ vendors, onApprove }) => {
  const [expandedSubmission, setExpandedSubmission] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingSubmission, setViewingSubmission] = useState(null);

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

  const handleApprove = async (submissionId) => {
    try {
      await api.post('updateSubmissionStatus', {
        submission_id: submissionId,
        status: 'approved',
        approved_by: 'Production Team',
        comments: ''
      });
      alert('Submission approved!');
      loadSubmissions();
      if (onApprove) onApprove();
    } catch (err) {
      console.error('Error approving submission:', err);
      alert('Failed to approve submission');
    }
  };

  const handleReject = async (submissionId) => {
    const comments = prompt('Reason for rejection (optional):');
    if (comments === null) return;

    try {
      await api.post('updateSubmissionStatus', {
        submission_id: submissionId,
        status: 'rejected',
        approved_by: 'Production Team',
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

  const handleView = async (submissionId) => {
    try {
      const details = await api.get('getSubmissionDetails', { submission_id: submissionId });
      setViewingSubmission(details);
    } catch (err) {
      console.error('Error loading submission details:', err);
      alert('Failed to load submission details');
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
    <>
      <div style={{ display: 'grid', gap: '1rem' }}>
        {submissions.map(sub => {
          const vendor = vendors.find(v => v.id === sub.vendor_id);
          
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
              <div style={{
                padding: '1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9375rem', color: '#1e293b', fontWeight: '600' }}>
                    {vendor ? vendor.name : 'Unknown Vendor'} <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '400' }}>({sub.vendor_id})</span>
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Submitted by {sub.submitted_by} on {sub.submitted_date} • {sub.submission_type}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => handleView(sub.submission_id)}
                    style={{
                      background: 'white',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '0.5rem 1rem',
                      color: '#3b82f6',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <Eye size={16} />
                    View
                  </button>
                  <button
                    onClick={() => handleApprove(sub.submission_id)}
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
                    onClick={() => handleReject(sub.submission_id)}
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
            </div>
          );
        })}
      </div>

      {/* Reuse the View Submission Modal from SubmissionHistory */}
      {viewingSubmission && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '2rem'
        }} onClick={() => setViewingSubmission(null)}>
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '800px',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.125rem', color: '#1e293b', fontWeight: '600' }}>
                  Submission Details
                </h2>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
                  {viewingSubmission.submission_id} • {viewingSubmission.submitted_date}
                </p>
              </div>
              <button
                onClick={() => setViewingSubmission(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '0.5rem'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {viewingSubmission.data_snapshot ? (
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                  {viewingSubmission.data_snapshot.default_capacity && (
                    <div>
                      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#64748b', fontWeight: '600' }}>
                        Default Capacity
                      </h3>
                      <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1e293b' }}>
                        {viewingSubmission.data_snapshot.default_capacity.toLocaleString()} units/week
                      </div>
                    </div>
                  )}

                  {viewingSubmission.data_snapshot.dollar_limit && viewingSubmission.data_snapshot.dollar_limit > 0 && (
                    <div>
                      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#64748b', fontWeight: '600' }}>
                        Dollar Value Limit
                      </h3>
                      <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1e293b' }}>
                        ${viewingSubmission.data_snapshot.dollar_limit.toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                  <p>No detailed data available for this submission.</p>
                </div>
              )}
            </div>

            <div style={{
              padding: '1.5rem',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setViewingSubmission(null)}
                style={{
                  background: '#3b82f6',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.625rem 1.5rem',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Continue with Part 5 (Vendor Management & Team Settings)...

// ============================================================================
// PART 5: VENDOR MANAGEMENT & PRODUCTION TEAM MANAGEMENT
// ============================================================================
// Copy this section after Part 4

// ====================================
// VENDOR MANAGEMENT COMPONENT
// ====================================
const VendorManagement = ({ vendors: initialVendors, onUpdate }) => {
  const [filter, setFilter] = useState('all');
  const [editingVendor, setEditingVendor] = useState(null);
  const [vendorSettings, setVendorSettings] = useState({});
  const [vendors, setVendors] = useState(initialVendors);

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
      
      setVendors(vendors.map(v => 
        v.id === editingVendor.id 
          ? { ...v, ...vendorSettings }
          : v
      ));
      
      alert('Vendor settings updated successfully!');
      closeEditModal();
      
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Error updating vendor settings:', err);
      alert('Failed to update vendor settings');
    }
  };

  return (
    <>
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem' }}>
        {['all', 'unit', 'value', 'both'].map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            style={{
              background: filter === type ? '#dbeafe' : 'white',
              border: `1px solid ${filter === type ? '#3b82f6' : '#cbd5e1'}`,
              borderRadius: '6px',
              padding: '0.5rem 1rem',
              color: filter === type ? '#1e40af' : '#64748b',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              textTransform: 'capitalize'
            }}
          >
            {type === 'all' ? 'All Vendors' : type === 'both' ? 'Unit + $' : type}
          </button>
        ))}
      </div>

      <div style={{
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        overflow: 'hidden'
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

      {/* Edit Vendor Modal */}
      {editingVendor && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)',
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
              maxWidth: '500px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e2e8f0'
            }}>
              <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.125rem', color: '#1e293b', fontWeight: '600' }}>
                Configure Vendor
              </h2>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
                {editingVendor.name}
              </p>
            </div>

            <div style={{ padding: '1.5rem', display: 'grid', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#1e293b', marginBottom: '0.5rem' }}>
                  Capacity Tracking Type
                </label>
                <select
                  value={vendorSettings.type}
                  onChange={(e) => setVendorSettings({ ...vendorSettings, type: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    background: 'white'
                  }}
                >
                  <option value="unit">Unit Capacity Only</option>
                  <option value="value">$ Value Limit Only</option>
                  <option value="both">Unit Capacity + $ Value</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#1e293b', marginBottom: '0.5rem' }}>
                  Sub-Department Mode
                </label>
                <select
                  value={vendorSettings.subDeptMode}
                  onChange={(e) => setVendorSettings({ ...vendorSettings, subDeptMode: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    background: 'white'
                  }}
                >
                  <option value="vendor">Vendor Level</option>
                  <option value="subdept">By Sub-Department</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#1e293b', marginBottom: '0.5rem' }}>
                  Vendor Status
                </label>
                <select
                  value={vendorSettings.status}
                  onChange={(e) => setVendorSettings({ ...vendorSettings, status: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    background: 'white'
                  }}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div style={{
                background: '#fef3c7',
                border: '1px solid #fbbf24',
                borderRadius: '6px',
                padding: '0.875rem',
                fontSize: '0.75rem',
                color: '#92400e',
                lineHeight: '1.5'
              }}>
                <strong>Warning:</strong> Changing these settings will affect how this vendor submits capacity data going forward.
              </div>
            </div>

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
                  background: '#10b981',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.625rem 1.25rem',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ====================================
// PRODUCTION TEAM MANAGEMENT COMPONENT
// ====================================
const ProductionTeamManagement = () => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingMember, setAddingMember] = useState(false);
  const [newMember, setNewMember] = useState({ email: '', password: '', name: '' });

  useEffect(() => {
    loadTeamMembers();
  }, []);

  const loadTeamMembers = async () => {
    setLoading(true);
    try {
      const data = await api.get('getProductionTeam');
      setTeamMembers(data);
    } catch (err) {
      console.error('Error loading team members:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMember.email || !newMember.password || !newMember.name) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const result = await api.post('addProductionUser', newMember);
      if (result.success) {
        alert('Team member added successfully!');
        setNewMember({ email: '', password: '', name: '' });
        setAddingMember(false);
        loadTeamMembers();
      } else {
        alert(result.error || 'Failed to add team member');
      }
    } catch (err) {
      console.error('Error adding team member:', err);
      alert('Failed to add team member');
    }
  };

  const handleDeleteMember = async (email) => {
    if (!confirm(`Are you sure you want to remove ${email} from the production team?`)) {
      return;
    }

    try {
      await api.post('deleteProductionUser', { email });
      alert('Team member removed successfully!');
      loadTeamMembers();
    } catch (err) {
      console.error('Error deleting team member:', err);
      alert('Failed to remove team member');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <RefreshCw size={32} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '1rem', color: '#64748b' }}>Loading team members...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', color: '#1e293b', fontWeight: '600' }}>
            Production Team Members
          </h3>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
            Manage who can access the production team dashboard
          </p>
        </div>
        <button
          onClick={() => setAddingMember(true)}
          style={{
            background: '#10b981',
            border: 'none',
            borderRadius: '6px',
            padding: '0.625rem 1.25rem',
            color: 'white',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <UserPlus size={16} />
          Add Member
        </button>
      </div>

      <div style={{
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ padding: '0.875rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>Name</th>
              <th style={{ padding: '0.875rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>Email</th>
              <th style={{ padding: '0.875rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>Added</th>
              <th style={{ padding: '0.875rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {teamMembers.map((member, idx) => (
              <tr key={member.email} style={{ borderBottom: idx < teamMembers.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <td style={{ padding: '0.875rem', fontSize: '0.875rem', color: '#1e293b', fontWeight: '500' }}>{member.name}</td>
                <td style={{ padding: '0.875rem', fontSize: '0.875rem', color: '#64748b' }}>{member.email}</td>
                <td style={{ padding: '0.875rem', fontSize: '0.875rem', color: '#64748b' }}>{member.created_date}</td>
                <td style={{ padding: '0.875rem' }}>
                  <button
                    onClick={() => handleDeleteMember(member.email)}
                    style={{
                      background: 'white',
                      border: '1px solid #ef4444',
                      borderRadius: '6px',
                      padding: '0.375rem 0.75rem',
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem'
                    }}
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Member Modal */}
      {addingMember && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '2rem'
        }} onClick={() => setAddingMember(false)}>
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '500px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e2e8f0'
            }}>
              <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.125rem', color: '#1e293b', fontWeight: '600' }}>
                Add Team Member
              </h2>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
                Create login credentials for a new production team member
              </p>
            </div>

            <div style={{ padding: '1.5rem', display: 'grid', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#1e293b', marginBottom: '0.5rem' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  placeholder="John Doe"
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#1e293b', marginBottom: '0.5rem' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  placeholder="john.doe@quince.com"
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#1e293b', marginBottom: '0.5rem' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={newMember.password}
                  onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{
              padding: '1.5rem',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem'
            }}>
              <button
                onClick={() => setAddingMember(false)}
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
                onClick={handleAddMember}
                style={{
                  background: '#10b981',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.625rem 1.25rem',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                Add Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ====================================
// EXPORT DEFAULT
// ====================================
export default App;

import React, { useState, useEffect } from 'react';
import {
  Crown, Eye, EyeOff, ArrowRight, ArrowLeft,
  User, Mail, Phone, Lock, Building2, Receipt,
  MapPin, Percent, FileText, CheckCircle2, LogIn,
  HelpCircle, ChevronDown, ChevronUp, Database, Server, RefreshCw, AlertTriangle
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

type AuthMode = 'login' | 'register';

// Steps in registration: database -> account -> restaurant
type RegStep = 'database' | 'account' | 'restaurant';

interface LoginFormState {
  emailOrPhone: string;
  password: string;
}

interface AccountFormState {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

interface RestaurantFormState {
  companyName: string;
  tagline: string;
  ownerName: string;
  gstNumber: string;
  fssaiNumber: string;
  phone: string;
  email: string;
  address: string;
  taxRate: string;
  currency: string;
  headerNote: string;
  footerNote: string;
}

const InputField: React.FC<{
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  required?: boolean;
  suffix?: React.ReactNode;
}> = ({ id, label, type = 'text', value, onChange, placeholder, icon, required, suffix }) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="text-xs font-semibold text-amber-300/80 uppercase tracking-widest">
      {label}{required && <span className="text-red-400 ml-1">*</span>}
    </label>
    <div className="relative flex items-center">
      {icon && (
        <div className="absolute left-3 text-amber-500/60 pointer-events-none">{icon}</div>
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl py-2.5 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all ${icon ? 'pl-10' : 'pl-3'}`}
      />
      {suffix && <div className="absolute right-3">{suffix}</div>}
    </div>
  </div>
);

export const AuthModal: React.FC = () => {
  const { login, register, isLoading, error, clearError, hasExistingUsers, restaurantDetails, initializeAuth } = useAuthStore();
  const [mode, setMode] = useState<AuthMode>(() => hasExistingUsers ? 'login' : 'register');
  const [regStep, setRegStep] = useState<RegStep>('database');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [showDbGuide, setShowDbGuide] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Database Connection State
  const [dbConfig, setDbConfig] = useState({
    host: 'localhost',
    port: '3306',
    user: 'root',
    password: '',
    database: 'kish_mandhi'
  });
  const [dbPreset, setDbPreset] = useState<'local' | 'online'>('local');
  const [testingDb, setTestingDb] = useState(false);
  const [savingDb, setSavingDb] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; message: string | null }>({
    connected: false,
    message: null
  });

  const [loginForm, setLoginForm] = useState<LoginFormState>({ emailOrPhone: '', password: '' });
  const [accountForm, setAccountForm] = useState<AccountFormState>({
    name: '', email: '', phone: '', password: '', confirmPassword: ''
  });
  const [restForm, setRestForm] = useState<RestaurantFormState>({
    companyName: '', tagline: 'Arabic Grill & Fine Dining', ownerName: '',
    gstNumber: '', fssaiNumber: '', phone: '', email: '', address: '',
    taxRate: '5', currency: '₹', headerNote: '', footerNote: 'Thank you for visiting! Please visit again.'
  });

  useEffect(() => {
    if (error) setLocalError(error);
  }, [error]);

  useEffect(() => {
    if (!hasExistingUsers) {
      setMode('register');
      setRegStep('database');
    }
  }, [hasExistingUsers]);

  // Load current DB config and check connection status on mount
  useEffect(() => {
    checkInitialDbConnection();
  }, []);

  const checkInitialDbConnection = async () => {
    try {
      const api = (window as any).electronAPI;
      if (api) {
        if (api.getDbConfig) {
          const res = await api.getDbConfig();
          if (res && res.success && res.data) {
            setDbConfig({
              host: res.data.host || 'localhost',
              port: String(res.data.port || 3306),
              user: res.data.user || 'root',
              password: res.data.password || '',
              database: res.data.database || 'kish_mandhi'
            });
            if (res.data.host && res.data.host !== 'localhost' && res.data.host !== '127.0.0.1') {
              setDbPreset('online');
            }
          }
        }
        if (api.testDbConnection) {
          const testRes = await api.testDbConnection();
          if (testRes && testRes.success) {
            setDbStatus({ connected: true, message: testRes.message || '✓ Database Connected' });
          } else {
            setDbStatus({ connected: false, message: testRes?.message || '❌ Database Not Connected' });
          }
        }
      } else {
        // Browser / Web mode
        setDbStatus({ connected: true, message: '✓ Running in Local Browser Mode' });
      }
    } catch (e: any) {
      setDbStatus({ connected: false, message: '❌ Error: ' + e.message });
    }
  };

  const clearErrors = () => {
    setLocalError(null);
    clearError();
  };

  const switchMode = (m: AuthMode) => {
    setMode(m);
    setRegStep('database');
    clearErrors();
  };

  const applyPreset = (preset: 'local' | 'online') => {
    setDbPreset(preset);
    clearErrors();
    if (preset === 'local') {
      setDbConfig({
        host: 'localhost',
        port: '3306',
        user: 'root',
        password: '',
        database: 'kish_mandhi'
      });
    } else {
      setDbConfig({
        host: '',
        port: '3306',
        user: 'root',
        password: '',
        database: 'kish_mandhi'
      });
    }
  };

  const handleTestDb = async () => {
    setTestingDb(true);
    clearErrors();
    try {
      const api = (window as any).electronAPI;
      if (api?.testDbConnection) {
        const res = await api.testDbConnection(dbConfig);
        if (res && res.success) {
          setDbStatus({ connected: true, message: res.message || '✓ Database Connected Successfully!' });
        } else {
          setDbStatus({ connected: false, message: res?.message || '❌ Connection Failed. Check Host/Port/Password.' });
          setLocalError(res?.message || 'Failed to connect to MySQL database.');
        }
      } else {
        setDbStatus({ connected: true, message: '✓ Running in Web Mode' });
      }
    } catch (err: any) {
      setDbStatus({ connected: false, message: '❌ Error: ' + err.message });
      setLocalError('Database Ping Error: ' + err.message);
    } finally {
      setTestingDb(false);
    }
  };

  const handleSaveAndConnectDb = async (e?: React.FormEvent): Promise<boolean> => {
    if (e) e.preventDefault();
    setSavingDb(true);
    clearErrors();
    try {
      const api = (window as any).electronAPI;
      if (api?.saveDbConfig) {
        const res = await api.saveDbConfig(dbConfig);
        if (res && res.success) {
          setDbStatus({ connected: true, message: res.message || '✓ Database Connected & Saved!' });
          await initializeAuth();
          return true;
        } else {
          setDbStatus({ connected: false, message: res?.message || '❌ Could not connect with these credentials.' });
          setLocalError(res?.message || 'Database connection failed.');
          return false;
        }
      } else {
        setDbStatus({ connected: true, message: '✓ Local Browser Mode Active' });
        return true;
      }
    } catch (err: any) {
      setDbStatus({ connected: false, message: '❌ Error: ' + err.message });
      setLocalError('Save Error: ' + err.message);
      return false;
    } finally {
      setSavingDb(false);
    }
  };

  const handleProceedToAccountStep = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    const success = await handleSaveAndConnectDb();
    if (success) {
      setRegStep('account');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    if (!loginForm.emailOrPhone || !loginForm.password) {
      setLocalError('Please fill in all fields.');
      return;
    }
    const res = await login(loginForm.emailOrPhone, loginForm.password);
    if (!res.success) setLocalError(res.message || 'Login failed');
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    if (!accountForm.name.trim()) { setLocalError('Full name is required.'); return; }
    if (!accountForm.email.trim()) { setLocalError('Email is required.'); return; }
    if (!accountForm.password) { setLocalError('Password is required.'); return; }
    if (accountForm.password.length < 6) { setLocalError('Password must be at least 6 characters.'); return; }
    if (accountForm.password !== accountForm.confirmPassword) { setLocalError('Passwords do not match.'); return; }
    setRestForm(prev => ({ ...prev, ownerName: accountForm.name, email: accountForm.email, phone: accountForm.phone }));
    setRegStep('restaurant');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    if (!restForm.companyName.trim()) { setLocalError('Company name is required.'); return; }
    const res = await register(
      { name: accountForm.name, email: accountForm.email, phone: accountForm.phone, password: accountForm.password },
      {
        companyName: restForm.companyName,
        tagline: restForm.tagline,
        ownerName: restForm.ownerName || accountForm.name,
        gstNumber: restForm.gstNumber,
        fssaiNumber: restForm.fssaiNumber,
        phone: restForm.phone || accountForm.phone,
        email: restForm.email || accountForm.email,
        address: restForm.address,
        taxRate: Number(restForm.taxRate) || 5,
        currency: restForm.currency || '₹',
        headerNote: restForm.headerNote || `Welcome to ${restForm.companyName}`,
        footerNote: restForm.footerNote
      }
    );
    if (!res.success) setLocalError(res.message || 'Registration failed');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#060810] overflow-y-auto">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-amber-600/5 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-[700px] h-[700px] rounded-full bg-amber-800/5 blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-amber-500/3 blur-3xl" />
      </div>

      <div className="relative w-full max-w-xl mx-4 my-8">
        {/* Card */}
        <div className="bg-[#0e1019]/95 backdrop-blur-2xl border border-amber-500/20 rounded-3xl shadow-2xl shadow-black/60 overflow-hidden">
          {/* Top Glow Bar */}
          <div className="h-px bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />

          {/* Header */}
          <div className="flex flex-col items-center pt-8 pb-4 px-8">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-700 rounded-2xl flex items-center justify-center shadow-xl shadow-amber-500/30 mb-3 overflow-hidden">
              {restaurantDetails?.logoUrl || restaurantDetails?.softwareIconUrl ? (
                <img src={restaurantDetails.logoUrl || restaurantDetails.softwareIconUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Crown className="w-8 h-8 text-white" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-white tracking-wide uppercase">{restaurantDetails?.companyName || 'KISH MANDHI'}</h1>
            <p className="text-amber-400/60 text-xs tracking-widest uppercase mt-1">{restaurantDetails?.tagline || 'Arabic Grill & Dining · POS System'}</p>
          </div>

          {/* First-Time Setup Banner */}
          {!hasExistingUsers && (
            <div className="mx-8 mb-4 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 flex items-start gap-3">
              <span className="text-xl mt-0.5">🎉</span>
              <div>
                <p className="text-sm font-semibold text-amber-400">First Time Setup Wizard</p>
                <p className="text-xs text-amber-400/70 mt-0.5">Connect your database first, then create your admin account and restaurant profile to get started.</p>
              </div>
            </div>
          )}

          {/* Mode Tabs — hide login tab if no users exist yet */}
          {hasExistingUsers && (
            <div className="flex mx-8 mb-4 bg-white/5 rounded-xl p-1 gap-1">
              {(['login', 'register'] as AuthMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 capitalize ${
                    mode === m
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/20'
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  {m === 'login' ? '🔐 Login' : '✨ Register'}
                </button>
              ))}
            </div>
          )}
          {!hasExistingUsers && (
            <div className="flex mx-8 mb-4">
              <div className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/30 text-amber-400 text-center">
                ✨ New System Registration
              </div>
            </div>
          )}

          {/* Database & MySQL Setup Guide Accordion */}
          <div className="mx-8 mb-4 bg-white/5 border border-white/10 rounded-2xl overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setShowDbGuide(!showDbGuide)}
              className="w-full px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <span>Database Setup & Online MySQL Guide</span>
              </div>
              {showDbGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showDbGuide && (
              <div className="p-4 space-y-3 text-white/80 bg-black/40 leading-relaxed border-t border-white/10">
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300">
                  <p className="font-bold flex items-center gap-1.5"><Database className="w-3.5 h-3.5" /> 1. Local MySQL Database</p>
                  <p className="text-[11px] text-emerald-200/80 mt-0.5">Use <code className="font-mono text-emerald-300">localhost</code> and port <code className="font-mono text-emerald-300">3306</code> with your local MySQL root password.</p>
                </div>

                <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5"><Server className="w-3.5 h-3.5" /> 2. Online / Remote Cloud Database</p>
                  <p className="text-[11px] text-amber-200/80">Enter your cloud database host domain or public IP address (e.g. <code className="font-mono text-amber-300">db.myrestaurant.com</code> or <code className="font-mono text-amber-300">103.x.x.x</code>), port, and credentials. Ensure remote connections (0.0.0.0/0) are permitted on your MySQL server.</p>
                </div>
              </div>
            )}
          </div>

          {/* ─── LOGIN FORM ─── */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="px-8 pb-8 flex flex-col gap-4">
              {localError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 flex items-center gap-2">
                  <span className="text-base">⚠️</span> {localError}
                </div>
              )}
              <InputField
                id="login-email"
                label="Username / Email / Phone"
                value={loginForm.emailOrPhone}
                onChange={(v) => setLoginForm(p => ({ ...p, emailOrPhone: v }))}
                placeholder="e.g. admin or admin@restaurant.com"
                icon={<User className="w-4 h-4" />}
                required
              />
              <InputField
                id="login-password"
                label="Password"
                type={showPwd ? 'text' : 'password'}
                value={loginForm.password}
                onChange={(v) => setLoginForm(p => ({ ...p, password: v }))}
                placeholder="Enter your password"
                icon={<Lock className="w-4 h-4" />}
                required
                suffix={
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="text-white/30 hover:text-white/70 transition-colors">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold rounded-xl shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><LogIn className="w-4 h-4" /> Sign In</>
                )}
              </button>
              <p className="text-center text-xs text-white/30 mt-1">
                No account yet?{' '}
                <button type="button" onClick={() => switchMode('register')} className="text-amber-400 hover:text-amber-300 font-semibold">
                  Register here
                </button>
              </p>
            </form>
          )}

          {/* ─── REGISTER FORM (3-STEP WIZARD) ─── */}
          {mode === 'register' && (
            <div className="px-8 pb-8">
              {/* Step Indicator Bar */}
              <div className="flex items-center justify-between mb-6 px-2">
                {/* Step 1: Database */}
                <div className={`flex items-center gap-1.5 text-xs font-semibold ${regStep === 'database' ? 'text-amber-400' : dbStatus.connected ? 'text-emerald-400' : 'text-amber-400'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                    regStep === 'database' ? 'border-amber-400 bg-amber-400/10 text-amber-400' : dbStatus.connected ? 'border-emerald-400 bg-emerald-400/10 text-emerald-400' : 'border-amber-400 bg-amber-400/10 text-amber-400'
                  }`}>
                    {dbStatus.connected ? <CheckCircle2 className="w-4 h-4" /> : '1'}
                  </div>
                  <span>Database</span>
                </div>
                <div className={`flex-1 h-px mx-2 transition-colors ${regStep !== 'database' ? 'bg-amber-400' : 'bg-white/10'}`} />

                {/* Step 2: Account */}
                <div className={`flex items-center gap-1.5 text-xs font-semibold ${regStep === 'account' ? 'text-amber-400' : regStep === 'restaurant' ? 'text-emerald-400' : 'text-white/30'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                    regStep === 'account' ? 'border-amber-400 bg-amber-400/10 text-amber-400' : regStep === 'restaurant' ? 'border-emerald-400 bg-emerald-400/10 text-emerald-400' : 'border-white/20 text-white/30'
                  }`}>
                    {regStep === 'restaurant' ? <CheckCircle2 className="w-4 h-4" /> : '2'}
                  </div>
                  <span>Account</span>
                </div>
                <div className={`flex-1 h-px mx-2 transition-colors ${regStep === 'restaurant' ? 'bg-amber-400' : 'bg-white/10'}`} />

                {/* Step 3: Restaurant */}
                <div className={`flex items-center gap-1.5 text-xs font-semibold ${regStep === 'restaurant' ? 'text-amber-400' : 'text-white/30'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                    regStep === 'restaurant' ? 'border-amber-400 bg-amber-400/10 text-amber-400' : 'border-white/20 text-white/30'
                  }`}>
                    3
                  </div>
                  <span>Restaurant</span>
                </div>
              </div>

              {localError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 flex items-center gap-2 mb-4">
                  <span className="text-base">⚠️</span> {localError}
                </div>
              )}

              {/* ─── STEP 1: DATABASE SETUP (MANDATORY) ─── */}
              {regStep === 'database' && (
                <form onSubmit={handleProceedToAccountStep} className="flex flex-col gap-4">
                  <div className="text-center mb-1">
                    <p className="text-sm font-semibold text-amber-400 flex items-center justify-center gap-1.5">
                      <Database className="w-4 h-4" /> Step 1: Connect Your Database First
                    </p>
                    <p className="text-xs text-white/40 mt-0.5">Configure your Local MySQL or Online Remote Database</p>
                  </div>

                  {/* Preset Selector */}
                  <div className="grid grid-cols-2 gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
                    <button
                      type="button"
                      onClick={() => applyPreset('local')}
                      className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                        dbPreset === 'local' ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300' : 'text-white/40 hover:text-white/70'
                      }`}
                    >
                      <Database className="w-3.5 h-3.5" /> Local MySQL
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('online')}
                      className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                        dbPreset === 'online' ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300' : 'text-white/40 hover:text-white/70'
                      }`}
                    >
                      <Server className="w-3.5 h-3.5" /> Online / Remote DB
                    </button>
                  </div>

                  {/* DB Connection Form Fields */}
                  <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <InputField
                          id="db-host"
                          label="Host / Server IP"
                          value={dbConfig.host}
                          onChange={(v) => setDbConfig(p => ({ ...p, host: v }))}
                          placeholder={dbPreset === 'local' ? 'localhost' : 'e.g. 103.x.x.x or db.example.com'}
                          icon={<Server className="w-4 h-4" />}
                          required
                        />
                      </div>
                      <div>
                        <InputField
                          id="db-port"
                          label="Port"
                          value={dbConfig.port}
                          onChange={(v) => setDbConfig(p => ({ ...p, port: v }))}
                          placeholder="3306"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <InputField
                        id="db-user"
                        label="Database User"
                        value={dbConfig.user}
                        onChange={(v) => setDbConfig(p => ({ ...p, user: v }))}
                        placeholder="root"
                        icon={<User className="w-4 h-4" />}
                        required
                      />
                      <InputField
                        id="db-password"
                        label="Password"
                        type={showPwd ? 'text' : 'password'}
                        value={dbConfig.password}
                        onChange={(v) => setDbConfig(p => ({ ...p, password: v }))}
                        placeholder="Root password"
                        icon={<Lock className="w-4 h-4" />}
                        suffix={
                          <button type="button" onClick={() => setShowPwd(!showPwd)} className="text-white/30 hover:text-white/70">
                            {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        }
                      />
                    </div>

                    <InputField
                      id="db-name"
                      label="Database Name"
                      value={dbConfig.database}
                      onChange={(v) => setDbConfig(p => ({ ...p, database: v }))}
                      placeholder="kish_mandhi"
                      icon={<Database className="w-4 h-4" />}
                      required
                    />

                    {/* Test & Save Action Buttons */}
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleTestDb}
                        disabled={testingDb || savingDb}
                        className="flex-1 py-2.5 bg-white/10 border border-white/15 text-amber-300 font-semibold rounded-xl hover:bg-white/15 transition-all text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {testingDb ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        Test Connection
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveAndConnectDb}
                        disabled={testingDb || savingDb}
                        className="flex-1 py-2.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold rounded-xl hover:bg-amber-500/30 transition-all text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {savingDb ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        Save & Connect DB
                      </button>
                    </div>
                  </div>

                  {/* Connection Status Badge */}
                  {dbStatus.message && (
                    <div className={`px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 border ${
                      dbStatus.connected
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-red-500/10 border-red-500/30 text-red-400'
                    }`}>
                      {dbStatus.connected ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                      <span>{dbStatus.message}</span>
                    </div>
                  )}

                  {/* Proceed to Step 2 Button */}
                  <button
                    type="submit"
                    disabled={savingDb || testingDb}
                    className="w-full py-3 font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg text-sm bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-400 hover:to-amber-500 shadow-amber-500/20 disabled:opacity-60"
                  >
                    {savingDb ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Connecting to Database...
                      </>
                    ) : (
                      <>
                        Next: Admin Account Registration <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* ─── STEP 2: ACCOUNT REGISTRATION ─── */}
              {regStep === 'account' && (
                <form onSubmit={handleNextStep} className="flex flex-col gap-4">
                  <p className="text-xs text-white/40 text-center mb-1">Step 2: Create your Admin User account</p>

                  <InputField id="reg-name" label="Full Name" value={accountForm.name} onChange={(v) => setAccountForm(p => ({ ...p, name: v }))} placeholder="Your Full Name" icon={<User className="w-4 h-4" />} required />
                  <InputField id="reg-email" label="Email Address" type="email" value={accountForm.email} onChange={(v) => setAccountForm(p => ({ ...p, email: v }))} placeholder="admin@restaurant.com" icon={<Mail className="w-4 h-4" />} required />
                  <InputField id="reg-phone" label="Phone Number" value={accountForm.phone} onChange={(v) => setAccountForm(p => ({ ...p, phone: v }))} placeholder="+91 98765 43210" icon={<Phone className="w-4 h-4" />} />
                  <InputField id="reg-password" label="Password" type={showPwd ? 'text' : 'password'} value={accountForm.password} onChange={(v) => setAccountForm(p => ({ ...p, password: v }))} placeholder="Min 6 characters" icon={<Lock className="w-4 h-4" />} required
                    suffix={<button type="button" onClick={() => setShowPwd(!showPwd)} className="text-white/30 hover:text-white/70"><Eye className="w-4 h-4" /></button>}
                  />
                  <InputField id="reg-confirm" label="Confirm Password" type={showConfirmPwd ? 'text' : 'password'} value={accountForm.confirmPassword} onChange={(v) => setAccountForm(p => ({ ...p, confirmPassword: v }))} placeholder="Re-enter password" icon={<Lock className="w-4 h-4" />} required
                    suffix={<button type="button" onClick={() => setShowConfirmPwd(!showConfirmPwd)} className="text-white/30 hover:text-white/70"><EyeOff className="w-4 h-4" /></button>}
                  />

                  <div className="flex gap-3 mt-2">
                    <button type="button" onClick={() => { setRegStep('database'); clearErrors(); }} className="flex-1 py-3 bg-white/5 border border-white/10 text-white/60 font-semibold rounded-xl hover:bg-white/10 flex items-center justify-center gap-2">
                      <ArrowLeft className="w-4 h-4" /> Back to Database
                    </button>
                    <button type="submit" className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:from-amber-400 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/20">
                      Next: Restaurant Setup <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}

              {/* ─── STEP 3: RESTAURANT SETUP ─── */}
              {regStep === 'restaurant' && (
                <form onSubmit={handleRegister} className="flex flex-col gap-4">
                  <p className="text-xs text-white/40 text-center mb-1">Step 3: Setup your restaurant & business details</p>

                  <InputField id="reg-company" label="Company / Restaurant Name" value={restForm.companyName} onChange={(v) => setRestForm(p => ({ ...p, companyName: v }))} placeholder="e.g. Kish Mandhi Arabic Grill" icon={<Building2 className="w-4 h-4" />} required />
                  <InputField id="reg-tagline" label="Tagline / Description" value={restForm.tagline} onChange={(v) => setRestForm(p => ({ ...p, tagline: v }))} placeholder="Arabic Grill & Fine Dining" icon={<FileText className="w-4 h-4" />} />
                  <div className="grid grid-cols-2 gap-3">
                    <InputField id="reg-gst" label="GSTIN Number" value={restForm.gstNumber} onChange={(v) => setRestForm(p => ({ ...p, gstNumber: v }))} placeholder="33ABCDE1234F1Z5" icon={<Receipt className="w-4 h-4" />} />
                    <InputField id="reg-fssai" label="FSSAI License" value={restForm.fssaiNumber} onChange={(v) => setRestForm(p => ({ ...p, fssaiNumber: v }))} placeholder="12421XXXXXXXXX" icon={<FileText className="w-4 h-4" />} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <InputField id="reg-rest-phone" label="Restaurant Phone" value={restForm.phone} onChange={(v) => setRestForm(p => ({ ...p, phone: v }))} placeholder="+91 98765 43210" icon={<Phone className="w-4 h-4" />} />
                    <InputField id="reg-tax" label="Default Tax Rate (%)" type="number" value={restForm.taxRate} onChange={(v) => setRestForm(p => ({ ...p, taxRate: v }))} placeholder="5" icon={<Percent className="w-4 h-4" />} />
                  </div>
                  <InputField id="reg-address" label="Full Address" value={restForm.address} onChange={(v) => setRestForm(p => ({ ...p, address: v }))} placeholder="Street, City, State, PIN" icon={<MapPin className="w-4 h-4" />} />
                  <InputField id="reg-footer" label="Receipt Footer Message" value={restForm.footerNote} onChange={(v) => setRestForm(p => ({ ...p, footerNote: v }))} placeholder="Thank you for visiting!" icon={<FileText className="w-4 h-4" />} />

                  <div className="flex gap-3 mt-2">
                    <button type="button" onClick={() => { setRegStep('account'); clearErrors(); }} className="flex-1 py-3 bg-white/5 border border-white/10 text-white/60 font-semibold rounded-xl hover:bg-white/10 flex items-center justify-center gap-2">
                      <ArrowLeft className="w-4 h-4" /> Back to Account
                    </button>
                    <button type="submit" disabled={isLoading} className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:from-amber-400 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-60">
                      {isLoading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Complete Registration</>}
                    </button>
                  </div>
                </form>
              )}

              <p className="text-center text-xs text-white/30 mt-4">
                Already registered?{' '}
                <button type="button" onClick={() => switchMode('login')} className="text-amber-400 hover:text-amber-300 font-semibold">Sign In</button>
              </p>
            </div>
          )}

          {/* Bottom Glow Bar */}
          <div className="h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
        </div>
      </div>
    </div>
  );
};

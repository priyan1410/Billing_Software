import React, { useState, useEffect } from 'react';
import {
  Crown, Eye, EyeOff, ArrowRight, ArrowLeft,
  User, Mail, Phone, Lock, Building2, Receipt,
  MapPin, Percent, FileText, CheckCircle2, LogIn,
  HelpCircle, ChevronDown, ChevronUp, Database, Server
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

type AuthMode = 'login' | 'register';

// Steps in registration
type RegStep = 'account' | 'restaurant';

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
  const { login, register, isLoading, error, clearError, hasExistingUsers, restaurantDetails } = useAuthStore();
  const [mode, setMode] = useState<AuthMode>(() => hasExistingUsers ? 'login' : 'register');
  const [regStep, setRegStep] = useState<RegStep>('account');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [showDbGuide, setShowDbGuide] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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

  // When hasExistingUsers changes (after DB check), update mode
  useEffect(() => {
    if (!hasExistingUsers) setMode('register');
  }, [hasExistingUsers]);


  const clearErrors = () => {
    setLocalError(null);
    clearError();
  };

  const switchMode = (m: AuthMode) => {
    setMode(m);
    setRegStep('account');
    clearErrors();
    setSuccessMsg(null);
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
          <div className="flex flex-col items-center pt-10 pb-6 px-8">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-700 rounded-2xl flex items-center justify-center shadow-xl shadow-amber-500/30 mb-4 overflow-hidden">
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
                <p className="text-sm font-semibold text-amber-400">First Time Setup</p>
                <p className="text-xs text-amber-400/70 mt-0.5">Welcome! No accounts found in the database. Please create your admin account and restaurant profile to get started.</p>
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
                ✨ New Registration
              </div>
            </div>
          )}

          {/* Database & MySQL Setup Guide Accordion */}
          <div className="mx-8 mb-6 bg-white/5 border border-white/10 rounded-2xl overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setShowDbGuide(!showDbGuide)}
              className="w-full px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <span>Database & MySQL Installation Guide</span>
              </div>
              {showDbGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showDbGuide && (
              <div className="p-4 space-y-3 text-white/80 bg-black/40 leading-relaxed border-t border-white/10">
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300">
                  <p className="font-bold flex items-center gap-1.5"><Database className="w-3.5 h-3.5" /> 1. Embedded Local DB (Default)</p>
                  <p className="text-[11px] text-emerald-200/80 mt-0.5">Works 100% offline out-of-the-box! All bills, menu items & data are automatically stored locally in your laptop's AppData.</p>
                </div>

                <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5"><Server className="w-3.5 h-3.5" /> 2. MySQL Step-by-Step Setup (Optional)</p>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-amber-200/80">
                    <li>Download <b>MySQL Installer</b> from <span className="text-amber-300 font-mono">dev.mysql.com/downloads/installer/</span></li>
                    <li>Select <b>Server Only</b> (or Developer Default) &amp; click Next.</li>
                    <li>Keep Port set to <code className="text-amber-300 font-mono">3306</code>.</li>
                    <li>Set your Root Password (e.g. <code className="text-amber-300 font-mono">Suriy@24</code>).</li>
                    <li>Ensure <i>Start MySQL at System Startup</i> is checked &amp; Finish setup.</li>
                    <li>Inside the app, go to <b>Database Settings &gt; Configure MySQL</b>, enter credentials &amp; click <b>Save &amp; Connect</b>.</li>
                  </ol>
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

          {/* ─── REGISTER FORM ─── */}
          {mode === 'register' && (
            <div className="px-8 pb-8">
              {/* Step Indicator */}
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className={`flex items-center gap-2 text-xs font-semibold transition-colors ${regStep === 'account' ? 'text-amber-400' : 'text-emerald-400'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${regStep === 'account' ? 'border-amber-400 bg-amber-400/10 text-amber-400' : 'border-emerald-400 bg-emerald-400/10 text-emerald-400'}`}>
                    {regStep === 'restaurant' ? <CheckCircle2 className="w-4 h-4" /> : '1'}
                  </div>
                  <span>Account</span>
                </div>
                <div className={`w-12 h-px transition-colors ${regStep === 'restaurant' ? 'bg-amber-400' : 'bg-white/10'}`} />
                <div className={`flex items-center gap-2 text-xs font-semibold transition-colors ${regStep === 'restaurant' ? 'text-amber-400' : 'text-white/30'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${regStep === 'restaurant' ? 'border-amber-400 bg-amber-400/10 text-amber-400' : 'border-white/20 text-white/30'}`}>
                    2
                  </div>
                  <span>Restaurant</span>
                </div>
              </div>

              {localError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 flex items-center gap-2 mb-4">
                  <span className="text-base">⚠️</span> {localError}
                </div>
              )}

              {/* Step 1: Account */}
              {regStep === 'account' && (
                <form onSubmit={handleNextStep} className="flex flex-col gap-4">
                  <p className="text-xs text-white/40 text-center mb-2">Create your admin account to get started</p>
                  <InputField id="reg-name" label="Full Name" value={accountForm.name} onChange={(v) => setAccountForm(p => ({ ...p, name: v }))} placeholder="Your Full Name" icon={<User className="w-4 h-4" />} required />
                  <InputField id="reg-email" label="Email Address" type="email" value={accountForm.email} onChange={(v) => setAccountForm(p => ({ ...p, email: v }))} placeholder="admin@restaurant.com" icon={<Mail className="w-4 h-4" />} required />
                  <InputField id="reg-phone" label="Phone Number" value={accountForm.phone} onChange={(v) => setAccountForm(p => ({ ...p, phone: v }))} placeholder="+91 98765 43210" icon={<Phone className="w-4 h-4" />} />
                  <InputField id="reg-password" label="Password" type={showPwd ? 'text' : 'password'} value={accountForm.password} onChange={(v) => setAccountForm(p => ({ ...p, password: v }))} placeholder="Min 6 characters" icon={<Lock className="w-4 h-4" />} required
                    suffix={<button type="button" onClick={() => setShowPwd(!showPwd)} className="text-white/30 hover:text-white/70"><Eye className="w-4 h-4" /></button>}
                  />
                  <InputField id="reg-confirm" label="Confirm Password" type={showConfirmPwd ? 'text' : 'password'} value={accountForm.confirmPassword} onChange={(v) => setAccountForm(p => ({ ...p, confirmPassword: v }))} placeholder="Re-enter password" icon={<Lock className="w-4 h-4" />} required
                    suffix={<button type="button" onClick={() => setShowConfirmPwd(!showConfirmPwd)} className="text-white/30 hover:text-white/70"><EyeOff className="w-4 h-4" /></button>}
                  />
                  <button type="submit" className="mt-2 w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:from-amber-400 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/20">
                    Next: Restaurant Setup <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}

              {/* Step 2: Restaurant Setup */}
              {regStep === 'restaurant' && (
                <form onSubmit={handleRegister} className="flex flex-col gap-4">
                  <p className="text-xs text-white/40 text-center mb-2">Setup your restaurant & business details</p>
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
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <button type="submit" disabled={isLoading} className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:from-amber-400 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-60">
                      {isLoading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Complete Setup</>}
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

import React, { useState, useEffect } from 'react';
import {
  Building2, Receipt, Phone, Mail, MapPin, Percent,
  FileText, Save, CheckCircle2, AlertCircle, User,
  LogOut, Shield, Store, Edit3, RefreshCw, Printer
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { RestaurantDetails } from '../../types';

const SectionCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; subtitle?: string }> = ({ title, icon, children, subtitle }) => (
  <div className="bg-white/3 border border-white/8 rounded-2xl p-6 space-y-5">
    <div className="flex items-center gap-3 pb-4 border-b border-white/8">
      <div className="w-9 h-9 bg-amber-500/15 rounded-xl flex items-center justify-center text-amber-400">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-bold text-white">{title}</h3>
        {subtitle && <p className="text-xs text-white/40">{subtitle}</p>}
      </div>
    </div>
    {children}
  </div>
);

const FieldRow: React.FC<{
  id: string;
  label: string;
  type?: string;
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  half?: boolean;
}> = ({ id, label, type = 'text', value, onChange, placeholder, half }) => (
  <div className={half ? '' : 'col-span-2'}>
    <label htmlFor={id} className="block text-[11px] font-semibold text-amber-300/70 uppercase tracking-widest mb-1.5">{label}</label>
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all"
    />
  </div>
);

export const RestaurantSettingsView: React.FC = () => {
  const { restaurantDetails, user, updateRestaurantDetails, loadRestaurantDetails, logout, isLoading } = useAuthStore();
  const [form, setForm] = useState<RestaurantDetails & { taxRateStr: string }>({
    ...restaurantDetails,
    taxRateStr: String(restaurantDetails.taxRate ?? 5)
  });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveMsg, setSaveMsg] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    loadRestaurantDetails();
  }, []);

  useEffect(() => {
    setForm({ ...restaurantDetails, taxRateStr: String(restaurantDetails.taxRate ?? 5) });
    setIsDirty(false);
  }, [restaurantDetails]);

  const update = (key: keyof RestaurantDetails | 'taxRateStr', value: string | boolean) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
    setSaveStatus('idle');
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    const payload: Partial<RestaurantDetails> = {
      companyName: form.companyName,
      tagline: form.tagline,
      ownerName: form.ownerName,
      gstNumber: form.gstNumber,
      fssaiNumber: form.fssaiNumber,
      phone: form.phone,
      email: form.email,
      address: form.address,
      taxRate: Number(form.taxRateStr) || 5,
      currency: form.currency,
      headerNote: form.headerNote,
      footerNote: form.footerNote,
      printShowLogo: form.printShowLogo ?? true,
      printShowAddress: form.printShowAddress ?? true,
      printShowPhone: form.printShowPhone ?? true,
      printShowGst: form.printShowGst ?? true,
      printShowHeaderNote: form.printShowHeaderNote ?? true,
      printShowTime: form.printShowTime ?? true,
      printShowTaxBreakdown: form.printShowTaxBreakdown ?? true,
      printShowRoundOff: form.printShowRoundOff ?? true,
      printShowFooterNote: form.printShowFooterNote ?? true
    };

    const res = await updateRestaurantDetails(payload);
    if (res.success) {
      setSaveStatus('saved');
      setSaveMsg('Settings saved successfully!');
      setIsDirty(false);
      setTimeout(() => setSaveStatus('idle'), 3000);
    } else {
      setSaveStatus('error');
      setSaveMsg(res.message || 'Failed to save settings');
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      logout();
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Store className="w-6 h-6 text-amber-400" />
            Restaurant Settings
          </h2>
          <p className="text-sm text-white/40 mt-1">Manage your restaurant profile, GST, and billing configurations</p>
        </div>
        <div className="flex items-center gap-3">
          {isDirty && (
            <span className="text-xs text-amber-400 flex items-center gap-1.5 bg-amber-400/10 border border-amber-400/20 px-3 py-1.5 rounded-full">
              <Edit3 className="w-3 h-3" /> Unsaved changes
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={!isDirty || saveStatus === 'saving'}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold rounded-xl text-sm hover:from-amber-400 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saveStatus === 'saving' ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</>
            ) : saveStatus === 'saved' ? (
              <><CheckCircle2 className="w-4 h-4" /> Saved!</>
            ) : (
              <><Save className="w-4 h-4" /> Save Changes</>
            )}
          </button>
        </div>
      </div>

      {/* Save Status Banner */}
      {saveStatus === 'saved' && (
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-sm text-emerald-400">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {saveMsg}
        </div>
      )}
      {saveStatus === 'error' && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {saveMsg}
        </div>
      )}

      {/* Settings Grid */}
      <div className="grid grid-cols-1 gap-6">

        {/* Restaurant Identity */}
        <SectionCard title="Restaurant Identity" icon={<Building2 className="w-5 h-5" />} subtitle="Core branding and company information">
          <div className="grid grid-cols-2 gap-4">
            <FieldRow id="s-company" label="Company / Restaurant Name *" value={form.companyName} onChange={(v) => update('companyName', v)} placeholder="Kish Mandhi" />
            <FieldRow id="s-tagline" label="Tagline / Description" value={form.tagline || ''} onChange={(v) => update('tagline', v)} placeholder="Arabic Grill & Fine Dining" />
            <FieldRow id="s-owner" label="Owner / Manager Name" value={form.ownerName || ''} onChange={(v) => update('ownerName', v)} placeholder="Your Name" half />
            <FieldRow id="s-currency" label="Currency Symbol" value={form.currency || '₹'} onChange={(v) => update('currency', v)} placeholder="₹" half />
          </div>
        </SectionCard>

        {/* Compliance & Tax */}
        <SectionCard title="Compliance & Tax" icon={<Receipt className="w-5 h-5" />} subtitle="GST, FSSAI license, and tax rate configuration">
          <div className="grid grid-cols-2 gap-4">
            <FieldRow id="s-gst" label="GSTIN / GST Number" value={form.gstNumber || ''} onChange={(v) => update('gstNumber', v)} placeholder="33ABCDE1234F1Z5" half />
            <FieldRow id="s-fssai" label="FSSAI License Number" value={form.fssaiNumber || ''} onChange={(v) => update('fssaiNumber', v)} placeholder="12421008000123" half />
            <div className="col-span-2">
              <label htmlFor="s-tax" className="block text-[11px] font-semibold text-amber-300/70 uppercase tracking-widest mb-1.5">Default Tax / GST Rate (%)</label>
              <div className="relative max-w-[180px]">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/60 pointer-events-none" />
                <input
                  id="s-tax"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.taxRateStr}
                  onChange={(e) => update('taxRateStr', e.target.value)}
                  placeholder="5"
                  className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl px-3 py-2.5 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all"
                />
              </div>
              <p className="text-[11px] text-white/30 mt-1.5">Applied on all bills. Shown as GST on receipts.</p>
            </div>
          </div>
        </SectionCard>

        {/* Contact Details */}
        <SectionCard title="Contact Details" icon={<Phone className="w-5 h-5" />} subtitle="Restaurant phone, email, and physical address">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="s-phone" className="block text-[11px] font-semibold text-amber-300/70 uppercase tracking-widest mb-1.5">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/60 pointer-events-none" />
                <input id="s-phone" type="tel" value={form.phone || ''} onChange={(e) => update('phone', e.target.value)} placeholder="+91 98765 43210" className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl px-3 py-2.5 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all" />
              </div>
            </div>
            <div>
              <label htmlFor="s-email" className="block text-[11px] font-semibold text-amber-300/70 uppercase tracking-widest mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/60 pointer-events-none" />
                <input id="s-email" type="email" value={form.email || ''} onChange={(e) => update('email', e.target.value)} placeholder="contact@restaurant.com" className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl px-3 py-2.5 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all" />
              </div>
            </div>
            <div className="col-span-2">
              <label htmlFor="s-address" className="block text-[11px] font-semibold text-amber-300/70 uppercase tracking-widest mb-1.5">Full Address</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-amber-500/60 pointer-events-none" />
                <textarea id="s-address" value={form.address || ''} onChange={(e) => update('address', e.target.value)} placeholder="Street, Area, City, State, PIN Code" rows={2} className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl px-3 py-2.5 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all resize-none" />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Receipt Customization */}
        <SectionCard title="Receipt Notes" icon={<FileText className="w-5 h-5" />} subtitle="Custom text printed on top and bottom of receipts">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label htmlFor="s-header" className="block text-[11px] font-semibold text-amber-300/70 uppercase tracking-widest mb-1.5">Receipt Header Note</label>
              <textarea id="s-header" value={form.headerNote || ''} onChange={(e) => update('headerNote', e.target.value)} placeholder="e.g. Welcome to Kish Mandhi - Arabian Hospitality" rows={2} className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all resize-none" />
            </div>
            <div className="col-span-2">
              <label htmlFor="s-footer" className="block text-[11px] font-semibold text-amber-300/70 uppercase tracking-widest mb-1.5">Receipt Footer Note</label>
              <textarea id="s-footer" value={form.footerNote || ''} onChange={(e) => update('footerNote', e.target.value)} placeholder="e.g. Thank you for dining with us!" rows={2} className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all resize-none" />
            </div>
          </div>
        </SectionCard>

        {/* Bill Print Customization */}
        <SectionCard title="Bill Print Customization" icon={<Printer className="w-5 h-5" />} subtitle="Select which fields to include or hide on printed thermal bills">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { id: 'printShowLogo', label: 'Show Restaurant Logo Header', value: form.printShowLogo ?? true },
              { id: 'printShowAddress', label: 'Show Restaurant Address', value: form.printShowAddress ?? true },
              { id: 'printShowPhone', label: 'Show Phone Number', value: form.printShowPhone ?? true },
              { id: 'printShowGst', label: 'Show GSTIN / Tax Number', value: form.printShowGst ?? true },
              { id: 'printShowHeaderNote', label: 'Show Receipt Header Note', value: form.printShowHeaderNote ?? true },
              { id: 'printShowTime', label: 'Show Print Time', value: form.printShowTime ?? true },
              { id: 'printShowTaxBreakdown', label: 'Show Tax Breakdown (CGST / SGST)', value: form.printShowTaxBreakdown ?? true },
              { id: 'printShowRoundOff', label: 'Show Round Off Amount', value: form.printShowRoundOff ?? true },
              { id: 'printShowFooterNote', label: 'Show Footer Note & Terms', value: form.printShowFooterNote ?? true }
            ].map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-colors select-none"
              >
                <input
                  type="checkbox"
                  checked={Boolean(item.value)}
                  onChange={(e) => update(item.id as any, e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
                <span className="text-xs font-semibold text-white">{item.label}</span>
              </label>
            ))}
          </div>
        </SectionCard>

        {/* Account Info */}
        <SectionCard title="Account Information" icon={<Shield className="w-5 h-5" />} subtitle="Logged-in user and session management">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-700 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-amber-500/20">
                {user?.name?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div>
                <p className="text-white font-semibold">{user?.name || 'Admin'}</p>
                <p className="text-sm text-white/40">{user?.email || '-'}</p>
                {user?.phone && <p className="text-xs text-white/30">{user.phone}</p>}
                <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold bg-amber-400/10 border border-amber-400/20 text-amber-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  <User className="w-3 h-3" /> {user?.role || 'Admin'}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 font-semibold text-sm rounded-xl hover:bg-red-500/20 hover:border-red-500/40 transition-all"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </SectionCard>
      </div>

      {/* Sticky Save Button (Mobile-friendly) */}
      {isDirty && (
        <div className="sticky bottom-0 pb-2 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold rounded-xl text-sm shadow-xl shadow-amber-500/30 hover:from-amber-400 hover:to-amber-500 transition-all disabled:opacity-60"
          >
            {saveStatus === 'saving' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saveStatus === 'saving' ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      )}
    </div>
  );
};

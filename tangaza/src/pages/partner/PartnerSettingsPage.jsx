import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchPartnerSettings, updatePartnerSettings, uploadPartnerLogo } from '../../api';
import { BILLBOARD_TYPES } from '../../data/billboardTypes';
import { EmptyState, SectionCard, ghostButtonClass, goldButtonClass, inputClass, labelClass } from '../../components/partner/ui';

/**
 * Workspace settings (ERP PRD §7). The lead-time section is the load-bearing
 * one: it pushes the earliest bookable start date on the marketplace so
 * campaigns always leave room for artwork, printing and installation.
 */
export default function PartnerSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState('');
  const logoRef = useRef(null);

  useEffect(() => {
    fetchPartnerSettings().then(setSettings).catch(() => setFailed(true));
  }, []);

  if (failed) return <EmptyState>Couldn&apos;t load settings — try refreshing.</EmptyState>;
  if (!settings) return <p className="text-stone-600">Loading…</p>;

  const set = (field, value) => setSettings((current) => ({ ...current, [field]: value }));
  const setNested = (field, key, value) =>
    setSettings((current) => ({ ...current, [field]: { ...current[field], [key]: value } }));

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const fresh = await updatePartnerSettings({
        contact_email: settings.contact_email || null,
        contact_phone: settings.contact_phone || null,
        working_hours: settings.working_hours || null,
        offers_design: settings.offers_design,
        design_price: settings.design_price !== '' ? settings.design_price : null,
        offers_printing: settings.offers_printing,
        printing_price: settings.printing_price !== '' ? settings.printing_price : null,
        installation_price: settings.installation_price !== '' ? settings.installation_price : null,
        lead_times: Object.fromEntries(
          Object.entries(settings.lead_times).map(([key, value]) => [key, Number(value) || 0]),
        ),
        payout: settings.payout,
        notifications: settings.notifications,
        marketplace_visible: settings.marketplace_visible,
      });
      setSettings(fresh);
      setSavedAt(new Date());
    } catch (saveError) {
      setError(saveError.errors ? Object.values(saveError.errors).flat().join(' ') : saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogo(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setSettings(await uploadPartnerLogo(file));
    } catch (logoError) {
      setError(logoError.message);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <SectionCard title="Business profile">
        <div className="flex flex-wrap items-start gap-5">
          <button
            type="button"
            onClick={() => logoRef.current?.click()}
            className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-sand-dark bg-cream/50 text-[10px] font-semibold uppercase tracking-wide text-stone-400 hover:border-gold"
          >
            {settings.logo_url ? (
              <img src={settings.logo_url} alt="Company logo" className="h-full w-full object-cover" />
            ) : (
              'Add logo'
            )}
          </button>
          <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
          <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Contact email</label>
              <input type="email" value={settings.contact_email || ''} onChange={(e) => set('contact_email', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Contact phone</label>
              <input value={settings.contact_phone || ''} onChange={(e) => set('contact_phone', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Working hours</label>
              <input placeholder="Mon–Sat, 8am–6pm" value={settings.working_hours || ''} onChange={(e) => set('working_hours', e.target.value)} className={inputClass} />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Services & pricing">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-sand p-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <input type="checkbox" checked={settings.offers_design} onChange={(e) => set('offers_design', e.target.checked)} />
              We design artwork
            </label>
            <label className={`${labelClass} mt-3`}>Design price (KES)</label>
            <input type="number" min="0" disabled={!settings.offers_design} value={settings.design_price ?? ''} onChange={(e) => set('design_price', e.target.value === '' ? null : Number(e.target.value))} className={inputClass} />
          </div>
          <div className="rounded-2xl border border-sand p-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <input type="checkbox" checked={settings.offers_printing} onChange={(e) => set('offers_printing', e.target.checked)} />
              We print
            </label>
            <label className={`${labelClass} mt-3`}>Printing price (KES / sqm)</label>
            <input type="number" min="0" disabled={!settings.offers_printing} value={settings.printing_price ?? ''} onChange={(e) => set('printing_price', e.target.value === '' ? null : Number(e.target.value))} className={inputClass} />
          </div>
          <div className="rounded-2xl border border-sand p-4">
            <p className="text-sm font-semibold text-slate-800">Installation</p>
            <label className={`${labelClass} mt-3`}>Installation price (KES)</label>
            <input type="number" min="0" value={settings.installation_price ?? ''} onChange={(e) => set('installation_price', e.target.value === '' ? null : Number(e.target.value))} className={inputClass} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Installation lead times">
        <p className="text-sm text-stone-600">
          Days of notice you need before a campaign can start, per billboard type — customers on the
          marketplace can&apos;t book a start date any sooner, keeping room for artwork, printing and
          installation.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {BILLBOARD_TYPES.map(({ value, label }) => (
            <div key={value}>
              <label className={labelClass}>{label}</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={settings.lead_times?.[value] ?? 0}
                  onChange={(e) => setNested('lead_times', value, e.target.value)}
                  className={inputClass}
                />
                <span className="text-xs text-stone-500">days</span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Escrow payout account">
          <div className="grid gap-3">
            {[
              ['bank_name', 'Bank'],
              ['account_name', 'Account name'],
              ['account_number', 'Account number'],
            ].map(([key, label]) => (
              <div key={key}>
                <label className={labelClass}>{label}</label>
                <input value={settings.payout?.[key] || ''} onChange={(e) => setNested('payout', key, e.target.value)} className={inputClass} />
              </div>
            ))}
            <p className="text-xs text-stone-400">Where Tangazaa releases campaign payouts once a booking completes.</p>
          </div>
        </SectionCard>

        <SectionCard title="Notifications & visibility">
          <div className="space-y-2.5">
            {[
              ['in_app', 'In-app notifications'],
              ['email', 'Email notifications'],
              ['sms', 'SMS notifications'],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={!!settings.notifications?.[key]} onChange={(e) => setNested('notifications', key, e.target.checked)} />
                {label}
              </label>
            ))}
            <hr className="border-sand" />
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <input type="checkbox" checked={settings.marketplace_visible} onChange={(e) => set('marketplace_visible', e.target.checked)} />
              Visible on the Tangazaa marketplace
            </label>
            <p className="text-xs text-stone-400">
              Untick to hide your whole portfolio from app customers (ERP keeps working). Manage
              logins on the{' '}
              <Link to="/partner/team" className="font-semibold text-gold-dark hover:underline">
                Team page
              </Link>
              .
            </p>
          </div>
        </SectionCard>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className={goldButtonClass}>
          {saving ? 'Saving…' : 'Save settings'}
        </button>
        {savedAt && <span className={ghostButtonClass.replace('hover:border-gold hover:text-gold-dark', '')}>Saved ✓</span>}
      </div>
    </form>
  );
}

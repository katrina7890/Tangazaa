import { useEffect, useState } from 'react';
import { fetchEmailTopics, resendVerificationEmail, updateProfile } from '../../api';
import { Card, ErrorNotice, SectionHeading } from '../../components/customer/ui';
import { useAuth } from '../../context/AuthContext';

export default function CustomerProfilePage() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ name: '', company_name: '', email: '', phone: '' });
  const [topics, setTopics] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || '',
      company_name: user.company_name || '',
      email: user.email || '',
      phone: user.phone || '',
    });
  }, [user]);

  useEffect(() => {
    fetchEmailTopics()
      .then(setTopics)
      .catch(() => setError('Could not load your email preferences.'));
  }, []);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleTopic(value) {
    setTopics((current) =>
      current.map((topic) => (topic.value === value ? { ...topic, enabled: !topic.enabled } : topic)),
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');

    const emailChanged = form.email !== user?.email;

    try {
      const updated = await updateProfile({
        ...form,
        email_preferences: Object.fromEntries(topics.map((topic) => [topic.value, topic.enabled])),
      });
      setUser(updated);
      setNotice(
        emailChanged
          ? 'Saved. We sent a confirmation link to your new address.'
          : 'Your details are saved.',
      );
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setNotice('');
    setError('');
    try {
      const response = await resendVerificationEmail();
      setNotice(response?.message || 'Verification email sent.');
    } catch (resendError) {
      setError(resendError.message);
    } finally {
      setResending(false);
    }
  }

  const verified = Boolean(user?.email_verified_at);

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-8">
      <ErrorNotice>{error}</ErrorNotice>
      {notice && (
        <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{notice}</p>
      )}

      <section className="space-y-4">
        <SectionHeading>Your details</SectionHeading>
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" required>
              <input
                type="text"
                required
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Company" hint="Shown on your contracts and receipts">
              <input
                type="text"
                value={form.company_name}
                onChange={(event) => updateField('company_name', event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Email" required>
              <input
                type="email"
                required
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Phone" hint="So your campaign manager can reach you">
              <input
                type="tel"
                value={form.phone}
                onChange={(event) => updateField('phone', event.target.value)}
                className={inputClass}
                placeholder="+254…"
              />
            </Field>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sand bg-cream px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-forest">
                Email address {verified ? 'confirmed' : 'not confirmed'}
              </p>
              <p className="text-sm text-stone-600">
                {verified
                  ? 'Receipts and campaign updates are reaching you.'
                  : 'Confirm your address so receipts and updates reach your inbox.'}
              </p>
            </div>
            {verified ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-800">
                Verified
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="shrink-0 rounded-full border border-gold px-5 py-2 text-sm font-bold text-gold-dark transition hover:bg-gold/10 disabled:opacity-60"
              >
                {resending ? 'Sending…' : 'Send link'}
              </button>
            )}
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <SectionHeading>Email notifications</SectionHeading>
        <Card className="divide-y divide-sand">
          {topics.length === 0 && <p className="text-sm text-stone-500">Loading preferences…</p>}
          {topics.map((topic) => (
            <label
              key={topic.value}
              className="flex cursor-pointer items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
            >
              <span>
                <span className="block text-sm font-semibold text-forest">{topic.label}</span>
                <span className="block text-sm text-stone-500">{topic.description}</span>
              </span>
              <input
                type="checkbox"
                checked={topic.enabled}
                onChange={() => toggleTopic(topic.value)}
                className="mt-1 h-5 w-5 shrink-0 accent-[#8a3df0]"
              />
            </label>
          ))}
          <p className="pt-4 text-xs text-stone-400">
            Payment receipts and account-security emails are always sent — they&apos;re your financial
            and security record, so they aren&apos;t optional.
          </p>
        </Card>
      </section>

      <button
        type="submit"
        disabled={saving}
        className="rounded-full bg-gold px-8 py-3 text-sm font-bold text-white transition hover:bg-gold-soft disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}

const inputClass =
  'w-full rounded-xl border border-sand bg-white px-4 py-2.5 text-sm text-forest outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20';

function Field({ label, hint, required, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">
        {label}
        {required && <span className="text-gold-dark"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-stone-400">{hint}</span>}
    </label>
  );
}

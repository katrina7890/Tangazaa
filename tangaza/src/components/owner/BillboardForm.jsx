import { useState } from 'react';
import { createBillboard, updateBillboard } from '../../api';
import { BILLBOARD_TYPES } from '../../data/billboardTypes';

export default function BillboardForm({ billboard, onSaved, onCancel }) {
  const [form, setForm] = useState({
    title: billboard?.title || '',
    location: billboard?.location || '',
    lat: billboard?.lat ?? '',
    lng: billboard?.lng ?? '',
    size: billboard?.size || '',
    type: billboard?.type || BILLBOARD_TYPES[0].value,
    price_per_day: billboard?.pricePerDay ?? '',
    price_per_week: billboard?.pricePerWeek ?? '',
    description: billboard?.description || '',
    is_active: billboard?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      ...form,
      lat: Number(form.lat),
      lng: Number(form.lng),
      price_per_day: Number(form.price_per_day),
      price_per_week: Number(form.price_per_week),
    };

    try {
      if (billboard) {
        await updateBillboard(billboard.id, payload);
      } else {
        await createBillboard(payload);
      }
      onSaved();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 rounded-2xl border border-sand bg-white p-5 shadow-sm">
      <h2 className="font-display text-lg text-slate-900">
        {billboard ? 'Edit Billboard' : 'Add Billboard'}
      </h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Title">
          <input
            required
            value={form.title}
            onChange={(event) => update('title', event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Location">
          <input
            required
            value={form.location}
            onChange={(event) => update('location', event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Latitude">
          <input
            required
            type="number"
            step="any"
            value={form.lat}
            onChange={(event) => update('lat', event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Longitude">
          <input
            required
            type="number"
            step="any"
            value={form.lng}
            onChange={(event) => update('lng', event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Size">
          <input
            required
            placeholder="e.g. 10ft x 20ft"
            value={form.size}
            onChange={(event) => update('size', event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Type">
          <select value={form.type} onChange={(event) => update('type', event.target.value)} className={inputClass}>
            {BILLBOARD_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Price per day (KES)">
          <input
            required
            type="number"
            min="1"
            value={form.price_per_day}
            onChange={(event) => update('price_per_day', event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Price per week (KES)">
          <input
            required
            type="number"
            min="1"
            value={form.price_per_week}
            onChange={(event) => update('price_per_week', event.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Description">
          <textarea
            rows={3}
            value={form.description}
            onChange={(event) => update('description', event.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      {billboard && (
        <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(event) => update('is_active', event.target.checked)}
          />
          Active (visible to customers)
        </label>
      )}

      {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}

      <div className="mt-5 flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-gold px-5 py-2 text-sm font-bold text-forest hover:bg-gold-soft disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full bg-slate-100 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

const inputClass =
  'mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold';

function Field({ label, children }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      {children}
    </label>
  );
}

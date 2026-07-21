import { useState } from 'react';
import { createBillboard, updateBillboard } from '../../api';
import { BILLBOARD_TYPES } from '../../data/billboardTypes';
import { todayISO } from '../../utils/availability';

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
    channel: billboard?.channel || 'online',
    under_maintenance: billboard?.underMaintenance ?? false,
    archived: billboard?.archived ?? false,
    road: billboard?.road || '',
    lighting: billboard?.lighting || '',
    orientation: billboard?.orientation || '',
    daily_traffic: billboard?.dailyTraffic ?? '',
    visibility_score: billboard?.visibilityScore ?? '',
    discount_pct: billboard?.discountPct ?? '',
    tags: (billboard?.tags || []).join(', '),
    amenities: (billboard?.amenities || []).join(', '),
    available_from: billboard?.availableFrom || '',
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
    const toList = (csv) => csv.split(',').map((item) => item.trim()).filter(Boolean);
    const payload = {
      ...form,
      lat: Number(form.lat),
      lng: Number(form.lng),
      price_per_day: Number(form.price_per_day),
      price_per_week: Number(form.price_per_week),
      road: form.road || null,
      lighting: form.lighting || null,
      orientation: form.orientation || null,
      daily_traffic: form.daily_traffic ? Number(form.daily_traffic) : null,
      visibility_score: form.visibility_score ? Number(form.visibility_score) : null,
      discount_pct: form.discount_pct !== '' ? Number(form.discount_pct) : null,
      tags: toList(form.tags),
      amenities: toList(form.amenities),
      // Send null rather than '' so editing a legacy billboard without a set
      // date doesn't trip the backend's `date` rule.
      available_from: form.available_from || null,
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
        <Field label="Road / route (optional)">
          <input
            placeholder="e.g. Waiyaki Way, westbound"
            value={form.road}
            onChange={(event) => update('road', event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Lighting">
          <select value={form.lighting} onChange={(event) => update('lighting', event.target.value)} className={inputClass}>
            <option value="">Not specified</option>
            <option value="front_lit">Front-lit</option>
            <option value="back_lit">Back-lit</option>
            <option value="led">LED / digital</option>
            <option value="none">Unlit</option>
          </select>
        </Field>
        <Field label="Orientation">
          <select value={form.orientation} onChange={(event) => update('orientation', event.target.value)} className={inputClass}>
            <option value="">Not specified</option>
            <option value="landscape">Landscape</option>
            <option value="portrait">Portrait</option>
          </select>
        </Field>
        <Field label="Daily traffic estimate">
          <input
            type="number"
            min="0"
            placeholder="e.g. 45000"
            value={form.daily_traffic}
            onChange={(event) => update('daily_traffic', event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Visibility score (1–10)">
          <input
            type="number"
            min="1"
            max="10"
            value={form.visibility_score}
            onChange={(event) => update('visibility_score', event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Discount % (optional)">
          <input
            type="number"
            min="0"
            max="90"
            placeholder="e.g. 15"
            value={form.discount_pct}
            onChange={(event) => update('discount_pct', event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Tags (comma-separated)">
          <input
            placeholder="premium, highway, cbd"
            value={form.tags}
            onChange={(event) => update('tags', event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Amenities nearby (comma-separated)">
          <input
            placeholder="Sarit Centre, ABC Place"
            value={form.amenities}
            onChange={(event) => update('amenities', event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Sales channel">
          <select
            value={form.channel}
            onChange={(event) => update('channel', event.target.value)}
            className={inputClass}
          >
            <option value="online">Tangazaa marketplace (bookable in the app)</option>
            <option value="offline">Offline — sold through my own channels</option>
          </select>
          <span className="mt-1 block text-xs font-normal text-slate-500">
            Offline boards stay in your ERP (map, availability, offline deals) but are never shown
            to app customers.
          </span>
        </Field>
        <Field label="Available from">
          <input
            required={!billboard}
            type="date"
            min={todayISO()}
            value={form.available_from}
            onChange={(event) => update('available_from', event.target.value)}
            className={inputClass}
          />
          <span className="mt-1 block text-xs font-normal text-slate-500">
            The first day customers can book. Availability after that updates automatically as
            bookings come in.
          </span>
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

      <div className="mt-4 space-y-2">
        {billboard && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => update('is_active', event.target.checked)}
            />
            Active (visible to customers)
          </label>
        )}
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.under_maintenance}
            onChange={(event) => update('under_maintenance', event.target.checked)}
          />
          Under maintenance (temporarily unbookable, flagged red on your map)
        </label>
        {billboard && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.archived}
              onChange={(event) => update('archived', event.target.checked)}
            />
            Archived (off the marketplace and out of day-to-day ERP views, history kept)
          </label>
        )}
      </div>

      {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}

      <div className="mt-5 flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-gold px-5 py-2 text-sm font-bold text-white hover:bg-gold-soft disabled:opacity-60"
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

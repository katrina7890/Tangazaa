const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function getCookie(name) {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}

export async function ensureCsrfCookie() {
  await fetch(`${API_URL}/sanctum/csrf-cookie`, { credentials: 'include' });
}

export async function apiFetch(path, options = {}, _retried = false) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = {
    Accept: 'application/json',
    ...options.headers,
  };

  if (method !== 'GET' && method !== 'HEAD') {
    headers['Content-Type'] = 'application/json';
    headers['X-XSRF-TOKEN'] = getCookie('XSRF-TOKEN');
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    method,
    headers,
    credentials: 'include',
  });

  // A 419 means our CSRF token went stale (e.g. a competing request rotated the
  // session before this one landed). Refresh the cookie and retry once rather
  // than surfacing a confusing error for what's really a timing hiccup.
  if (response.status === 419 && !_retried) {
    await ensureCsrfCookie();
    return apiFetch(path, options, true);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const error = new Error(body?.message || `Request to ${path} failed with ${response.status}`);
    error.status = response.status;
    error.errors = body?.errors || null;
    throw error;
  }

  return response.status === 204 ? null : response.json();
}

export async function registerAccount(payload) {
  await ensureCsrfCookie();
  const { user } = await apiFetch('/api/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return user;
}

export async function login(credentials) {
  await ensureCsrfCookie();
  const { user } = await apiFetch('/api/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
  return user;
}

export async function logout() {
  await apiFetch('/api/logout', { method: 'POST' });
}

export async function fetchCurrentUser() {
  try {
    return await apiFetch('/api/user');
  } catch (error) {
    if (error.status === 401) return null;
    throw error;
  }
}

function mapBillboard(billboard) {
  return {
    id: billboard.id,
    ownerId: billboard.owner_id,
    title: billboard.title,
    location: billboard.location,
    lat: billboard.lat,
    lng: billboard.lng,
    size: billboard.size,
    type: billboard.type,
    pricePerDay: billboard.price_per_day,
    pricePerWeek: billboard.price_per_week,
    description: billboard.description,
    isActive: billboard.is_active,
    bookedRanges: billboard.booked_ranges || [],
    owner: billboard.owner || null,
  };
}

export async function fetchBillboards() {
  const { data } = await apiFetch('/api/billboards');
  return data.map(mapBillboard);
}

export async function fetchBillboard(id) {
  const { data } = await apiFetch(`/api/billboards/${id}`);
  return mapBillboard(data);
}

export async function fetchMyBillboards() {
  const { data } = await apiFetch('/api/my/billboards');
  return data.map(mapBillboard);
}

export async function createBillboard(payload) {
  const { data } = await apiFetch('/api/billboards', { method: 'POST', body: JSON.stringify(payload) });
  return mapBillboard(data);
}

export async function updateBillboard(id, payload) {
  const { data } = await apiFetch(`/api/billboards/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  return mapBillboard(data);
}

export async function deleteBillboard(id) {
  await apiFetch(`/api/billboards/${id}`, { method: 'DELETE' });
}

export async function fetchBillboardBookings(id) {
  const { data } = await apiFetch(`/api/billboards/${id}/bookings`);
  return data;
}

export async function createBooking(payload) {
  const { data } = await apiFetch('/api/bookings', { method: 'POST', body: JSON.stringify(payload) });
  return data;
}

export async function fetchMyBookings() {
  const { data } = await apiFetch('/api/my/bookings');
  return data;
}

export async function fetchAdminStats() {
  return apiFetch('/api/admin/stats');
}

export async function fetchAdminLoginAttempts() {
  const { data } = await apiFetch('/api/admin/login-attempts');
  return data;
}

function toQueryString(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value);
  });
  const string = query.toString();
  return string ? `?${string}` : '';
}

function mapAdminUser(user) {
  return {
    id: user.id,
    name: user.name,
    companyName: user.company_name,
    email: user.email,
    role: user.role,
    isSuspended: user.is_suspended,
    createdAt: user.created_at,
  };
}

export async function fetchAdminUsers(params = {}) {
  const { data } = await apiFetch(`/api/admin/users${toQueryString(params)}`);
  return data.map(mapAdminUser);
}

export async function toggleUserSuspension(id) {
  const { data } = await apiFetch(`/api/admin/users/${id}/toggle-suspension`, { method: 'PATCH' });
  return mapAdminUser(data);
}

export async function fetchAdminBillboards(params = {}) {
  const { data } = await apiFetch(`/api/admin/billboards${toQueryString(params)}`);
  return data.map(mapBillboard);
}

export async function fetchAdminBookings(params = {}) {
  const { data } = await apiFetch(`/api/admin/bookings${toQueryString(params)}`);
  return data;
}

export async function cancelAdminBooking(id) {
  const { data } = await apiFetch(`/api/admin/bookings/${id}/cancel`, { method: 'PATCH' });
  return data;
}

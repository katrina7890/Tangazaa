function resolveApiBase() {
  // Explicit override wins (local dev sets REACT_APP_API_URL=http://localhost:8000).
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  // Otherwise, when served from a real host (e.g. the demo tunnel) the API is
  // same-origin — Laravel serves this SPA — so use relative paths.
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') return '';
  }
  return 'http://localhost:8000';
}

const API_URL = resolveApiBase();

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
    // FormData bodies (photo uploads) must set their own multipart boundary —
    // forcing JSON here would break the upload.
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
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
    channel: billboard.channel || 'online',
    underMaintenance: billboard.under_maintenance ?? false,
    archived: billboard.archived ?? false,
    road: billboard.road || '',
    lighting: billboard.lighting || '',
    orientation: billboard.orientation || '',
    dailyTraffic: billboard.daily_traffic ?? null,
    visibilityScore: billboard.visibility_score ?? null,
    discountPct: billboard.discount_pct ?? null,
    tags: billboard.tags || [],
    amenities: billboard.amenities || [],
    availableFrom: billboard.available_from || null,
    nextAvailableFrom: billboard.next_available_from || null,
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

function mapPayment(payment) {
  if (!payment) return null;
  return {
    id: payment.id,
    reference: payment.reference,
    amount: payment.amount,
    email: payment.email,
    channel: payment.channel,
    status: payment.status,
    paidAt: payment.paid_at ?? null,
  };
}

// Creating a booking opens a (simulated) Paystack checkout; the booking stays
// `pending` until the returned payment is verified.
export async function createBooking(payload) {
  const { data, payment } = await apiFetch('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return { booking: mapBooking(data), payment: mapPayment(payment) };
}

// (Re)open checkout for a booking the customer hasn't finished paying for.
export async function initializePayment(bookingId) {
  const { data } = await apiFetch(`/api/bookings/${bookingId}/pay`, { method: 'POST' });
  return mapPayment(data);
}

// Settle a checkout. Pass success=false to simulate a declined payment.
export async function verifyPayment(reference, success = true) {
  const { data, payment } = await apiFetch(`/api/payments/${reference}/verify`, {
    method: 'POST',
    body: JSON.stringify({ success }),
  });
  return { booking: mapBooking(data), payment: mapPayment(payment) };
}

function mapBooking(booking) {
  return {
    id: booking.id,
    billboard: {
      id: booking.billboard.id,
      title: booking.billboard.title,
      location: booking.billboard.location,
      lat: booking.billboard.lat,
      lng: booking.billboard.lng,
      type: booking.billboard.type,
      pricePerWeek: booking.billboard.price_per_week,
    },
    startDate: booking.start_date,
    endDate: booking.end_date,
    totalPrice: booking.total_price,
    status: booking.status,
    payment: booking.payment ? mapPayment(booking.payment) : null,
    updatesCount: booking.updates_count ?? 0,
    pendingApprovals: booking.pending_approvals ?? 0,
    latestUpdate: booking.latest_update
      ? { stage: booking.latest_update.stage, createdAt: booking.latest_update.created_at }
      : null,
    createdAt: booking.created_at,
  };
}

export async function fetchMyBookings() {
  const { data } = await apiFetch('/api/my/bookings');
  return data.map(mapBooking);
}

export async function cancelMyBooking(id) {
  const { data } = await apiFetch(`/api/bookings/${id}/cancel`, { method: 'PATCH' });
  return mapBooking(data);
}

// ---- Campaign progress tracker (Glovo-style delivery timeline per booking) ----

function mapBookingUpdate(update) {
  return {
    id: update.id,
    stage: update.stage,
    message: update.message,
    photos: update.photos || [],
    requiresApproval: update.requires_approval,
    clientReaction: update.client_reaction,
    clientComment: update.client_comment,
    author: update.author || null,
    createdAt: update.created_at,
  };
}

export async function fetchBookingProgress(bookingId) {
  const { data } = await apiFetch(`/api/bookings/${bookingId}/updates`);
  return data.map(mapBookingUpdate);
}

// reaction: 'approved' | 'liked' | 'changes_requested' (+ optional comment).
export async function reactToBookingUpdate(updateId, payload) {
  const { data } = await apiFetch(`/api/booking-updates/${updateId}/react`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return mapBookingUpdate(data);
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

// ---------------------------------------------------------------------------
// Tangazaa Partner — the lightweight ERP for billboard companies (owner/admin).
// ---------------------------------------------------------------------------

export async function fetchPartnerOverview() {
  const { stats, billboards, activity } = await apiFetch('/api/partner/overview');
  return {
    stats: {
      billboards: stats.billboards,
      online: stats.online,
      offline: stats.offline,
      maintenance: stats.maintenance,
      occupiedToday: stats.occupied_today,
      availableToday: stats.available_today,
      occupancyPct: stats.occupancy_pct,
      activeBookings: stats.active_bookings,
      endingSoon: stats.ending_soon,
      upcomingInstallations: stats.upcoming_installations,
      confirmedRevenue: stats.confirmed_revenue,
      contacts: stats.contacts,
      openArtworks: stats.open_artworks,
      openWorkOrders: stats.open_work_orders,
    },
    billboards: billboards.map((board) => ({
      id: board.id,
      title: board.title,
      location: board.location,
      lat: board.lat,
      lng: board.lng,
      size: board.size,
      pricePerWeek: board.price_per_week,
      isActive: board.is_active,
      channel: board.channel || 'online',
      underMaintenance: board.under_maintenance ?? false,
      occupied: board.occupied,
      currentBooking: board.current_booking
        ? {
            startDate: board.current_booking.start_date,
            endDate: board.current_booking.end_date,
            source: board.current_booking.source,
            advertiser: board.current_booking.advertiser,
          }
        : null,
      nextAvailableFrom: board.next_available_from,
    })),
    activity: (activity || []).map((item) => ({
      type: item.type,
      title: item.title,
      detail: item.detail,
      at: item.at,
    })),
  };
}

function mapContact(contact) {
  return {
    id: contact.id,
    name: contact.name,
    company: contact.company,
    email: contact.email,
    phone: contact.phone,
    notes: contact.notes,
    bookingsCount: contact.bookings_count ?? 0,
    artworksCount: contact.artworks_count ?? 0,
    createdAt: contact.created_at,
  };
}

export async function fetchPartnerContacts(params = {}) {
  const { data } = await apiFetch(`/api/partner/contacts${toQueryString(params)}`);
  return data.map(mapContact);
}

export async function createPartnerContact(payload) {
  const { data } = await apiFetch('/api/partner/contacts', { method: 'POST', body: JSON.stringify(payload) });
  return mapContact(data);
}

export async function updatePartnerContact(id, payload) {
  const { data } = await apiFetch(`/api/partner/contacts/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  return mapContact(data);
}

export async function deletePartnerContact(id) {
  await apiFetch(`/api/partner/contacts/${id}`, { method: 'DELETE' });
}

function mapArtwork(artwork) {
  return {
    id: artwork.id,
    title: artwork.title,
    status: artwork.status,
    dueDate: artwork.due_date,
    fileName: artwork.file_name,
    notes: artwork.notes,
    contact: artwork.contact || null,
    billboard: artwork.billboard || null,
    createdAt: artwork.created_at,
  };
}

export async function fetchPartnerArtworks(params = {}) {
  const { data } = await apiFetch(`/api/partner/artworks${toQueryString(params)}`);
  return data.map(mapArtwork);
}

export async function createPartnerArtwork(payload) {
  const { data } = await apiFetch('/api/partner/artworks', { method: 'POST', body: JSON.stringify(payload) });
  return mapArtwork(data);
}

export async function updatePartnerArtwork(id, payload) {
  const { data } = await apiFetch(`/api/partner/artworks/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
  return mapArtwork(data);
}

export async function deletePartnerArtwork(id) {
  await apiFetch(`/api/partner/artworks/${id}`, { method: 'DELETE' });
}

function mapWorkOrder(order) {
  return {
    id: order.id,
    type: order.type,
    status: order.status,
    assigneeName: order.assignee_name,
    scheduledFor: order.scheduled_for,
    notes: order.notes,
    completedAt: order.completed_at,
    billboard: order.billboard || null,
    artwork: order.artwork || null,
    createdAt: order.created_at,
  };
}

export async function fetchPartnerWorkOrders(params = {}) {
  const { data } = await apiFetch(`/api/partner/work-orders${toQueryString(params)}`);
  return data.map(mapWorkOrder);
}

export async function createPartnerWorkOrder(payload) {
  const { data } = await apiFetch('/api/partner/work-orders', { method: 'POST', body: JSON.stringify(payload) });
  return mapWorkOrder(data);
}

export async function updatePartnerWorkOrder(id, payload) {
  const { data } = await apiFetch(`/api/partner/work-orders/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
  return mapWorkOrder(data);
}

export async function deletePartnerWorkOrder(id) {
  await apiFetch(`/api/partner/work-orders/${id}`, { method: 'DELETE' });
}

function mapPartnerBooking(booking) {
  return {
    id: booking.id,
    billboard: booking.billboard,
    customer: booking.customer || null,
    contact: booking.contact || null,
    startDate: booking.start_date,
    endDate: booking.end_date,
    totalPrice: booking.total_price,
    status: booking.status,
    source: booking.source || 'app',
    payment: booking.payment ? mapPayment(booking.payment) : null,
    stages: (booking.stages || []).map((stage) => ({
      stage: stage.stage,
      substatus: stage.substatus,
      assignedTo: stage.assigned_to,
      completedAt: stage.completed_at,
    })),
    createdAt: booking.created_at,
  };
}

export async function fetchPartnerBookings(params = {}) {
  const { data } = await apiFetch(`/api/partner/bookings${toQueryString(params)}`);
  return data.map(mapPartnerBooking);
}

export async function createOfflineBooking(payload) {
  const { data } = await apiFetch('/api/partner/offline-bookings', { method: 'POST', body: JSON.stringify(payload) });
  return mapPartnerBooking(data);
}

// ---- Booking pipeline (the ERP's 7-stage package-tracking view) ----

export async function fetchPartnerBooking(id) {
  const { data, payments } = await apiFetch(`/api/partner/bookings/${id}`);
  return { booking: mapPartnerBooking(data), payments: (payments || []).map(mapPayment) };
}

function mapPipelineStage(stage) {
  return {
    stage: stage.stage,
    label: stage.label,
    applicable: stage.applicable,
    substatuses: stage.substatuses || [],
    substatus: stage.substatus,
    note: stage.note,
    photos: stage.photos || [],
    assignedTo: stage.assigned_to || null,
    completedAt: stage.completed_at,
  };
}

export async function fetchBookingPipeline(bookingId) {
  const { stages, team } = await apiFetch(`/api/partner/bookings/${bookingId}/pipeline`);
  return { stages: stages.map(mapPipelineStage), team: team || [] };
}

// Partial update: only append the fields the caller actually set. FormData
// throughout because stages accept photo uploads.
export async function updateBookingStage(bookingId, stage, { completed, substatus, note, assignedTo, photos } = {}) {
  const form = new FormData();
  if (completed !== undefined) form.append('completed', completed ? '1' : '0');
  if (substatus !== undefined) form.append('substatus', substatus ?? '');
  if (note !== undefined) form.append('note', note ?? '');
  if (assignedTo !== undefined) form.append('assigned_to', assignedTo ?? '');
  (photos || []).forEach((file) => form.append('photos[]', file));

  const { stages } = await apiFetch(`/api/partner/bookings/${bookingId}/pipeline/${stage}`, {
    method: 'POST',
    body: form,
  });
  return stages.map(mapPipelineStage);
}

export async function fetchPartnerAnalytics() {
  const data = await apiFetch('/api/partner/analytics');
  return {
    stats: {
      occupancyRate: data.stats.occupancy_rate,
      avgDurationDays: data.stats.avg_duration_days,
      avgLeadTimeDays: data.stats.avg_lead_time_days,
      conversionRate: data.stats.conversion_rate,
      appRevenue: data.stats.app_revenue,
      offlineRevenue: data.stats.offline_revenue,
    },
    revenueByMonth: data.revenue_by_month,
    revenueByBillboard: data.revenue_by_billboard,
    mostBookedLocations: data.most_booked_locations,
    insights: data.insights,
  };
}

export async function fetchPartnerContactDetail(id) {
  const { contact, bookings, summary } = await apiFetch(`/api/partner/contacts/${id}`);
  return {
    contact: contact.data ?? contact,
    bookings: (bookings.data ?? bookings).map(mapPartnerBooking),
    summary: {
      revenue: summary.revenue,
      currentCampaigns: summary.current_campaigns,
      pastCampaigns: summary.past_campaigns,
      outstanding: summary.outstanding,
    },
  };
}

// ---- Chat Centre (one conversation per booking) ----

function mapChatMessage(message) {
  return {
    id: message.id,
    body: message.body,
    attachments: message.attachments || [],
    sender: message.sender?.name || null,
    fromCustomer: message.from_customer,
    mine: message.mine,
    createdAt: message.created_at,
  };
}

function buildMessageForm({ body, attachments }) {
  const form = new FormData();
  if (body) form.append('body', body);
  (attachments || []).forEach((file) => form.append('attachments[]', file));
  return form;
}

export async function fetchPartnerChats() {
  const { data } = await apiFetch('/api/partner/chats');
  return data.map((chat) => ({
    bookingId: chat.booking_id,
    billboard: chat.billboard,
    advertiser: chat.advertiser,
    source: chat.source,
    messagesCount: chat.messages_count,
    latest: chat.latest
      ? { body: chat.latest.body, fromCustomer: chat.latest.from_customer, at: chat.latest.at }
      : null,
  }));
}

export async function fetchPartnerChatMessages(bookingId) {
  const { data } = await apiFetch(`/api/partner/bookings/${bookingId}/messages`);
  return data.map(mapChatMessage);
}

export async function sendPartnerChatMessage(bookingId, payload) {
  const { data } = await apiFetch(`/api/partner/bookings/${bookingId}/messages`, {
    method: 'POST',
    body: buildMessageForm(payload),
  });
  return mapChatMessage(data);
}

export async function fetchMyChats() {
  const { data } = await apiFetch('/api/my/chats');
  return data.map((chat) => ({
    bookingId: chat.booking_id,
    billboard: chat.billboard,
    company: chat.company,
    latest: chat.latest
      ? { body: chat.latest.body, fromCustomer: chat.latest.from_customer, at: chat.latest.at }
      : null,
  }));
}

export async function fetchBookingMessages(bookingId) {
  const { data } = await apiFetch(`/api/bookings/${bookingId}/messages`);
  return data.map(mapChatMessage);
}

export async function sendBookingMessage(bookingId, payload) {
  const { data } = await apiFetch(`/api/bookings/${bookingId}/messages`, {
    method: 'POST',
    body: buildMessageForm(payload),
  });
  return mapChatMessage(data);
}

export async function fetchPartnerReminders() {
  const { data } = await apiFetch('/api/partner/reminders');
  return data.map((item) => ({
    type: item.type,
    bookingId: item.booking_id,
    title: item.title,
    detail: item.detail,
  }));
}

// ---- Campaign progress updates (partner side: post the Glovo-style timeline) ----

export async function fetchPartnerBookingUpdates(bookingId) {
  const { data } = await apiFetch(`/api/partner/bookings/${bookingId}/updates`);
  return data.map(mapBookingUpdate);
}

export async function createPartnerBookingUpdate(bookingId, { stage, message, requiresApproval, photos }) {
  const form = new FormData();
  form.append('stage', stage);
  if (message) form.append('message', message);
  form.append('requires_approval', requiresApproval ? '1' : '0');
  (photos || []).forEach((file) => form.append('photos[]', file));

  const { data } = await apiFetch(`/api/partner/bookings/${bookingId}/updates`, {
    method: 'POST',
    body: form,
  });
  return mapBookingUpdate(data);
}

export async function deletePartnerBookingUpdate(updateId) {
  await apiFetch(`/api/partner/booking-updates/${updateId}`, { method: 'DELETE' });
}

// ---- Workspace settings (owner-only: pricing, lead times, payout) ----

export async function fetchPartnerSettings() {
  const { data } = await apiFetch('/api/partner/settings');
  return data;
}

export async function updatePartnerSettings(payload) {
  const { data } = await apiFetch('/api/partner/settings', { method: 'PUT', body: JSON.stringify(payload) });
  return data;
}

export async function uploadPartnerLogo(file) {
  const form = new FormData();
  form.append('logo', file);
  const { data } = await apiFetch('/api/partner/settings/logo', { method: 'POST', body: form });
  return data;
}

// ---- Team management (owner creates staff logins; staff never self-register) ----

function mapStaffMember(member) {
  return {
    id: member.id,
    name: member.name,
    email: member.email,
    isSuspended: member.is_suspended,
    createdAt: member.created_at,
  };
}

export async function fetchPartnerTeam() {
  const { data } = await apiFetch('/api/partner/team');
  return data.map(mapStaffMember);
}

export async function createPartnerStaff(payload) {
  const { data } = await apiFetch('/api/partner/team', { method: 'POST', body: JSON.stringify(payload) });
  return mapStaffMember(data);
}

export async function deletePartnerStaff(id) {
  await apiFetch(`/api/partner/team/${id}`, { method: 'DELETE' });
}

// ---- In-app notifications (any signed-in user) ----

export async function fetchNotifications() {
  const response = await apiFetch('/api/notifications');
  return {
    items: response.data.map((notification) => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      readAt: notification.read_at,
      createdAt: notification.created_at,
    })),
    unreadCount: response.unread_count ?? 0,
  };
}

export async function markNotificationRead(id) {
  await apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
}

export async function markAllNotificationsRead() {
  await apiFetch('/api/notifications/read-all', { method: 'PATCH' });
}

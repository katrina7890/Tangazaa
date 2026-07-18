export function dashboardPathForRole(role) {
  if (role === 'admin') return '/admin';
  if (role === 'owner') return '/owner';
  if (role === 'customer') return '/dashboard';
  // Company employees live in the Partner workspace — they have no owner dashboard.
  if (role === 'staff') return '/partner';
  return '/map';
}

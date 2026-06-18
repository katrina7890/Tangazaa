export function dashboardPathForRole(role) {
  if (role === 'admin') return '/admin';
  if (role === 'owner') return '/owner';
  if (role === 'customer') return '/dashboard';
  return '/map';
}

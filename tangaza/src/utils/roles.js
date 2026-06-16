export function dashboardPathForRole(role) {
  if (role === 'admin') return '/admin';
  if (role === 'owner') return '/owner';
  return '/map';
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/AuthLayout';
import { useAuth } from '../../context/AuthContext';
import { AuthField, LockIcon, MailIcon } from '../LoginPage';
import { dashboardPathForRole } from '../../utils/roles';

/**
 * Dedicated door into Tangazaa Partner for billboard company teams — owners
 * and the staff accounts they create. Same session backend as the main login;
 * only the destination and branding differ. Staff have no self-signup: their
 * owner creates their credentials on the Partner Team page.
 */
export default function PartnerLoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setNotice('');
    setSubmitting(true);
    try {
      const loggedInUser = await login({ email, password });
      const partnerRoles = ['owner', 'admin', 'staff'];
      navigate(
        partnerRoles.includes(loggedInUser.role) ? '/partner' : dashboardPathForRole(loggedInUser.role)
      );
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout image="/billboard-auth.jpg">
      <p className="text-center font-display text-xl tracking-wide text-forest">
        TANGAZAA<span className="text-gold-dark"> PARTNER</span>
      </p>
      <h1 className="mt-3 text-center font-serif text-3xl font-semibold text-forest">Team sign in</h1>
      <p className="mt-2 text-center text-stone-600">
        For billboard companies — owners and their staff
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <AuthField
          icon={<MailIcon />}
          type="email"
          placeholder="Work email"
          value={email}
          onChange={setEmail}
        />
        <AuthField
          icon={<LockIcon />}
          type="password"
          placeholder="Password"
          value={password}
          onChange={setPassword}
        />

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-forest px-4 py-3 font-bold uppercase tracking-wide text-cream transition hover:bg-forest-soft disabled:opacity-60"
        >
          {submitting ? 'Signing in…' : 'Enter workspace'}
        </button>
      </form>

      {notice && <p className="mt-4 text-center text-sm text-amber-700">{notice}</p>}

      <p className="mt-6 text-center text-sm text-stone-600">
        Staff accounts are created by your company owner on the Team page.
      </p>
      <p className="mt-2 text-center text-sm text-stone-600">
        Booking a billboard instead?{' '}
        <Link to="/login" className="font-semibold text-gold-dark hover:underline">
          Customer sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import GoogleIcon from '../components/GoogleIcon';
import { useAuth } from '../context/AuthContext';
import { dashboardPathForRole } from '../utils/roles';
import { AuthField, LockIcon, MailIcon } from './LoginPage';

const ROLES = [
  { value: 'customer', label: 'Booking a Billboard' },
  { value: 'owner', label: 'Listing a Billboard' },
];

export default function SignupPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState('customer');
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setNotice('');
    setSubmitting(true);
    try {
      const registeredUser = await register({
        company_name: companyName,
        name: contactPerson,
        email,
        password,
        role,
      });
      navigate(dashboardPathForRole(registeredUser.role));
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout image="/billboard-mockup.jpg">
      <h1 className="text-center font-serif text-3xl font-semibold text-forest">Create account</h1>
      <p className="mt-2 text-center text-stone-600">
        {role === 'owner'
          ? 'Register your company to start listing billboards'
          : 'Register your company to start booking billboards'}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-sand p-1">
        {ROLES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setRole(option.value)}
            className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
              role === option.value ? 'bg-gold text-forest shadow-sm' : 'text-stone-600 hover:text-forest'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setNotice("Google sign-up isn't connected yet — the API is still being wired up.")}
        className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-sand px-4 py-3 font-medium text-stone-800 transition hover:bg-sand-dark"
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-sand-dark" />
        <span className="text-sm text-stone-500">or</span>
        <span className="h-px flex-1 bg-sand-dark" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField
          icon={<BuildingIcon />}
          type="text"
          placeholder="Company name"
          value={companyName}
          onChange={setCompanyName}
        />
        <AuthField
          icon={<PersonIcon />}
          type="text"
          placeholder="Contact person"
          value={contactPerson}
          onChange={setContactPerson}
        />
        <AuthField
          icon={<MailIcon />}
          type="email"
          placeholder="Email address"
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
          className="flex w-full items-center justify-center gap-2 rounded-full bg-gold px-4 py-3 font-bold uppercase tracking-wide text-forest transition hover:bg-gold-soft disabled:opacity-60"
        >
          {submitting ? 'Creating account…' : 'Create account'}
          <ArrowIcon />
        </button>
      </form>

      {notice && <p className="mt-4 text-center text-sm text-amber-700">{notice}</p>}

      <p className="mt-6 text-center text-stone-600">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-gold-dark hover:underline">
          Sign In
        </Link>
      </p>
    </AuthLayout>
  );
}

function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <rect x="4" y="2" width="16" height="20" rx="1" />
      <path d="M9 22v-4h6v4M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

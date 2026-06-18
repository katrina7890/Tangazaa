import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import GoogleIcon from '../components/GoogleIcon';
import { useAuth } from '../context/AuthContext';
import { dashboardPathForRole } from '../utils/roles';

export default function LoginPage() {
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
      navigate(dashboardPathForRole(loggedInUser.role));
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout image="/billboard-auth.jpg">
      <h1 className="text-center font-serif text-3xl font-semibold text-forest">Welcome back</h1>
      <p className="mt-2 text-center text-stone-600">Sign in to manage your campaigns</p>

      <button
        type="button"
        onClick={() => setNotice("Google sign-in isn't connected yet — the API is still being wired up.")}
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
          {submitting ? 'Signing in…' : 'Sign in'}
          <ArrowIcon />
        </button>
      </form>

      {notice && <p className="mt-4 text-center text-sm text-amber-700">{notice}</p>}

      <p className="mt-6 text-center text-stone-600">
        Don&apos;t have an account?{' '}
        <Link to="/signup" className="font-semibold text-gold-dark hover:underline">
          Sign Up
        </Link>
      </p>
    </AuthLayout>
  );
}

export function AuthField({ icon, type, placeholder, value, onChange }) {
  return (
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700">{icon}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-2xl bg-sand py-3 pl-11 pr-4 text-stone-800 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-gold"
      />
    </div>
  );
}

export function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M2 6l10 7 10-7" />
    </svg>
  );
}

export function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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

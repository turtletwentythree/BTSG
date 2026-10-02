import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../store.jsx';

export default function Login() {
  const { user, loading, login } = useApp();
  const [params] = useSearchParams();
  const [err, setErr] = useState('');
  if (loading) return null;
  if (user) return <Navigate to="/all-type-request" replace />;
  const go = (p) => login(p).catch((e) => setErr(e.message));
  const ERRORS = {
    denied: 'This account is not allowed to use this system. Please contact the administrator.',
    cancelled: 'Sign-in was cancelled.',
    not_configured: 'This sign-in method is not set up yet.',
    email: 'Your account has no verified email address.',
    state: 'The sign-in session expired. Please try again.',
    token: 'Sign-in could not be verified. Please try again.',
    failed: 'Sign-in failed. Please try again.',
  };
  const message = err || (params.get('error') && (ERRORS[params.get('error')] || ERRORS.failed));
  return (
    <div className="login-page">
      <div className="login-box">
        <h1>Welcome to Legal Request Form</h1>
        <h1>Log in to your account</h1>
        <div className="login-btns">
          <button className="login-btn" onClick={() => go('google')}>
            <svg width="34" height="34" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/>
              <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"/>
              <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/>
            </svg>
            <span>Login with Google</span>
          </button>
          <button className="login-btn" onClick={() => go('microsoft')}>
            <svg width="30" height="30" viewBox="0 0 24 24">
              <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
              <rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
              <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
              <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
            </svg>
            <span>Login with Microsoft 365</span>
          </button>
        </div>
        {message && <p className="login-error" role="alert">{message}</p>}
      </div>
    </div>
  );
}

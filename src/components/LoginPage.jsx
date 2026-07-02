import { useState } from 'react';

function LoginPage({ onLogin, onSignup }) {
  const [mode, setMode] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function resetForm() {
    setName('');
    setEmail('');
    setPassword('');
    setError('');
  }

  function handleMode(newMode) {
    setMode(newMode);
    resetForm();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      return;
    }

    if (mode === 'login') {
      const message = await onLogin({ email: email.trim(), password: password.trim() });
      if (message) setError(message);
      return;
    }

    if (mode === 'signup') {
      if (!name.trim()) {
        setError('Name is required.');
        return;
      }
      const message = await onSignup({
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
      });
      if (message) setError(message);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>{mode === 'login' ? 'Log in' : mode === 'signup' ? 'Sign up' : 'Welcome'}</h2>
        {mode ? (
          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <label>
                Name
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </label>
            )}

            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a password"
              />
            </label>
            {mode === 'signup' && (
              <p className="auth-note">Password must be at least 8 characters and include uppercase, lowercase, number, and special character.</p>
            )}

            {error && <div className="auth-error">{error}</div>}

            <div className="auth-actions">
              <button type="button" className="auth-secondary" onClick={() => handleMode(null)}>
                Back
              </button>
              <button type="submit" className="auth-primary">
                {mode === 'login' ? 'Sign in' : 'Create account'}
              </button>
            </div>
          </form>
        ) : (
          <div className="auth-options">
            <button className="auth-primary" onClick={() => handleMode('login')}>
              Log in
            </button>
            <button className="auth-secondary" onClick={() => handleMode('signup')}>
              Sign up
            </button>
          </div>
        )}

        {mode === 'login' ? (
          <p className="auth-hint">Need a new account? Sign up instead.</p>
        ) : mode === 'signup' ? (
          <p className="auth-hint">Already registered? Log in instead.</p>
        ) : (
          <p className="auth-hint">Choose an option to continue.</p>
        )}
      </div>
    </div>
  );
}

export default LoginPage;

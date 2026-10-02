import { createContext, useContext, useEffect, useState } from 'react';

const Ctx = createContext(null);

export function AppProvider({ children }) {
  const [state, setState] = useState({ loading: true, user: null, providers: {}, demo: false });

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setState({ loading: false, user: d.user, providers: d.providers || {}, demo: !!d.demo }))
      .catch(() => setState((s) => ({ ...s, loading: false })));
  }, []);

  // provider sign-in leaves the page (OAuth redirect); demo sign-in is a plain API call
  const login = async (provider) => {
    if (state.providers[provider]) { window.location.assign('/auth/' + provider); return; }
    if (!state.demo) throw new Error('Sign-in with ' + provider + ' is not set up yet.');
    const r = await fetch('/api/auth/demo', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Demo User' }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Sign-in failed');
    setState((s) => ({ ...s, user: d.user }));
  };
  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setState((s) => ({ ...s, user: null }));
  };
  return <Ctx.Provider value={{ ...state, login, logout }}>{children}</Ctx.Provider>;
}
export const useApp = () => useContext(Ctx);

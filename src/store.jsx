import { createContext, useContext, useEffect, useState } from 'react';
import { setApiUser } from './api';

const Ctx = createContext(null);
const load = () => { try { return JSON.parse(localStorage.getItem('lrs_user')); } catch { return null; } };

export function AppProvider({ children }) {
  const [user, setUser] = useState(load);
  setApiUser(user?.name);
  useEffect(() => { try { localStorage.setItem('lrs_user', JSON.stringify(user)); } catch {} }, [user]);
  const login = (provider) => setUser({ name: 'Thotsaporn Phupha', provider });
  const logout = () => setUser(null);
  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}
export const useApp = () => useContext(Ctx);

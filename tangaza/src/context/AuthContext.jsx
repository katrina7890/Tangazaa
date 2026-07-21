import { createContext, useContext, useEffect, useState } from 'react';
import { fetchCurrentUser, login as apiLogin, logout as apiLogout, registerAccount } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(credentials) {
    const loggedInUser = await apiLogin(credentials);
    setUser(loggedInUser);
    return loggedInUser;
  }

  async function register(payload) {
    const registeredUser = await registerAccount(payload);
    setUser(registeredUser);
    return registeredUser;
  }

  async function logout() {
    await apiLogout();
    setUser(null);
  }

  /**
   * Re-read the session. Needed when something changes the user outside this
   * tab — confirming an email link, for instance — or after a profile save.
   */
  async function refreshUser() {
    const current = await fetchCurrentUser();
    setUser(current);
    return current;
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

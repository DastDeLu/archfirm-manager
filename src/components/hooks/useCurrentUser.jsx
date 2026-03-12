import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const OWNER_EMAIL = 'dastdelu@gmail.com';

export function useCurrentUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then((u) => {
      setUser(u);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const isSviluppatore = user?.role === 'Sviluppatore' || user?.email === OWNER_EMAIL;
  const isCliente = !isSviluppatore;

  // Returns filter object to be used in entity queries
  const dataFilter = isCliente && user ? { created_by: user.email } : {};

  return { user, loading, isSviluppatore, isCliente, dataFilter };
}
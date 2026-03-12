import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const OWNER_EMAIL = 'dastdelu@gmail.com';

export function useCurrentUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        let u = await base44.auth.me();
        if (u && !u.role) {
          const newRole = u.email === OWNER_EMAIL ? 'Sviluppatore' : 'Cliente';
          await base44.auth.updateMe({ role: newRole });
          u = { ...u, role: newRole };
        }
        if (u?.email === OWNER_EMAIL && u?.role !== 'Sviluppatore') {
          await base44.auth.updateMe({ role: 'Sviluppatore' });
          u = { ...u, role: 'Sviluppatore' };
        }
        setUser(u);
      } catch (e) {
        // not authenticated
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const isSviluppatore = user?.role === 'Sviluppatore' || user?.email === OWNER_EMAIL;
  const isCliente = !isSviluppatore;

  // Returns filter object to be used in entity queries
  const dataFilter = isCliente && user ? { created_by: user.email } : {};

  return { user, loading, isSviluppatore, isCliente, dataFilter };
}
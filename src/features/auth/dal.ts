import 'server-only';

import { cache } from 'react';
import { redirect } from 'next/navigation';

import { createClient } from '@shared/lib/supabase/server';
import { isAdmin } from '@features/auth/types';

export const oturumuDogrula = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  return user;
});

export const adminOturumunuDogrula = cache(async () => {
  const user = await oturumuDogrula();
  if (!isAdmin(user)) redirect('/editor');
  return user;
});

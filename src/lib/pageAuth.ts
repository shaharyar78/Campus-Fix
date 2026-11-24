import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { UserProfile, UserRole } from '@/types';

export async function requirePageAuth(allowedRoles?: UserRole[]): Promise<UserProfile> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/login');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    redirect('/account/pending');
  }

  const typedProfile = profile as UserProfile;

  if (typedProfile.approval_status === 'pending') {
    redirect('/account/pending');
  }

  if (typedProfile.approval_status === 'rejected') {
    redirect('/account/rejected');
  }

  if (typedProfile.approval_status !== 'approved') {
    redirect('/account/pending');
  }

  if (allowedRoles && !allowedRoles.includes(typedProfile.role)) {
    if (typedProfile.role === 'super_admin') {
      redirect('/super-admin');
    }
    if (typedProfile.role === 'admin') {
      redirect('/admin');
    }
    redirect('/dashboard');
  }

  return typedProfile;
}

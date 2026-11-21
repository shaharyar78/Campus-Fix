import { College } from '@/types';

export function getCollegeBySlug(slug: string, colleges: College[] = []): College | undefined {
  return colleges.find((college) => college.slug.toLowerCase() === slug.toLowerCase());
}

export function formatCollegeName(college: College | null | undefined): string {
  return college?.name || 'Your campus';
}

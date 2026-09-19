import { Metadata } from 'next';
import { ScaldCoffee3DExperience } from '@/components/scald/ScaldCoffee3DExperience';

export const metadata: Metadata = {
  title: 'Scald Coffee & Patisserie · 3D Specialty Coffee Experience',
  description: 'Kadıköy Yeldeğirmeni nitelikli kahve, artisan fırın ve 3D fincan deneyimi. APEX Kreatif tarafından hazırlanmıştır.',
};

export default function ScaldShortAliasPage() {
  return <ScaldCoffee3DExperience />;
}

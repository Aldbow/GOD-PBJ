import { LandingHeader } from './LandingHeader';
import { LandingHero } from './LandingHero';
import { LandingFeatures } from './LandingFeatures';
import { LandingFooter } from './LandingFooter';

export function LandingView() {
  return (
    <div>
      <LandingHeader />
      <LandingHero />
      <LandingFeatures />
      <LandingFooter />
    </div>
  );
}

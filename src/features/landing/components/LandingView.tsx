import { LandingHeader } from './LandingHeader';
import { LandingHero } from './LandingHero';
import { LandingFeatures } from './LandingFeatures';
import { LandingAbout } from './LandingAbout';
import { LandingFooter } from './LandingFooter';

export function LandingView() {
  return (
    <div>
      <LandingHeader />
      <LandingHero />
      <LandingFeatures />
      <LandingAbout />
      <LandingFooter />
    </div>
  );
}

import { LandingIntro } from './LandingIntro';
import { LandingHeader } from './LandingHeader';
import { LandingHero } from './LandingHero';
import { LandingFeatures } from './LandingFeatures';
import { LandingFooter } from './LandingFooter';

export function LandingView() {
  return (
    <LandingIntro>
      <LandingHeader />
      <LandingHero />
      <LandingFeatures />
      <LandingFooter />
    </LandingIntro>
  );
}

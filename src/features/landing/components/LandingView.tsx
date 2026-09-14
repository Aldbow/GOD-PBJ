import { LandingIntro } from './LandingIntro';
import { LandingHeader } from './LandingHeader';
import { LandingHero } from './LandingHero';
import { LandingFooter } from './LandingFooter';

export function LandingView() {
  return (
    <LandingIntro>
      <LandingHeader />
      <LandingHero />
      <LandingFooter />
    </LandingIntro>
  );
}

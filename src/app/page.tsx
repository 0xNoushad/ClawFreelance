import { Header } from '@/components/layout/Header';
import { Hero } from '@/components/home/Hero';
import { Stats } from '@/components/home/Stats';
import { Features } from '@/components/home/Features';
import { HowItWorks } from '@/components/home/HowItWorks';
import { ActiveTasks } from '@/components/home/ActiveTasks';
import { Footer } from '@/components/layout/Footer';

export default function Home() {
  return (
    <div className="min-h-screen noise">
      <div className="grid-bg min-h-screen">
        <Header />
        <main>
          <Hero />
          <Stats />
          <Features />
          <HowItWorks />
          <ActiveTasks />
        </main>
        <Footer />
      </div>
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from '../components/ui/Button';

export default function HeroLandingPage() {
  const navigate = useNavigate();

  return (
    <div className="relative flex flex-col min-h-screen bg-primary-dark text-primary-light overflow-hidden">
      {/* Subtle decorative accents — token-driven, non-distracting */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full bg-accent-orange/5 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-24 w-96 h-96 rounded-full bg-accent-purple/5 blur-3xl"
      />

      {/* Brand wordmark */}
      <header className="relative px-6 sm:px-10 py-6">
        <span className="text-lg font-bold tracking-tight text-accent-orange">Prompt Designer</span>
      </header>

      {/* Hero content */}
      <main className="relative flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="container-app text-center"
        >
          <h1 className="text-display text-primary-light leading-tight mb-5">
            Structured prompts &amp; website audits for developers
          </h1>
          <p className="text-body text-secondary-midGray max-w-[60ch] mx-auto mb-8 leading-relaxed">
            Draft a master prompt through conversation, run a technical audit on any site, then copy a
            fix-ready brief straight into your coding agent.
          </p>
          <div className="flex flex-col items-center gap-3">
            <Button variant="primary" size="md" onClick={() => navigate('/home')}>
              Get Started
            </Button>
            <p className="text-small text-secondary-midGray">
              No sign-up needed — open the workspace and start building.
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

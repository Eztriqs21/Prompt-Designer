import { motion } from 'framer-motion';
import Navbar from '../components/layout/Navbar';
import MasterPromptSection from '../components/masterPrompt/MasterPromptSection';
import { useReducedMotionSafe } from '../hooks/useReducedMotionSafe';
import { fadeInUp, transitionEnter } from '../motion/presets';

export default function HomePage() {
  const reducedMotion = useReducedMotionSafe();

  return (
    <motion.div
      initial={reducedMotion ? false : 'hidden'}
      animate="visible"
      variants={fadeInUp}
      transition={reducedMotion ? { duration: 0 } : transitionEnter}
      className="min-h-screen bg-black text-white"
    >
      {/* Clean gradient background */}
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-[#08080c] via-[#050508] to-black" />

      {/* Content */}
      <div className="relative z-10">
        <Navbar />

        {/* Workspace — the entire product */}
        <main className="px-4 sm:px-6 lg:px-8 pt-6 pb-20">
          <div className="max-w-5xl mx-auto">
            <MasterPromptSection />
          </div>
        </main>
      </div>
    </motion.div>
  );
}

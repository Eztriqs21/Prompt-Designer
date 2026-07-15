import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe';
import { navSlideDown, transitionEnter } from '../../motion/presets';

export default function Navbar() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const reducedMotion = useReducedMotionSafe();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.nav
      className="relative z-20 px-6 pt-5"
      initial={reducedMotion ? false : 'hidden'}
      animate="visible"
      variants={navSlideDown}
      transition={reducedMotion ? { duration: 0 } : transitionEnter}
    >
      <div className="flex justify-center">
        <div
          className={`liquid-glass rounded-full px-6 py-3 flex items-center justify-between w-full max-w-3xl transition-all duration-200 ${
            scrolled ? 'bg-black/60 backdrop-blur-xl' : ''
          }`}
        >
          <Link to="/" className="flex items-center gap-2.5">
            <Globe className="h-5 w-5 text-white" />
            <span className="text-lg font-semibold text-white" style={{ fontFamily: "'Instrument Serif', serif" }}>
              Prompt Designer
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {isHome ? (
              <>
                <motion.button
                  whileHover={reducedMotion ? {} : { y: -1 }}
                  onClick={() => document.getElementById('tool')?.scrollIntoView({ behavior: 'smooth' })}
                  className="text-[13px] font-medium text-white/60 hover:text-white transition-colors"
                >
                  Features
                </motion.button>
                <motion.button
                  whileHover={reducedMotion ? {} : { y: -1 }}
                  onClick={() => document.getElementById('tool')?.scrollIntoView({ behavior: 'smooth' })}
                  className="text-[13px] font-medium text-white/60 hover:text-white transition-colors"
                >
                  How it works
                </motion.button>
              </>
            ) : (
              <Link
                to="/"
                className="text-[13px] font-medium text-white/60 hover:text-white transition-colors"
              >
                Home
              </Link>
            )}
            <Link
              to="/history"
              className={`text-[13px] font-medium transition-colors ${
                location.pathname === '/history' ? 'text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              History
            </Link>
          </div>

          <div className="md:hidden flex items-center gap-4">
            <Link
              to="/"
              className={`text-[13px] font-medium transition-colors ${
                isHome ? 'text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              Home
            </Link>
            <Link
              to="/history"
              className={`text-[13px] font-medium transition-colors ${
                location.pathname === '/history' ? 'text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              History
            </Link>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}

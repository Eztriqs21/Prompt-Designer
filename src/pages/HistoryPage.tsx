import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Trash2, ChevronDown, FileText, Loader2 } from 'lucide-react';
import { getPrompts, deletePrompt } from '../lib/apiClient';
import { useReducedMotionSafe } from '../hooks/useReducedMotionSafe';
import {
  fadeInUp,
  staggerContainer,
  expandCollapse,
  transitionEnter,
} from '../motion/presets';
import type { SavedPrompt } from '../types';

export default function HistoryPage() {
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const reducedMotion = useReducedMotionSafe();

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPrompts();
      setPrompts(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (prompt: SavedPrompt) => {
    try {
      await navigator.clipboard.writeText(prompt.masterPrompt);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = prompt.masterPrompt;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedId(prompt.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePrompt(id);
      setPrompts((prev) => prev.filter((p) => p.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <motion.div
      initial={reducedMotion ? false : 'hidden'}
      animate="visible"
      variants={fadeInUp}
      transition={reducedMotion ? { duration: 0 } : transitionEnter}
      className="min-h-screen bg-black text-white relative overflow-hidden"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-20">
        {/* Header */}
        <motion.div
          variants={staggerContainer}
          {...(reducedMotion ? {} : { initial: 'hidden', animate: 'visible' })}
          className="text-center mb-12"
        >
          <motion.h1
            variants={fadeInUp}
            transition={reducedMotion ? { duration: 0 } : transitionEnter}
            className="text-3xl md:text-4xl text-white tracking-tight"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Prompt History
          </motion.h1>
          <motion.p
            variants={fadeInUp}
            transition={reducedMotion ? { duration: 0 } : transitionEnter}
            className="mt-2 text-sm text-white/50"
          >
            Your previously generated master prompts.
          </motion.p>
        </motion.div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
          </div>
        ) : error ? (
          <motion.div
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            className="liquid-glass rounded-2xl p-8 text-center"
          >
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={loadPrompts}
              className="mt-3 text-xs text-white/50 hover:text-white transition-colors"
            >
              Retry
            </button>
          </motion.div>
        ) : prompts.length === 0 ? (
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={reducedMotion ? { duration: 0 } : transitionEnter}
            className="liquid-glass rounded-2xl p-12 text-center"
          >
            <FileText className="w-8 h-8 text-white/20 mx-auto mb-3" />
            <p className="text-white/60 text-sm font-medium">No prompts yet</p>
            <p className="text-white/30 text-xs mt-1">
              Generate your first master prompt on the home page
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {prompts.map((prompt, index) => (
                <motion.div
                  key={prompt.id}
                  initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -20 }}
                  transition={reducedMotion ? { duration: 0 } : { duration: 0.25, delay: index * 0.04 }}
                  className="liquid-glass rounded-xl overflow-hidden"
                >
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                    onClick={() => setSelectedId(selectedId === prompt.id ? null : prompt.id)}
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-sm font-medium text-white truncate">
                          {prompt.title}
                        </h3>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white/[0.06] text-white/40 shrink-0">
                          {formatDate(prompt.timestamp)}
                        </span>
                      </div>
                      {prompt.summary && (
                        <p className="text-xs text-white/30 truncate">{prompt.summary}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <motion.button
                        whileHover={reducedMotion ? {} : { scale: 1.1 }}
                        whileTap={reducedMotion ? {} : { scale: 0.9 }}
                        onClick={(e) => { e.stopPropagation(); handleCopy(prompt); }}
                        className="p-1.5 text-white/40 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
                      >
                        <AnimatePresence mode="wait">
                          {copiedId === prompt.id ? (
                            <motion.span
                              key="check"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </motion.span>
                          ) : (
                            <motion.span
                              key="copy"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.button>
                      <motion.button
                        whileHover={reducedMotion ? {} : { scale: 1.1 }}
                        whileTap={reducedMotion ? {} : { scale: 0.9 }}
                        onClick={(e) => { e.stopPropagation(); handleDelete(prompt.id); }}
                        className="p-1.5 text-white/30 hover:text-red-400 hover:bg-red-500/[0.06] rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </motion.button>
                      <ChevronDown
                        className={`w-4 h-4 text-white/30 transition-transform duration-200 ${
                          selectedId === prompt.id ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </div>

                  <AnimatePresence>
                    {selectedId === prompt.id && (
                      <motion.div
                        initial={reducedMotion ? false : 'collapsed'}
                        animate="expanded"
                        exit={reducedMotion ? { opacity: 0 } : 'collapsed'}
                        variants={expandCollapse}
                        transition={reducedMotion ? { duration: 0 } : { duration: 0.25, ease: 'easeOut' }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 border-t border-white/[0.06]">
                          <pre className="mt-3 font-mono text-[11px] text-white/50 whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto p-3 bg-black/40 rounded-xl border border-white/[0.06]">
                            {prompt.masterPrompt}
                          </pre>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

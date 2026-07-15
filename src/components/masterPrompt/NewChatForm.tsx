import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check } from 'lucide-react';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe';
import { staggerContainer, fadeInUp, hoverScaleSmall, transitionFast } from '../../motion/presets';
import CustomSelect from '../ui/CustomSelect';

const WEBSITE_TYPES = ['SaaS', 'Portfolio', 'Agency', 'Landing Page', 'E-commerce', 'Custom'];
const STYLE_VIBES = ['Minimal', 'Cinematic', 'Playful', 'Bold', 'Elegant', 'Dark & Sleek', 'Colorful'];

interface NewChatFormProps {
  onSubmit: (values: FormValues) => void | Promise<void>;
  onCancel: () => void;
}

export interface FormValues {
  title: string;
  websiteType: string;
  audience: string;
  goal: string;
  preferredStack: string;
  style: string;
}

export default function NewChatForm({ onSubmit, onCancel }: NewChatFormProps) {
  const [values, setValues] = useState<FormValues>({
    title: '',
    websiteType: 'SaaS',
    audience: '',
    goal: '',
    preferredStack: '',
    style: 'Minimal',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const reducedMotion = useReducedMotionSafe();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        ...values,
        title: values.title || `${values.websiteType} — ${new Date().toLocaleDateString()}`,
      });
      if (!reducedMotion) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 800);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to create chat. Is the server running?');
    } finally {
      setSubmitting(false);
    }
  };

  const update = (field: keyof FormValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <motion.form
      initial={reducedMotion ? false : { opacity: 0, scale: 0.96, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -8 }}
      transition={reducedMotion ? { duration: 0 } : transitionFast}
      onSubmit={handleSubmit}
      className="liquid-glass rounded-2xl p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-white/50" />
          New Chat
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-[12px] text-white/40 hover:text-white/70 transition-colors"
        >
          Cancel
        </button>
      </div>

      <motion.div
        variants={staggerContainer}
        {...(reducedMotion ? {} : { initial: 'hidden', animate: 'visible' })}
        className="grid grid-cols-1 md:grid-cols-2 gap-3"
      >
        {/* Website Type */}
        <motion.div variants={fadeInUp} transition={reducedMotion ? { duration: 0 } : transitionFast}>
          <label className="block text-[11px] font-medium text-white/40 uppercase tracking-wider mb-1.5">
            Website Type
          </label>
          <CustomSelect
            value={values.websiteType}
            options={WEBSITE_TYPES.map((t) => ({ value: t, label: t }))}
            onChange={(val) => update('websiteType', val)}
          />
        </motion.div>

        {/* Title */}
        <motion.div variants={fadeInUp} transition={reducedMotion ? { duration: 0 } : transitionFast}>
          <label className="block text-[11px] font-medium text-white/40 uppercase tracking-wider mb-1.5">
            Chat Title
          </label>
          <input
            type="text"
            value={values.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder={`${values.websiteType} project`}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 focus:ring-2 focus:ring-indigo-500/40 transition-all duration-200"
          />
        </motion.div>

        {/* Audience */}
        <motion.div variants={fadeInUp} transition={reducedMotion ? { duration: 0 } : transitionFast}>
          <label className="block text-[11px] font-medium text-white/40 uppercase tracking-wider mb-1.5">
            Target Audience
          </label>
          <input
            type="text"
            value={values.audience}
            onChange={(e) => update('audience', e.target.value)}
            placeholder="e.g., small business owners, developers"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 focus:ring-2 focus:ring-indigo-500/40 transition-all duration-200"
          />
        </motion.div>

        {/* Goal */}
        <motion.div variants={fadeInUp} transition={reducedMotion ? { duration: 0 } : transitionFast}>
          <label className="block text-[11px] font-medium text-white/40 uppercase tracking-wider mb-1.5">
            Primary Goal
          </label>
          <input
            type="text"
            value={values.goal}
            onChange={(e) => update('goal', e.target.value)}
            placeholder="e.g., signups, sales, portfolio showcase"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 focus:ring-2 focus:ring-indigo-500/40 transition-all duration-200"
          />
        </motion.div>

        {/* Preferred Stack */}
        <motion.div variants={fadeInUp} transition={reducedMotion ? { duration: 0 } : transitionFast}>
          <label className="block text-[11px] font-medium text-white/40 uppercase tracking-wider mb-1.5">
            Preferred Stack
            <span className="text-white/20 ml-1 normal-case">(optional)</span>
          </label>
          <input
            type="text"
            value={values.preferredStack}
            onChange={(e) => update('preferredStack', e.target.value)}
            placeholder="e.g., Next.js, Vue, Svelte"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 focus:ring-2 focus:ring-indigo-500/40 transition-all duration-200"
          />
        </motion.div>

        {/* Style Vibe */}
        <motion.div variants={fadeInUp} transition={reducedMotion ? { duration: 0 } : transitionFast}>
          <label className="block text-[11px] font-medium text-white/40 uppercase tracking-wider mb-1.5">
            Style / Vibe
          </label>
          <CustomSelect
            value={values.style}
            options={STYLE_VIBES.map((s) => ({ value: s, label: s }))}
            onChange={(val) => update('style', val)}
          />
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-[12px] text-red-400 bg-red-500/[0.06] border border-red-500/10 rounded-lg px-3 py-2"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-[12px] font-medium text-white/40 hover:text-white/70 transition-colors"
        >
          Cancel
        </button>
        <motion.button
          whileHover={reducedMotion ? {} : { scale: 1.02 }}
          whileTap={reducedMotion ? {} : { scale: 0.97 }}
          type="submit"
          disabled={submitting}
          className="px-5 py-2 text-[12px] font-medium rounded-lg bg-white text-black hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          <AnimatePresence mode="wait">
            {showSuccess ? (
              <motion.span
                key="success"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="flex items-center gap-1.5"
              >
                <Check className="w-3 h-3" />
                Created
              </motion.span>
            ) : (
              <motion.span
                key="default"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {submitting ? 'Creating...' : 'Create Chat'}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </motion.form>
  );
}

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Bot, User } from 'lucide-react';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe';
import { slideFromRight, slideFromLeft, transitionFast } from '../../motion/presets';
import type { Message } from '../../types';

interface QuestionBubbleProps {
  message: Message;
}

export default memo(function QuestionBubble({ message }: QuestionBubbleProps) {
  const isUser = message.role === 'user';
  const reducedMotion = useReducedMotionSafe();

  const variants = isUser ? slideFromRight : slideFromLeft;

  return (
    <motion.div
      initial={reducedMotion ? false : 'hidden'}
      animate="visible"
      variants={variants}
      transition={reducedMotion ? { duration: 0 } : transitionFast}
      className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      <div className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
        {isUser ? (
          <User className="w-3.5 h-3.5 text-white/50" />
        ) : (
          <Bot className="w-3.5 h-3.5 text-white/50" />
        )}
      </div>

      <div
        className={`max-w-[85%] rounded-xl px-4 py-3 text-[13px] leading-[1.6] ${
          isUser
            ? 'bg-white/10 text-white rounded-tr-sm'
            : 'bg-white/[0.03] text-white/65 border border-white/[0.05] rounded-tl-sm'
        }`}
      >
        <div className="whitespace-pre-wrap">{message.content}</div>
      </div>
    </motion.div>
  );
});

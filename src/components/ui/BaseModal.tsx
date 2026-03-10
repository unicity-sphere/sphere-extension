import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type ModalSize = 'sm' | 'md' | 'lg';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Modal max-width: sm (384px), md (448px), lg (512px) */
  size?: ModalSize;
  /** Additional className for the modal container */
  className?: string;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export function BaseModal({
  isOpen,
  onClose,
  children,
  size = 'md',
  className = '',
}: BaseModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-100 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              onClick={(e) => e.stopPropagation()}
              className={`relative w-full ${sizeClasses[size]} max-h-[70dvh] bg-modal-bg/90 border border-white/10 rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.5)] pointer-events-auto flex flex-col overflow-hidden backdrop-blur-xl no-text-shadow ${className}`}
            >
              {children}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

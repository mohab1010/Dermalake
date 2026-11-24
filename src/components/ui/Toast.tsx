import { AnimatePresence, motion } from 'motion/react'
import { CheckIcon } from './Icons'
import { useToast } from './toastStore'

export function ToastHost() {
  const message = useToast((s) => s.message)
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-8 z-50 flex justify-center px-4">
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-2.5 rounded-full bg-lake-900 px-5 py-3 text-sm text-cream shadow-lift"
          >
            <CheckIcon className="h-4 w-4 text-gold-light" />
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

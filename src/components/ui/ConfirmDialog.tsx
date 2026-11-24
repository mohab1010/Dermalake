import { AnimatePresence, motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Button } from './Button'
import { useConfirmStore } from './confirmStore'

export function ConfirmDialogHost() {
  const { t } = useTranslation()
  const { open, message, confirmLabel, cancelLabel, danger, resolve } = useConfirmStore()

  function close(result: boolean) {
    resolve?.(result)
    useConfirmStore.setState({ open: false, resolve: null })
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-60 flex items-center justify-center bg-lake-950/40 px-4"
          onClick={() => close(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-lift"
          >
            <p className="text-sm leading-relaxed text-lake-950">{message}</p>
            <div className="mt-6 flex gap-3">
              <Button variant="outline" onClick={() => close(false)} className="flex-1 py-2.5!">
                {cancelLabel ?? t('admin.form.cancel')}
              </Button>
              <Button
                onClick={() => close(true)}
                className={`flex-1 py-2.5! ${danger ? 'bg-red-600! hover:bg-red-700!' : ''}`}
              >
                {confirmLabel ?? t('admin.form.save')}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

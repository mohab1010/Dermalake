import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { ensureAuthListener, useAuth } from '../../store/auth'
import { isFirebaseConfigured } from '../../lib/firebase'
import { Button } from '../../components/ui/Button'
import { adminInput } from './styles'
import { errorKey } from '../../lib/errors'

export function AdminLogin() {
  const { t } = useTranslation()
  const user = useAuth((s) => s.user)
  const loading = useAuth((s) => s.loading)
  const login = useAuth((s) => s.login)
  const rejected = useAuth((s) => s.rejected)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  ensureAuthListener()

  if (user) return <Navigate to="/admin" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) return
    setSubmitting(true)
    setError(null)
    try {
      await login(email.trim(), password)
    } catch (err) {
      setError(errorKey(err, 'admin.login.error'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lift"
      >
        <div className="mb-8 text-center">
          <svg viewBox="0 0 40 40" className="mx-auto mb-4 h-12 w-12 text-lake-900" fill="none">
            <circle cx="20" cy="20" r="18.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 22c3.5-2.5 6-6 12-6s8.5 3.5 12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M11 27c2.8-1.8 4.8-4 9-4s6.2 2.2 9 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.55" />
            <circle cx="20" cy="11.5" r="2.2" fill="currentColor" />
          </svg>
          <h1 className="font-display text-2xl text-lake-950">{t('admin.login.title')}</h1>
          <p className="mt-1.5 text-sm text-stone-soft">{t('admin.login.subtitle')}</p>
        </div>

        {!isFirebaseConfigured ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {t('admin.login.notConfigured')}
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="ad-email" className="mb-1.5 block text-sm font-medium">
                {t('admin.login.email')}
              </label>
              <input
                id="ad-email"
                type="email"
                dir="ltr"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${adminInput} text-start`}
              />
            </div>
            <div>
              <label htmlFor="ad-password" className="mb-1.5 block text-sm font-medium">
                {t('admin.login.password')}
              </label>
              <input
                id="ad-password"
                type="password"
                dir="ltr"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${adminInput} text-start`}
              />
            </div>
            {(error || rejected) && (
              <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {t(rejected ? 'admin.login.notAdmin' : (error ?? 'admin.login.error'))}
              </p>
            )}
            <Button type="submit" disabled={submitting || loading} className="w-full">
              {submitting ? t('admin.login.signingIn') : t('admin.login.submit')}
            </Button>
          </form>
        )}
      </motion.div>
    </div>
  )
}

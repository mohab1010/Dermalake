/**
 * Turns a thrown Firebase / network error into an i18n key the user can
 * understand. Raw server messages are never shown — unknown errors fall back
 * to the caller's context-specific key (e.g. "couldn't save").
 */
export function errorKey(err: unknown, fallback = 'common.error'): string {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'errors.offline'

  const code = (err as { code?: string } | null)?.code ?? ''
  switch (code) {
    // Auth
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-login-credentials':
      return 'errors.invalidCredentials'
    case 'auth/invalid-email':
      return 'errors.invalidEmail'
    case 'auth/user-disabled':
      return 'errors.userDisabled'
    case 'auth/too-many-requests':
      return 'errors.tooManyRequests'
    case 'auth/network-request-failed':
      return 'errors.network'

    // Firestore / Storage
    case 'permission-denied':
    case 'storage/unauthorized':
      return 'errors.permissionDenied'
    case 'unauthenticated':
    case 'storage/unauthenticated':
      return 'errors.sessionExpired'
    case 'unavailable':
    case 'deadline-exceeded':
    case 'storage/retry-limit-exceeded':
      return 'errors.network'
    case 'not-found':
    case 'storage/object-not-found':
      return 'errors.notFound'
    case 'resource-exhausted':
    case 'storage/quota-exceeded':
      return 'errors.quota'
    case 'already-exists':
      return 'errors.alreadyExists'
    default:
      return fallback
  }
}

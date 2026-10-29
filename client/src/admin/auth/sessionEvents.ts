const SESSION_EXPIRED_EVENT = "learners:admin-session-expired";

let sessionGeneration = 0;

export function getAdminSessionGeneration(): number {
  return sessionGeneration;
}

export function advanceAdminSessionGeneration(): void {
  sessionGeneration += 1;
}

export function notifyAdminSessionExpired(
  requestGeneration = sessionGeneration,
): void {
  if (requestGeneration !== sessionGeneration) {
    return;
  }

  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

export function subscribeToAdminSessionExpiry(
  listener: () => void,
): () => void {
  window.addEventListener(SESSION_EXPIRED_EVENT, listener);

  return () => {
    window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
  };
}

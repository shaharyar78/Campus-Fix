export interface TurnstileVerificationResult {
  success: boolean;
  skipped?: boolean;
  error?: string;
}

export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string
): Promise<TurnstileVerificationResult> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY?.trim();
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();

  if (!secretKey) {
    if (process.env.NODE_ENV === 'production' && siteKey) {
      return { success: false, error: 'Captcha verification is misconfigured on the server.' };
    }
    return { success: true, skipped: true };
  }

  const trimmedToken = typeof token === 'string' ? token.trim() : '';
  if (!trimmedToken) {
    return { success: false, error: 'Complete the security check before continuing.' };
  }

  try {
    const formData = new URLSearchParams();
    formData.set('secret', secretKey);
    formData.set('response', trimmedToken);
    if (remoteIp && remoteIp !== 'unknown') {
      formData.set('remoteip', remoteIp);
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
      cache: 'no-store',
    });

    if (!response.ok) {
      return { success: false, error: 'Could not verify the security check. Please try again.' };
    }

    const result = (await response.json()) as { success?: boolean };
    if (!result.success) {
      return { success: false, error: 'Security check failed. Please retry.' };
    }

    return { success: true };
  } catch (err) {
    console.error('Turnstile verification error:', err);
    return { success: false, error: 'Could not verify the security check. Please try again.' };
  }
}

const DEFAULT_SUBDOMAIN = 'apppedidosnuevolocal';

const normalizeHostname = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
};

const normalizeSubdomain = (value: string): string | null => {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  const sanitized = normalized.replace(/[^a-z0-9-]/g, '');
  return sanitized && /^[a-z0-9-]{1,63}$/.test(sanitized) ? sanitized : null;
};

const isLoopbackOrIp = (hostname: string): boolean => {
  const normalized = hostname.trim().toLowerCase();

  if (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '0.0.0.0' ||
    normalized === '::1'
  ) {
    return true;
  }

  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(normalized);
};

const getEnvBaseDomain = (): string => {
  const envBaseDomain =
    typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env.VITE_BASE_DOMAIN ??
        import.meta.env.NEXT_PUBLIC_BASE_DOMAIN ??
        '')
      : '';

  return normalizeHostname(envBaseDomain);
};

export const getRootBaseDomain = (): string => {
  return getEnvBaseDomain();
};

export const extractSubdomainFromHostname = (
  hostname: string,
  baseDomain?: string,
): string | null => {
  const normalizedHost = normalizeHostname(hostname);

  if (!normalizedHost) {
    return null;
  }

  if (isLoopbackOrIp(normalizedHost)) {
    return DEFAULT_SUBDOMAIN;
  }

  const normalizedBase = normalizeHostname(baseDomain ?? '');

  if (normalizedBase) {
    if (normalizedHost === normalizedBase) {
      return null;
    }

    if (normalizedHost.endsWith(`.${normalizedBase}`)) {
      const candidate = normalizedHost.slice(
        0,
        normalizedHost.length - normalizedBase.length - 1,
      );

      return normalizeSubdomain(candidate);
    }
  }

  const firstSegment = normalizedHost.split('.')[0] ?? '';
  return normalizeSubdomain(firstSegment);
};
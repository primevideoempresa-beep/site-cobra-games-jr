export class PublisherConfigError extends Error {
  code: string;
  details?: string;

  constructor(message: string, code = 'MISSING_PUBLISHER_API_URL', details?: string) {
    super(message);
    this.name = 'PublisherConfigError';
    this.code = code;
    this.details = details;
  }
}

function normalizeBaseUrl(raw?: string): string {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (/^https?:\/\/[^/\s]+(?:\/.*)?$/i.test(trimmed)) {
    return trimmed;
  }
  return '';
}

function getRawConfiguredBaseUrl(): string {
  const env = (import.meta as any).env;
  return (
    env?.VITE_PUBLISHER_API_URL ||
    env?.VITE_API_BASE_URL ||
    ''
  ).trim();
}

export function getPublisherApiBaseUrl(): string {
  return normalizeBaseUrl(getRawConfiguredBaseUrl());
}

export function isSameOriginStaticFallbackLikely(): boolean {
  if (typeof window === 'undefined') return false;
  if (getPublisherApiBaseUrl()) return false;
  const host = window.location.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1') return false;
  if (host.endsWith('.vercel.app')) return true;
  // In static production builds outside fullstack preview/backend hosts, relative /api routes are invalid
  const isProd = Boolean((import.meta as any).env?.PROD);
  if (isProd && !host.endsWith('.run.app') && !host.endsWith('.railway.app')) {
    return true;
  }
  return false;
}

export function buildPublisherApiUrl(endpoint: string): string {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const rawConfigured = getRawConfiguredBaseUrl();
  const baseUrl = getPublisherApiBaseUrl();

  if (rawConfigured && !baseUrl) {
    throw new PublisherConfigError(
      'A variável VITE_PUBLISHER_API_URL está inválida. Informe uma URL completa com https:// (ex.: https://seu-backend.up.railway.app).',
      'INVALID_PUBLISHER_API_URL',
      `Valor configurado: ${rawConfigured}`
    );
  }

  if (baseUrl) {
    return `${baseUrl}${normalizedEndpoint}`;
  }

  if (isSameOriginStaticFallbackLikely()) {
    throw new PublisherConfigError(
      'Backend de publicação (VITE_PUBLISHER_API_URL) não configurado na Vercel. A publicação foi bloqueada antes de enviar requisições para /api da Vercel.',
      'MISSING_PUBLISHER_API_URL',
      'Configure VITE_PUBLISHER_API_URL nas variáveis de ambiente da Vercel apontando para o servidor Express no Railway e faça um novo deploy.'
    );
  }

  return normalizedEndpoint;
}

export function resolveGameIframeUrl(iframeUrl?: string): string {
  if (!iframeUrl || typeof iframeUrl !== 'string') return '';
  const trimmed = iframeUrl.trim();
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const baseUrl = getPublisherApiBaseUrl();
  if (baseUrl && trimmed.startsWith('/games/')) {
    return `${baseUrl}${trimmed}`;
  }

  return trimmed;
}

export function isGameUrlPendingPublisher(iframeUrl?: string): boolean {
  if (!iframeUrl || typeof iframeUrl !== 'string') return false;
  const trimmed = iframeUrl.trim();
  return trimmed.startsWith('/games/') && isSameOriginStaticFallbackLikely();
}


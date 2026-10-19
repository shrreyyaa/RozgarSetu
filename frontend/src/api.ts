// API Client for SETU Labour Market Intelligence System
import {
  OverviewData, GeoItem, PlaceStats, PredictData,
  RecommendationsData, ActionLogItem, IndustryPartner,
  CentreDetail, User
} from './types';

const API_BASE = ''; // Relative in production / Vite proxy

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('setu_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...(options.headers || {}),
  };
  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  if (!res.ok) {
    const errorText = await res.text();
    let errorMsg = `API Error ${res.status}`;
    try {
      const parsed = JSON.parse(errorText);
      errorMsg = parsed.detail || errorMsg;
    } catch {
      errorMsg = errorText || errorMsg;
    }
    throw new Error(errorMsg);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------
export function getStoredUser(): User | null {
  const data = localStorage.getItem('setu_user');
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function saveUser(user: User): void {
  localStorage.setItem('setu_user', JSON.stringify(user));
  if (user.token) {
    localStorage.setItem('setu_auth_token', user.token);
  }
}

export function clearUser(): void {
  localStorage.removeItem('setu_user');
  localStorage.removeItem('setu_auth_token');
}

export async function loginUser(username: string, password: string): Promise<User> {
  const res = await fetchApi<{ status: string; token: string; user: User }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  const u = { ...res.user, token: res.token };
  saveUser(u);
  return u;
}

export async function logoutUser(): Promise<void> {
  try {
    await fetchApi('/api/auth/logout', { method: 'POST' });
  } finally {
    clearUser();
  }
}

// ---------------------------------------------------------------------------
// API endpoints
// ---------------------------------------------------------------------------
export async function fetchOverview(): Promise<OverviewData> {
  return fetchApi<OverviewData>('/api/overview');
}

export async function fetchGeo(parentId?: string | null): Promise<GeoItem[]> {
  const q = parentId ? `?parent_id=${encodeURIComponent(parentId)}` : '';
  return fetchApi<GeoItem[]>(`/api/geo${q}`);
}

export async function fetchPlaceStats(geoId: string): Promise<PlaceStats> {
  return fetchApi<PlaceStats>(`/api/place/${encodeURIComponent(geoId)}/stats`);
}

export async function fetchPlacePredict(
  geoId: string,
  masterId?: number,
  horizon = 12,
  compare = 'none',
  fromDate?: string,
  toDate?: string
): Promise<PredictData> {
  const params = new URLSearchParams();
  if (masterId) params.set('master_id', String(masterId));
  params.set('horizon', String(horizon));
  params.set('compare', compare);
  if (fromDate) params.set('from', fromDate);
  if (toDate) params.set('to', toDate);
  return fetchApi<PredictData>(`/api/place/${encodeURIComponent(geoId)}/predict?${params}`);
}

export async function fetchPlaceRecommendations(geoId: string): Promise<RecommendationsData> {
  return fetchApi<RecommendationsData>(`/api/place/${encodeURIComponent(geoId)}/recommendations`);
}

export async function fetchPlaceIndustries(geoId: string): Promise<IndustryPartner[]> {
  return fetchApi<IndustryPartner[]>(`/api/place/${encodeURIComponent(geoId)}/industries`);
}

export async function fetchPlaceCentres(geoId: string, tradeId?: number): Promise<CentreDetail[]> {
  const q = tradeId ? `?trade_id=${tradeId}` : '';
  return fetchApi<CentreDetail[]>(`/api/place/${encodeURIComponent(geoId)}/centres${q}`);
}

export async function executeContactIndustries(payload: {
  geo_id: string;
  trade: string;
  industry_ids?: number[];
  custom_message?: string;
}): Promise<any> {
  return fetchApi('/api/actions/contact-industries', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function executeAlertCentres(payload: {
  geo_id: string;
  trade: string;
  centre_ids?: number[];
  directive?: string;
}): Promise<any> {
  return fetchApi('/api/actions/alert-centres', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchSentActions(geoId?: string): Promise<ActionLogItem[]> {
  const q = geoId ? `?geo_id=${encodeURIComponent(geoId)}` : '';
  return fetchApi<ActionLogItem[]>(`/api/actions/sent${q}`);
}

export function getReportDownloadUrl(geoId: string, format: 'pdf' | 'csv' = 'pdf', tradeId?: number): string {
  const q = new URLSearchParams();
  q.set('format', format);
  if (tradeId) q.set('trade_id', String(tradeId));
  return `/api/place/${encodeURIComponent(geoId)}/report?${q}`;
}

export function downloadReport(geoId: string, format: 'pdf' | 'csv' = 'pdf', tradeId?: number) {
  const url = getReportDownloadUrl(geoId, format, tradeId);
  const a = document.createElement('a');
  a.href = url;
  a.download = `setu_report_${geoId}${tradeId ? `_trade_${tradeId}` : ''}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ---------------------------------------------------------------------------
// Route parsing: #/ (overview), #/place/:geoId, #/place/:geoId/recommendations
// ---------------------------------------------------------------------------
export type AppRoute =
  | { page: 'overview' }
  | { page: 'place'; geoId: string }
  | { page: 'recommendations'; geoId: string };

export function parseRoute(hash: string): AppRoute {
  const clean = hash.replace(/^#\/?/, '').trim();
  if (!clean) return { page: 'overview' };

  // Compatibility with district routes: district/1 -> place/district-1
  if (clean.startsWith('district/')) {
    const parts = clean.split('/');
    const dId = parts[1];
    return { page: 'place', geoId: `district-${dId}` };
  }

  const parts = clean.split('/');
  if (parts[0] === 'place' && parts[1]) {
    if (parts[2] === 'recommendations') {
      return { page: 'recommendations', geoId: parts[1] };
    }
    return { page: 'place', geoId: parts[1] };
  }

  return { page: 'overview' };
}

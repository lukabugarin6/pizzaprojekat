// lib/api/restaurant.ts
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type RestaurantSettings = {
  id: string;
  name: string;
  timezone: string;
  createdAt?: string;
  updatedAt?: string;
};

export type WeeklyHoursRow = {
  id: string;
  weekday: Weekday;
  isClosed: boolean;
  openTime: string | null; // "HH:mm"
  closeTime: string | null; // "HH:mm"
};

export type RestaurantOverrideRow = {
  id: string;
  settingsId: string;
  dateFrom: string; // "YYYY-MM-DD"
  dateTo: string; // "YYYY-MM-DD"
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
  reason: string | null;
  createdAt: string;
};

export type PublicRestaurantHoursResponse = {
  settings: RestaurantSettings;
  date: string; // "YYYY-MM-DD"
  now: string; // "HH:mm"
  isOpenNow: boolean;
  effective: {
    source: 'override' | 'weekly';
    isClosed: boolean;
    openTime: string | null;
    closeTime: string | null;
    reason?: string | null;
  };
  weekly: WeeklyHoursRow[];
  activeOverride: RestaurantOverrideRow | null;
};

function getApiBaseUrl() {
  // Server-side: API_URL in .env (without NEXT_PUBLIC)
  const base = process.env.API_URL;
  if (!base) throw new Error('Missing API_URL env var');
  return base.replace(/\/+$/, '');
}

export async function getPublicRestaurantHours(): Promise<PublicRestaurantHoursResponse | null> {
  const base = getApiBaseUrl();

  try {
    const res = await fetch(`${base}/public/restaurant/hours`, {
      cache: 'no-store',
      // or: next: { revalidate: 30 },
    });

    if (!res.ok) {
      console.error(
        'public/restaurant/hours failed',
        res.status,
        await res.text().catch(() => ''),
      );
      return null;
    }

    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('application/json')) {
      console.error(
        'public/restaurant/hours non-json',
        ct,
        await res.text().catch(() => ''),
      );
      return null;
    }

    return (await res.json()) as PublicRestaurantHoursResponse;
  } catch (err) {
    console.error('public/restaurant/hours fetch error', err);
    return null;
  }
}

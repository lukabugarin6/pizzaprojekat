// src/api/restaurant.ts
import { apiFetch } from "./apiClient";
import { getTokens, refreshAccessToken } from "./auth";

export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7; // Mon..Sun

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
    source: "override" | "weekly";
    isClosed: boolean;
    openTime: string | null;
    closeTime: string | null;
    reason?: string | null;
  };
  weekly: WeeklyHoursRow[];
  activeOverride: RestaurantOverrideRow | null;
};

export const restaurantEndpoints = {
  // public (for website / app to display)
  publicHours: "/public/restaurant/hours",

  // admin
  updateSettings: "/admin/restaurant/settings",
  setWeeklyHours: "/admin/restaurant/weekly-hours",
  createOverride: "/admin/restaurant/overrides",
  deleteOverride: (id: string) => `/admin/restaurant/overrides/${id}`,
};

// same authed fetch helper pattern as users.ts
async function authedFetch(path: string, init?: RequestInit) {
  const { accessToken } = await getTokens();

  let res = await apiFetch(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: accessToken ? `Bearer ${accessToken}` : "",
      "Content-Type": "application/json",
    },
  });

  if (res.status === 401) {
    const ok = await refreshAccessToken();
    if (!ok) return res;

    const { accessToken: access2 } = await getTokens();
    res = await apiFetch(path, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: access2 ? `Bearer ${access2}` : "",
        "Content-Type": "application/json",
      },
    });
  }

  return res;
}

/** Public: fetch effective hours (open now + weekly + active override) */
export async function fetchPublicRestaurantHours(): Promise<PublicRestaurantHoursResponse> {
  const res = await apiFetch(restaurantEndpoints.publicHours, {
    method: "GET",
  });
  if (!res.ok) throw new Error(`Restaurant hours load failed: ${res.status}`);
  return (await res.json()) as PublicRestaurantHoursResponse;
}

/** Admin: update restaurant settings (name/timezone) */
export async function updateRestaurantSettings(payload: {
  name?: string;
  timezone?: string;
}): Promise<{ settings: RestaurantSettings }> {
  const res = await authedFetch(restaurantEndpoints.updateSettings, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(
      `Update settings failed: ${res.status}${txt ? `\n${txt}` : ""}`,
    );
  }

  return (await res.json()) as { settings: RestaurantSettings };
}

/** Admin: set all 7 days weekly hours */
export async function setRestaurantWeeklyHours(payload: {
  items: Array<{
    weekday: Weekday;
    isClosed: boolean;
    openTime?: string | null;
    closeTime?: string | null;
  }>;
}): Promise<{ settingsId: string; weekly: WeeklyHoursRow[] }> {
  const res = await authedFetch(restaurantEndpoints.setWeeklyHours, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(
      `Set weekly hours failed: ${res.status}${txt ? `\n${txt}` : ""}`,
    );
  }

  return (await res.json()) as { settingsId: string; weekly: WeeklyHoursRow[] };
}

/** Admin: create override (vacation closed OR special hours) */
export async function createRestaurantOverride(payload: {
  dateFrom: string; // "YYYY-MM-DD"
  dateTo: string; // "YYYY-MM-DD"
  isClosed: boolean;
  openTime?: string | null; // required if isClosed=false
  closeTime?: string | null; // required if isClosed=false
  reason?: string | null;
}): Promise<{ override: RestaurantOverrideRow }> {
  const res = await authedFetch(restaurantEndpoints.createOverride, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(
      `Create override failed: ${res.status}${txt ? `\n${txt}` : ""}`,
    );
  }

  return (await res.json()) as { override: RestaurantOverrideRow };
}

/** Admin: delete override by id */
export async function deleteRestaurantOverride(id: string): Promise<void> {
  const res = await authedFetch(restaurantEndpoints.deleteOverride(id), {
    method: "DELETE",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(
      `Delete override failed: ${res.status}${txt ? `\n${txt}` : ""}`,
    );
  }
}

export async function setClosedToday(isClosed: boolean) {
  // If closing: create MANUAL_CLOSED override for today
  // If opening: delete active MANUAL_CLOSED override (requires you to load publicHours first)
  const today = new Date().toISOString().slice(0, 10);

  if (isClosed) {
    return createRestaurantOverride({
      dateFrom: today,
      dateTo: today,
      isClosed: true,
      reason: "MANUAL_CLOSED",
    });
  }

  const hrs = await fetchPublicRestaurantHours();
  const active = hrs.activeOverride;

  if (active?.reason === "MANUAL_CLOSED") {
    await deleteRestaurantOverride(active.id);
  }
}

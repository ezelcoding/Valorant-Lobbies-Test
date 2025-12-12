export type Lobby = {
  id: number;
  code: string;
  created_at: string;
  rank_min: string | null;
  rank_max: string | null;
  mode: string | null;
  mic_required: boolean | null;
  age_restriction: number | null;
  spots_available: number | null;
  created_by: string | null;
};

export type CreateLobbyInput = {
  code: string;
  rank_min: string;
  rank_max: string | null;
  mode: string;
  mic_required: boolean;
  age_restriction: number | null;
  spots_available: number;
  created_by?: string | null;
};

type SupabaseErrorPayload = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

export class SupabaseRestError extends Error {
  status: number;
  payload?: SupabaseErrorPayload;

  constructor(message: string, status: number, payload?: SupabaseErrorPayload) {
    super(message);
    this.name = "SupabaseRestError";
    this.status = status;
    this.payload = payload;
  }
}

function getSupabaseConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
    );
  }

  return {
    url: url.replace(/\/$/, ""),
    anonKey,
  };
}

function buildUrl(path: string, query?: Record<string, string | number | undefined>) {
  const { url } = getSupabaseConfig();
  const full = new URL(`${url}/rest/v1/${path.replace(/^\//, "")}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined) continue;
      full.searchParams.set(key, String(value));
    }
  }

  return full.toString();
}

function getHeaders(options?: {
  contentType?: boolean;
  prefer?: string;
}): HeadersInit {
  const { anonKey } = getSupabaseConfig();

  const headers: Record<string, string> = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    Accept: "application/json",
  };

  if (options?.contentType) {
    headers["Content-Type"] = "application/json";
  }

  if (options?.prefer) {
    headers.Prefer = options.prefer;
  }

  return headers;
}

async function parseErrorPayload(response: Response): Promise<SupabaseErrorPayload | undefined> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return undefined;

  try {
    return (await response.json()) as SupabaseErrorPayload;
  } catch {
    return undefined;
  }
}

async function supabaseRequest<T>(
  path: string,
  init: RequestInit & { query?: Record<string, string | number | undefined> } = {}
): Promise<T> {
  const url = buildUrl(path, init.query);
  const response = await fetch(url, init);

  if (!response.ok) {
    const payload = await parseErrorPayload(response);
    const message =
      payload?.message ??
      payload?.details ??
      `Supabase request failed (${response.status})`;
    throw new SupabaseRestError(message, response.status, payload);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  return (text ? (JSON.parse(text) as T) : (undefined as T));
}

export async function fetchLatestLobbies(params: {
  createdAtGteIso: string;
  limit?: number;
}): Promise<Lobby[]> {
  const { createdAtGteIso, limit = 200 } = params;

  return supabaseRequest<Lobby[]>("lobbies", {
    method: "GET",
    headers: getHeaders(),
    query: {
      select: "*",
      created_at: `gte.${createdAtGteIso}`,
      order: "created_at.desc",
      limit,
    },
  });
}

export async function fetchLobbiesByCode(code: string): Promise<Lobby[]> {
  return supabaseRequest<Lobby[]>("lobbies", {
    method: "GET",
    headers: getHeaders(),
    query: {
      select: "*",
      code: `eq.${code}`,
      limit: 1,
    },
  });
}

export async function createLobby(input: CreateLobbyInput): Promise<Lobby> {
  const rows = await supabaseRequest<Lobby[]>("lobbies", {
    method: "POST",
    headers: getHeaders({ contentType: true, prefer: "return=representation" }),
    body: JSON.stringify({
      code: input.code,
      rank_min: input.rank_min,
      rank_max: input.rank_max,
      mode: input.mode,
      mic_required: input.mic_required,
      age_restriction: input.age_restriction,
      spots_available: input.spots_available,
      created_by: input.created_by ?? null,
    }),
  });

  const first = rows[0];
  if (!first) {
    throw new SupabaseRestError("Supabase did not return the created lobby", 500);
  }

  return first;
}

export async function deleteLobbiesOlderThan(createdAtLtIso: string): Promise<void> {
  await supabaseRequest<void>("lobbies", {
    method: "DELETE",
    headers: getHeaders(),
    query: {
      created_at: `lt.${createdAtLtIso}`,
    },
  });
}

export async function deleteLobbyById(id: number): Promise<void> {
  await supabaseRequest<void>("lobbies", {
    method: "DELETE",
    headers: getHeaders(),
    query: {
      id: `eq.${id}`,
    },
  });
}

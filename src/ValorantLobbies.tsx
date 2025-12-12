import { useEffect, useMemo, useState } from "react";
import { Clipboard, Copy, Mic, MicOff } from "lucide-react";
import {
  createLobby,
  deleteLobbiesOlderThan,
  fetchLatestLobbies,
  fetchLobbiesByCode,
  type Lobby,
} from "./supabase";

type Rank =
  | "Iron"
  | "Bronze"
  | "Silver"
  | "Gold"
  | "Platinum"
  | "Diamond"
  | "Ascendant"
  | "Immortal"
  | "Radiant";

type GameMode = "Competitive" | "Unrated" | "Spike Rush" | "Deathmatch";

type AgeOption = "all" | "18+";

type LobbyFormState = {
  rankMin: Rank;
  rankMax: Rank | "Only";
  mode: GameMode;
  micRequired: boolean;
  age: AgeOption;
  spotsAvailable: number;
  code: string;
};

const COOLDOWN_SECONDS = 60;
const STALE_AFTER_MS = 5 * 60 * 1000;
const FETCH_INTERVAL_MS = 10 * 1000;
const DELETE_INTERVAL_MS = 30 * 1000;
const TIME_TICK_MS = 5 * 1000;
const LOBBIES_PER_PAGE = 10;

const RANKS: Rank[] = [
  "Iron",
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Diamond",
  "Ascendant",
  "Immortal",
  "Radiant",
];

const MODES: GameMode[] = ["Competitive", "Unrated", "Spike Rush", "Deathmatch"];

function normalizeRank(rank: string | null | undefined): Rank {
  const cleaned = (rank ?? "").trim().toLowerCase();

  const map: Record<string, Rank> = {
    iron: "Iron",
    bronze: "Bronze",
    silver: "Silver",
    gold: "Gold",
    platinum: "Platinum",
    plat: "Platinum",
    diamond: "Diamond",
    ascendant: "Ascendant",
    immortal: "Immortal",
    radiant: "Radiant",
  };

  return map[cleaned] ?? "Silver";
}

function rankColor(rank: string | null | undefined) {
  const normalized = normalizeRank(rank);

  const rgb: Record<Rank, { r: number; g: number; b: number }> = {
    Iron: { r: 75, g: 85, b: 99 },
    Bronze: { r: 120, g: 53, b: 15 },
    Silver: { r: 156, g: 163, b: 175 },
    Gold: { r: 250, g: 204, b: 21 },
    Platinum: { r: 34, g: 211, b: 238 },
    Diamond: { r: 168, g: 85, b: 247 },
    Ascendant: { r: 16, g: 185, b: 129 },
    Immortal: { r: 239, g: 68, b: 68 },
    Radiant: { r: 245, g: 158, b: 11 },
  };

  return rgb[normalized];
}

function gradientStyle(rankMin: string | null | undefined, rankMax: string | null | undefined) {
  const c1 = rankColor(rankMin);
  const c2 = rankColor(rankMax ?? rankMin);

  const c1s = `${c1.r}, ${c1.g}, ${c1.b}`;
  const c2s = `${c2.r}, ${c2.g}, ${c2.b}`;

  return {
    background: `linear-gradient(to right,
      rgba(${c1s}, 0.2) 0%,
      rgba(${c1s}, 0.65) 40%,
      rgba(${c2s}, 0.65) 60%,
      rgba(${c2s}, 0.2) 100%)`,
  } as const;
}

function timeAgoLabel(createdAtIso: string, nowMs: number) {
  const createdMs = new Date(createdAtIso).getTime();
  if (Number.isNaN(createdMs)) return "";

  const seconds = Math.floor((nowMs - createdMs) / 1000);
  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;

  const hours = Math.floor(minutes / 60);
  return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
}

function validateLobbyCode(value: string) {
  return /^[A-Z]{3}[0-9]{3}$/.test(value.trim().toUpperCase());
}

function generateLobbyCode() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const randomLetters = Array.from({ length: 3 }, () =>
    letters[Math.floor(Math.random() * letters.length)]
  ).join("");
  const randomNumbers = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  return `${randomLetters}${randomNumbers}`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

function dedupeByCode(rows: Lobby[]) {
  const seen = new Set<string>();
  const deduped: Lobby[] = [];

  for (const row of rows) {
    const key = row.code.trim().toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
  }

  return deduped;
}

export default function ValorantLobbies() {
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [cleanupError, setCleanupError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [nowMs, setNowMs] = useState(() => Date.now());

  const [cooldownUntilMs, setCooldownUntilMs] = useState<number>(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [form, setForm] = useState<LobbyFormState>({
    rankMin: "Gold",
    rankMax: "Only",
    mode: "Competitive",
    micRequired: true,
    age: "all",
    spotsAvailable: 2,
    code: "",
  });

  const totalPages = Math.max(1, Math.ceil(lobbies.length / LOBBIES_PER_PAGE));

  const currentLobbies = useMemo(() => {
    const start = (currentPage - 1) * LOBBIES_PER_PAGE;
    return lobbies.slice(start, start + LOBBIES_PER_PAGE);
  }, [currentPage, lobbies]);

  async function refreshLobbies() {
    setFetchError(null);

    try {
      const createdAtGteIso = new Date(Date.now() - STALE_AFTER_MS).toISOString();
      const rows = await fetchLatestLobbies({ createdAtGteIso });
      const deduped = dedupeByCode(rows);
      setLobbies(deduped);
      setLoading(false);

      const newTotalPages = Math.max(1, Math.ceil(deduped.length / LOBBIES_PER_PAGE));
      setCurrentPage((p) => Math.min(p, newTotalPages));
    } catch (error) {
      setFetchError(getErrorMessage(error));
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshLobbies();

    const id = window.setInterval(() => {
      void refreshLobbies();
    }, FETCH_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const tickId = window.setInterval(() => {
      setNowMs(Date.now());
    }, TIME_TICK_MS);

    return () => window.clearInterval(tickId);
  }, []);

  useEffect(() => {
    const update = () => {
      const remaining = Math.max(0, Math.ceil((cooldownUntilMs - Date.now()) / 1000));
      setCooldownRemaining(remaining);
    };

    update();

    if (cooldownUntilMs <= Date.now()) return;

    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [cooldownUntilMs]);

  useEffect(() => {
    async function cleanup() {
      setCleanupError(null);

      try {
        await deleteLobbiesOlderThan(new Date(Date.now() - STALE_AFTER_MS).toISOString());
        await refreshLobbies();
      } catch (error) {
        setCleanupError(getErrorMessage(error));
      }
    }

    void cleanup();

    const id = window.setInterval(() => {
      void cleanup();
    }, DELETE_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, []);

  async function copyToClipboard(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      window.prompt("Copy this lobby code:", code);
    }
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      const cleaned = text.trim().toUpperCase().slice(0, 6);
      setForm((f) => ({ ...f, code: cleaned }));
    } catch {
      const manual = window.prompt("Paste your lobby code (ABC123):");
      if (!manual) return;
      setForm((f) => ({ ...f, code: manual.trim().toUpperCase().slice(0, 6) }));
    }
  }

  async function handleCreate() {
    if (cooldownRemaining > 0 || creating) return;

    const code = form.code.trim().toUpperCase();

    if (!validateLobbyCode(code)) {
      setCreateError("Invalid code. Use 3 letters + 3 numbers (e.g., ABC123).");
      return;
    }

    const localDuplicate = lobbies.some((l) => l.code.trim().toUpperCase() === code);
    if (localDuplicate) {
      setCreateError("This lobby code already exists. Please use a different one.");
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      const existing = await fetchLobbiesByCode(code);
      if (existing.length > 0) {
        setCreateError("This lobby code already exists. Please use a different one.");
        return;
      }

      const rankMax = form.rankMax === "Only" ? form.rankMin : form.rankMax;

      await createLobby({
        code,
        rank_min: form.rankMin,
        rank_max: rankMax,
        mode: form.mode,
        mic_required: form.micRequired,
        age_restriction: form.age === "18+" ? 18 : null,
        spots_available: form.spotsAvailable,
      });

      setForm((f) => ({ ...f, code: "" }));
      setCooldownUntilMs(Date.now() + COOLDOWN_SECONDS * 1000);
      setCurrentPage(1);
      await refreshLobbies();
    } catch (error) {
      setCreateError(getErrorMessage(error));
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: 24 }}>
        <div className="glass" style={{ borderRadius: 16, padding: 16 }}>
          Loading lobbies…
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0 }}>Valorant Lobbies</h1>
          <p style={{ marginTop: 8, marginBottom: 0, opacity: 0.8 }}>
            Lobbies auto-refresh every 10s. Listings older than 5 minutes are deleted.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refreshLobbies()}
          className="glass glass-sm"
          style={{
            borderRadius: 999,
            padding: "10px 14px",
            cursor: "pointer",
            border: "none",
          }}
        >
          Refresh
        </button>
      </div>

      {(fetchError || cleanupError) && (
        <div
          className="glass"
          style={{
            borderRadius: 16,
            padding: 12,
            marginTop: 16,
            color: "#7f1d1d",
            borderColor: "rgba(239, 68, 68, 0.35)",
          }}
        >
          {fetchError && <div>Failed to fetch lobbies: {fetchError}</div>}
          {!fetchError && cleanupError && <div>Cleanup error: {cleanupError}</div>}
        </div>
      )}

      <div
        className="glass glass-lg"
        style={{ borderRadius: 24, padding: 16, marginTop: 16 }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr 0.75fr 1.25fr",
            gap: 10,
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <select
              value={form.rankMin}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  rankMin: e.target.value as Rank,
                  rankMax: f.rankMax === "Only" ? "Only" : f.rankMax,
                }))
              }
            >
              {RANKS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <select
              value={form.rankMax}
              onChange={(e) => setForm((f) => ({ ...f, rankMax: e.target.value as Rank | "Only" }))}
            >
              <option value="Only">Only</option>
              {RANKS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <select value={form.mode} onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value as GameMode }))}>
            {MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={form.micRequired}
              onChange={(e) => setForm((f) => ({ ...f, micRequired: e.target.checked }))}
            />
            Mic required
          </label>

          <select value={form.age} onChange={(e) => setForm((f) => ({ ...f, age: e.target.value as AgeOption }))}>
            <option value="all">All ages</option>
            <option value="18+">18+</option>
          </select>

          <select
            value={form.spotsAvailable}
            onChange={(e) => setForm((f) => ({ ...f, spotsAvailable: Number(e.target.value) }))}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "spot" : "spots"}
              </option>
            ))}
          </select>

          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="ABC123"
              maxLength={6}
              style={{ flex: 1 }}
            />

            <button
              type="button"
              className="glass glass-sm"
              style={{ borderRadius: 12, padding: "8px 10px", cursor: "pointer", border: "none" }}
              onClick={() => void pasteFromClipboard()}
              title="Paste"
            >
              <Clipboard size={16} />
            </button>

            <button
              type="button"
              className="glass glass-sm"
              style={{ borderRadius: 12, padding: "8px 10px", cursor: "pointer", border: "none" }}
              onClick={() => setForm((f) => ({ ...f, code: generateLobbyCode() }))}
              title="Generate"
            >
              Gen
            </button>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={cooldownRemaining > 0 || creating || !form.code}
            className="glass glass-sm"
            style={{
              width: "100%",
              borderRadius: 999,
              padding: "12px 14px",
              cursor: cooldownRemaining > 0 || creating ? "not-allowed" : "pointer",
              border: "none",
              opacity: cooldownRemaining > 0 || creating ? 0.6 : 1,
              fontWeight: 600,
            }}
          >
            {creating
              ? "Creating…"
              : cooldownRemaining > 0
                ? `Wait ${cooldownRemaining}s`
                : "Create Lobby"}
          </button>

          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8, textAlign: "center" }}>
            {cooldownRemaining > 0
              ? `Cooldown active. You can create another lobby in ${cooldownRemaining}s.`
              : `After creating a lobby, you must wait ${COOLDOWN_SECONDS}s before creating another.`}
          </div>

          {createError && (
            <div style={{ marginTop: 10, color: "#7f1d1d", fontSize: 13, textAlign: "center" }}>
              {createError}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {currentLobbies.length === 0 ? (
          <div className="glass" style={{ borderRadius: 16, padding: 16 }}>
            No active lobbies. Create one!
          </div>
        ) : (
          currentLobbies.map((lobby) => {
            const rankMin = normalizeRank(lobby.rank_min);
            const rankMax = lobby.rank_max ? normalizeRank(lobby.rank_max) : rankMin;
            const rankLabel = rankMax === rankMin ? rankMin : `${rankMin} – ${rankMax}`;

            const micRequired = lobby.mic_required ?? false;
            const ageLabel = lobby.age_restriction ? `${lobby.age_restriction}+` : "All ages";
            const spots = lobby.spots_available ?? 0;

            return (
              <div
                key={lobby.id}
                className="glass"
                style={{
                  ...gradientStyle(rankMin, rankMax),
                  borderRadius: 20,
                  padding: 12,
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr 0.9fr 1fr 0.9fr 1fr",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <div style={{ fontWeight: 700 }}>{rankLabel}</div>
                <div>{lobby.mode ?? ""}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {micRequired ? <Mic size={16} /> : <MicOff size={16} />}
                  <span>{micRequired ? "Required" : "Optional"}</span>
                </div>
                <div>{ageLabel}</div>
                <div>{timeAgoLabel(lobby.created_at, nowMs)}</div>
                <div>
                  {spots} {spots === 1 ? "spot" : "spots"}
                </div>
                <button
                  type="button"
                  onClick={() => void copyToClipboard(lobby.code)}
                  className="glass glass-sm"
                  style={{
                    borderRadius: 999,
                    padding: "10px 12px",
                    cursor: "pointer",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                  title="Copy code"
                >
                  <span style={{ fontWeight: 700 }}>{lobby.code}</span>
                  {copiedCode === lobby.code ? <Copy size={16} /> : <Copy size={16} />}
                </button>
              </div>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ marginTop: 16, display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
          {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => (
            <button
              key={page}
              type="button"
              className="glass glass-sm"
              onClick={() => setCurrentPage(page)}
              style={{
                borderRadius: 999,
                padding: "8px 12px",
                cursor: "pointer",
                border: "none",
                fontWeight: page === currentPage ? 800 : 600,
                outline: page === currentPage ? "2px solid rgba(0,0,0,0.35)" : "none",
              }}
            >
              {page}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

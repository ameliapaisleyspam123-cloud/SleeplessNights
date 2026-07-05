import { supabase, supabaseConfigStatus } from "@/supabase";

const STORAGE_KEY = "sleepless_nights_store_v1";
const SESSION_KEY = "sleepless_nights_user_v1";
const REMEMBER_KEY = "sleepless_nights_remembered_account_v1";
const SUPABASE_TABLE = "app_records";
const SUPABASE_ASSET_BUCKET = "campaign-assets";
const STORE_CACHE_TTL_MS = 30000;
const ENTITY_QUERY_CACHE_TTL_MS = 15000;
const GLOBAL_ADMIN_EMAIL = "ameliapaisleyspam123@gmail.com";

export const ENTITY_NAMES = [
  "Broadcast",
  "Campaign",
  "CharacterSheet",
  "Document",
  "Initiative",
  "LoreEntry",
  "Message",
  "PlayerNote",
  "Shop",
  "TimelineEvent",
  "User",
];

const subscribers = new Map();
let cachedStore = null;
let cachedStoreAt = 0;
let storeReadPromise = null;
let realtimeChannel = null;
const entityQueryCache = new Map();
let syncStatus = {
  configured: supabaseConfigStatus.configured,
  connected: false,
  message: supabaseConfigStatus.configured ? "Checking shared storage..." : "Supabase is not configured for this build.",
};

function emptyStore() {
  return Object.fromEntries(ENTITY_NAMES.map((name) => [name, []]));
}

function id(prefix = "rec") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function now() {
  return new Date().toISOString();
}

function code() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

function defaultStore() {
  const campaignId = id("campaign");
  const dmEmail = GLOBAL_ADMIN_EMAIL;
  return {
    Campaign: [
      {
        id: campaignId,
        name: "Sleepless Nights",
        description: "A Vercel-hostable campaign hub running on local app data.",
        dm_code: code(),
        player_code: code(),
        dm_email: dmEmail,
        player_emails: [],
        active: true,
        created_date: now(),
        updated_date: now(),
      },
    ],
    User: [
      {
        id: id("user"),
        email: dmEmail,
        full_name: "Amelia",
        display_name: "Amelia",
        campaign_id: campaignId,
        campaign_role: "dm",
        role: "admin",
        created_date: now(),
        updated_date: now(),
      },
    ],
    Broadcast: [],
    CharacterSheet: [],
    Document: [],
    Initiative: [],
    LoreEntry: [],
    Message: [],
    PlayerNote: [],
    Shop: [],
    TimelineEvent: [],
  };
}

function readStoredStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (parsed && typeof parsed === "object") return normalizeStore(parsed);
  } catch {
    return null;
  }
  return null;
}

function readStore() {
  const stored = readStoredStore();
  if (stored) return stored;
  const fresh = defaultStore();
  writeStore(fresh);
  return fresh;
}

function writeStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function normalizeEmail(email = "") {
  return email.trim().toLowerCase();
}

export function isGlobalAdminEmail(email) {
  return normalizeEmail(email) === GLOBAL_ADMIN_EMAIL;
}

function stableUserId(email) {
  const cleanEmail = normalizeEmail(email);
  const safeEmail = cleanEmail.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return safeEmail ? `user_${safeEmail}` : id("user");
}

function setCachedStore(store) {
  cachedStore = normalizeStore(store);
  cachedStoreAt = Date.now();
  return cachedStore;
}

function invalidateRemoteCache() {
  cachedStore = null;
  cachedStoreAt = 0;
  entityQueryCache.clear();
}

function getCachedStore() {
  if (!cachedStore) return null;
  if (Date.now() - cachedStoreAt > STORE_CACHE_TTL_MS) return null;
  return cachedStore;
}

function recordKey(entity, recordId) {
  return `${entity}:${recordId}`;
}

function dedupeUsers(users = []) {
  const byEmail = new Map();
  const withoutEmail = [];

  for (const user of users) {
    if (!user?.email) {
      withoutEmail.push(user);
      continue;
    }
    const email = normalizeEmail(user.email);
    const existing = byEmail.get(email);
    const next = existing ? newerRecord(existing, user) : user;
    byEmail.set(email, {
      ...next,
      email,
      display_name: next.display_name || next.full_name || email,
      full_name: next.full_name || next.display_name || email,
    });
  }

  return [...withoutEmail, ...byEmail.values()];
}

function dedupeRecords(entity, records = []) {
  if (entity === "User") return dedupeUsers(records);
  return records;
}

function normalizeStore(store) {
  const normalized = emptyStore();
  for (const name of ENTITY_NAMES) normalized[name] = dedupeRecords(name, Array.isArray(store?.[name]) ? store[name] : []);
  return normalized;
}

function newerRecord(first, second) {
  const firstTime = Date.parse(first?.updated_date || first?.created_date || "") || 0;
  const secondTime = Date.parse(second?.updated_date || second?.created_date || "") || 0;
  return secondTime > firstTime ? second : first;
}

function mergeStores(remoteStore, localStore) {
  const merged = normalizeStore(remoteStore);
  let changed = false;
  if (!localStore) return { store: merged, changed };

  const local = normalizeStore(localStore);
  for (const entity of ENTITY_NAMES) {
    const byId = new Map((merged[entity] || []).map((record) => [record.id, record]));
    for (const localRecord of local[entity] || []) {
      if (!localRecord?.id) continue;
      const remoteRecord = byId.get(localRecord.id);
      const nextRecord = remoteRecord ? newerRecord(remoteRecord, localRecord) : localRecord;
      if (!remoteRecord || nextRecord !== remoteRecord) {
        byId.set(localRecord.id, nextRecord);
        changed = true;
      }
    }
    merged[entity] = [...byId.values()];
  }

  return { store: merged, changed };
}

async function readStoreAsync() {
  startRealtimeSync();
  if (!supabase) {
    syncStatus = {
      configured: false,
      connected: false,
      message: supabaseConfigStatus.hasUrl
        ? "Supabase key is missing from the deployed app."
        : "Supabase URL is missing from the deployed app.",
    };
    return readStore();
  }
  const cached = getCachedStore();
  if (cached) return cached;
  if (storeReadPromise) return storeReadPromise;

  storeReadPromise = (async () => {
    const { data, error } = await supabase.from(SUPABASE_TABLE).select("entity,data");
    if (error) {
      console.warn("Supabase read failed; falling back to browser storage.", error);
      syncStatus = {
        configured: true,
        connected: false,
        message: `Shared storage read failed: ${error.message || "unknown Supabase error"}`,
      };
      return setCachedStore(readStore());
    }

    const store = emptyStore();
    for (const row of data || []) {
      if (ENTITY_NAMES.includes(row.entity) && row.data) store[row.entity].push(row.data);
    }

    const hasRemoteData = Object.values(store).some((records) => records.length > 0);
    const localStore = hasRemoteData ? null : readStoredStore();
    const baseStore = hasRemoteData ? store : localStore || defaultStore();
    const { store: mergedStore, changed: mergedChanged } = hasRemoteData
      ? { store: baseStore, changed: false }
      : mergeStores(baseStore, localStore);
    const { store: adminStore, changed: adminChanged } = ensureGlobalAdmin(mergedStore);
    writeStore(adminStore);
    setCachedStore(adminStore);
    if (mergedChanged || adminChanged || !hasRemoteData) {
      await writeStoreAsync(adminStore);
    }
    syncStatus = {
      configured: true,
      connected: true,
      message: "Shared storage connected.",
    };
    return adminStore;
  })();

  try {
    return await storeReadPromise;
  } catch (err) {
    console.warn("Supabase read threw error; using local storage:", err);
    syncStatus = {
      configured: true,
      connected: false,
      message: `Shared storage error: ${err.message || "unknown error"}`,
    };
    return setCachedStore(readStore());
  } finally {
    storeReadPromise = null;
  }
}

function ensureGlobalAdmin(store) {
  const next = normalizeStore(store);
  const adminCampaign =
    next.Campaign.find((campaign) => campaign.name?.toLowerCase() === "sleepless nights") ||
    next.Campaign.find((campaign) => campaign.active) ||
    next.Campaign[0];
  const adminIndex = next.User.findIndex((user) => isGlobalAdminEmail(user.email));
  let changed = false;

  if (adminCampaign && adminCampaign.dm_email !== GLOBAL_ADMIN_EMAIL) {
    adminCampaign.dm_email = GLOBAL_ADMIN_EMAIL;
    adminCampaign.updated_date = now();
    changed = true;
  }

  if (adminIndex === -1) {
    next.User.push({
      id: stableUserId(GLOBAL_ADMIN_EMAIL),
      email: GLOBAL_ADMIN_EMAIL,
      full_name: "Amelia",
      display_name: "Amelia",
      campaign_id: adminCampaign?.id || "",
      campaign_role: "dm",
      role: "admin",
      created_date: now(),
      updated_date: now(),
    });
    changed = true;
  } else {
    const admin = next.User[adminIndex];
    const updated = {
      ...admin,
      email: GLOBAL_ADMIN_EMAIL,
      full_name: admin.full_name || "Amelia",
      display_name: admin.display_name || admin.full_name || "Amelia",
      campaign_id: admin.campaign_id || adminCampaign?.id || "",
      campaign_role: "dm",
      role: "admin",
      updated_date: now(),
    };
    if (JSON.stringify(admin) !== JSON.stringify(updated)) {
      next.User[adminIndex] = updated;
      changed = true;
    }
  }

  return { store: next, changed };
}

function startRealtimeSync() {
  if (!supabase || realtimeChannel) return;
  realtimeChannel = supabase
    .channel("app-records-sync")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: SUPABASE_TABLE },
      (payload) => {
        invalidateRemoteCache();
        const row = payload.new || payload.old;
        if (row?.entity && ENTITY_NAMES.includes(row.entity)) {
          notify(row.entity, { type: payload.eventType?.toLowerCase?.() || "remote", data: row.data || { id: row.record_id } });
        }
      },
    )
    .subscribe();
}

async function writeStoreAsync(store) {
  const normalized = normalizeStore(store);
  writeStore(normalized);
  setCachedStore(normalized);
  if (!supabase) return normalized;

  try {
    const rows = ENTITY_NAMES.flatMap((entity) =>
      (normalized[entity] || []).map((record) => ({
        id: recordKey(entity, record.id),
        entity,
        record_id: record.id,
        data: record,
        created_date: record.created_date || now(),
        updated_date: record.updated_date || now(),
      })),
    );

    if (rows.length === 0) return normalized;
    const { error } = await supabase.from(SUPABASE_TABLE).upsert(rows, { onConflict: "id" });
    if (error) {
      syncStatus = {
        configured: true,
        connected: false,
        message: `Shared storage write failed: ${error.message || "unknown Supabase error"}`,
      };
      console.warn("Supabase writeStoreAsync failed; continuing with local storage only:", error);
    }
  } catch (err) {
    syncStatus = {
      configured: true,
      connected: false,
      message: `Shared storage write error: ${err.message || "unknown error"}`,
    };
    console.warn("Supabase writeStoreAsync threw error; continuing with local storage only:", err);
  }
  return normalized;
}

async function clearRemoteStore() {
  if (!supabase) return;
  try {
    const { error } = await supabase.from(SUPABASE_TABLE).delete().neq("id", "");
    if (error) {
      console.warn("Supabase clearRemoteStore failed:", error);
    }
  } catch (err) {
    console.warn("Supabase clearRemoteStore threw error:", err);
  }
}

async function upsertRemoteRecord(entity, record) {
  entityQueryCache.clear();
  if (cachedStore) {
    const current = normalizeStore(cachedStore);
    const records = current[entity] || [];
    const index = records.findIndex((item) => item.id === record.id);
    current[entity] = index === -1 ? [...records, record] : records.map((item) => (item.id === record.id ? record : item));
    setCachedStore(current);
  }
  if (!supabase) return;
  try {
    const { error } = await supabase.from(SUPABASE_TABLE).upsert(
      {
        id: recordKey(entity, record.id),
        entity,
        record_id: record.id,
        data: record,
        created_date: record.created_date || now(),
        updated_date: record.updated_date || now(),
      },
      { onConflict: "id" },
    );
    if (error) {
      console.warn("Supabase upsert for", entity, "failed; continuing with local storage only:", error);
    }
  } catch (err) {
    console.warn("Supabase upsert for", entity, "threw error; continuing with local storage only:", err);
  }
}

async function deleteRemoteRecord(entity, recordId) {
  entityQueryCache.clear();
  if (cachedStore) {
    const current = normalizeStore(cachedStore);
    current[entity] = (current[entity] || []).filter((record) => record.id !== recordId);
    setCachedStore(current);
  }
  if (!supabase) return;
  try {
    const { error } = await supabase.from(SUPABASE_TABLE).delete().eq("id", recordKey(entity, recordId));
    if (error) {
      console.warn("Supabase delete failed:", error);
    }
  } catch (err) {
    console.warn("Supabase delete threw error:", err);
  }
}

function normalizeImportPayload(payload) {
  const source = payload?.entities || payload?.data || payload;
  const normalized = Object.fromEntries(ENTITY_NAMES.map((name) => [name, []]));
  for (const name of ENTITY_NAMES) {
    const records = source?.[name] || source?.[name.toLowerCase()] || source?.[`${name}s`] || [];
    normalized[name] = Array.isArray(records) ? records : [];
  }
  return normalized;
}

function currentSession() {
  const store = readStore();
  const savedEmail = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
  if (savedEmail) {
    const found = store.User.find((u) => u.email === savedEmail);
    if (found) return found;
  }
  return null;
}

async function currentSessionAsync() {
  const savedEmail = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
  if (savedEmail) {
    const [remoteUser] = (await readRemoteEntity("User", { email: savedEmail }, "-updated_date", 1)) || [];
    if (remoteUser) return remoteUser;
    const store = await readStoreAsync();
    const found = store.User.find((u) => u.email === savedEmail);
    if (found) return found;
  }
  return null;
}

function findUserByEmail(store, email) {
  return store.User.find((user) => normalizeEmail(user.email) === normalizeEmail(email));
}

function saveUserSession(email, keepSignedIn = true) {
  if (!email) return;
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
  const storage = keepSignedIn ? localStorage : sessionStorage;
  storage.setItem(SESSION_KEY, email);
}

function readRememberedAccount() {
  try {
    const remembered = JSON.parse(localStorage.getItem(REMEMBER_KEY) || "null");
    if (remembered && typeof remembered === "object") return remembered;
  } catch {
    return null;
  }
  return null;
}

function saveRememberedAccount(account, keepSignedIn) {
  if (!keepSignedIn) {
    localStorage.removeItem(REMEMBER_KEY);
    return;
  }
  localStorage.setItem(
    REMEMBER_KEY,
    JSON.stringify({
      email: normalizeEmail(account.email),
      password: account.password || "",
      display_name: account.display_name || account.full_name || "",
    }),
  );
}

function ensurePasswordMatches(user, password) {
  if (!user.password) return true;
  return user.password === password;
}

function sortRecords(records, sort) {
  if (!sort) return [...records];
  const descending = sort.startsWith("-");
  const key = descending ? sort.slice(1) : sort;
  return [...records].sort((a, b) => {
    const av = a[key] || "";
    const bv = b[key] || "";
    return descending ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
  });
}

function matches(record, query = {}) {
  return Object.entries(query).every(([key, value]) => record[key] === value);
}

function entityCacheKey(entity, query, sort, limit) {
  return JSON.stringify([entity, query || {}, sort || "", limit || 0]);
}

async function readRemoteEntity(entity, query = {}, sort = "-created_date", limit = 1000) {
  if (!supabase) return null;
  const cacheKey = entityCacheKey(entity, query, sort, limit);
  const cached = entityQueryCache.get(cacheKey);
  if (cached && Date.now() - cached.at < ENTITY_QUERY_CACHE_TTL_MS) return cached.records;

  try {
    let request = supabase.from(SUPABASE_TABLE).select("data").eq("entity", entity);
    Object.entries(query || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) request = request.eq(`data->>${key}`, String(value));
    });
    const { data, error } = await request.limit(Math.max(limit * 3, limit, 100));
    if (error) throw error;
    const records = sortRecords(dedupeRecords(entity, (data || []).map((row) => row.data).filter(Boolean).filter((record) => matches(record, query))), sort).slice(0, limit);
    entityQueryCache.set(cacheKey, { at: Date.now(), records });
    syncStatus = {
      configured: true,
      connected: true,
      message: "Shared storage connected.",
    };
    return records;
  } catch (err) {
    console.warn("Supabase entity read failed; falling back to full store:", entity, err);
    return null;
  }
}

function isDmAccount(user) {
  return user?.campaign_role === "dm" || user?.campaign_role === "DM" || user?.role === "admin" || isGlobalAdminEmail(user?.email);
}

function stripSensitiveUserFields(user) {
  if (!user || typeof user !== "object") return user;
  const { password, ...safeUser } = user;
  return safeUser;
}

async function sanitizeEntityRecords(entity, records) {
  if (entity !== "User") return records;
  const currentUser = await currentSessionAsync().catch(() => null);
  if (isGlobalAdminEmail(currentUser?.email)) return records;
  return Array.isArray(records) ? records.map(stripSensitiveUserFields) : records;
}

function canAccessMessageChannel(user, channel) {
  if (!user || !channel) return false;
  if (channel === "group") return true;
  if (isDmAccount(user)) return true;
  return channel.split("|").includes(user.email);
}

function notify(entity, event) {
  for (const cb of subscribers.get(entity) || []) cb(event);
}

function entityApi(entity) {
  return {
    async list(sort = "-created_date", limit = 1000) {
      const remoteRecords = await readRemoteEntity(entity, {}, sort, limit);
      if (remoteRecords) return sanitizeEntityRecords(entity, remoteRecords);
      const store = await readStoreAsync();
      return sanitizeEntityRecords(entity, sortRecords(store[entity] || [], sort).slice(0, limit));
    },
    async filter(query = {}, sort = "-created_date", limit = 1000) {
      const remoteRecords = await readRemoteEntity(entity, query, sort, limit);
      if (remoteRecords) return sanitizeEntityRecords(entity, remoteRecords);
      const store = await readStoreAsync();
      return sanitizeEntityRecords(entity, sortRecords((store[entity] || []).filter((record) => matches(record, query)), sort).slice(0, limit));
    },
    async get(recordId) {
      const [remoteRecord] = (await readRemoteEntity(entity, { id: recordId }, "-updated_date", 1)) || [];
      if (remoteRecord) return (await sanitizeEntityRecords(entity, [remoteRecord]))[0] || null;
      const store = await readStoreAsync();
      const record = (store[entity] || []).find((record) => record.id === recordId) || null;
      return record ? (await sanitizeEntityRecords(entity, [record]))[0] || null : null;
    },
    async create(data) {
      if (supabase) {
        const user = await currentSessionAsync();
        const record = {
          ...data,
          id: data.id || id(entity.toLowerCase()),
          created_by: data.created_by || user?.email,
          created_date: data.created_date || now(),
          updated_date: now(),
        };
        await upsertRemoteRecord(entity, record);
        const localStore = readStoredStore();
        if (localStore) {
          const next = normalizeStore(localStore);
          next[entity] = [...(next[entity] || []).filter((item) => item.id !== record.id), record];
          writeStore(next);
        }
        notify(entity, { type: "create", data: record });
        return record;
      }
      const store = await readStoreAsync();
      const user = await currentSessionAsync();
      const record = {
        ...data,
        id: data.id || id(entity.toLowerCase()),
        created_by: data.created_by || user?.email,
        created_date: data.created_date || now(),
        updated_date: now(),
      };
      store[entity].push(record);
      writeStore(store);
      await upsertRemoteRecord(entity, record);
      notify(entity, { type: "create", data: record });
      return record;
    },
    async update(recordId, patch) {
      if (supabase) {
        const [existing] = (await readRemoteEntity(entity, { id: recordId }, "-updated_date", 1)) || [];
        if (!existing) throw new Error(`${entity} record not found`);
        const record = { ...existing, ...patch, updated_date: now() };
        await upsertRemoteRecord(entity, record);
        const localStore = readStoredStore();
        if (localStore) {
          const next = normalizeStore(localStore);
          next[entity] = (next[entity] || []).map((item) => (item.id === recordId ? record : item));
          if (!next[entity].some((item) => item.id === recordId)) next[entity].push(record);
          writeStore(next);
        }
        notify(entity, { type: "update", data: record });
        return record;
      }
      const store = await readStoreAsync();
      const index = store[entity].findIndex((record) => record.id === recordId);
      if (index === -1) throw new Error(`${entity} record not found`);
      const record = { ...store[entity][index], ...patch, updated_date: now() };
      store[entity][index] = record;
      writeStore(store);
      await upsertRemoteRecord(entity, record);
      notify(entity, { type: "update", data: record });
      return record;
    },
    async delete(recordId) {
      if (supabase) {
        await deleteRemoteRecord(entity, recordId);
        const localStore = readStoredStore();
        if (localStore) {
          const next = normalizeStore(localStore);
          next[entity] = (next[entity] || []).filter((record) => record.id !== recordId);
          writeStore(next);
        }
        notify(entity, { type: "delete", data: { id: recordId } });
        return true;
      }
      const store = await readStoreAsync();
      store[entity] = store[entity].filter((record) => record.id !== recordId);
      writeStore(store);
      await deleteRemoteRecord(entity, recordId);
      notify(entity, { type: "delete", data: { id: recordId } });
      return true;
    },
    subscribe(callback) {
      startRealtimeSync();
      const set = subscribers.get(entity) || new Set();
      set.add(callback);
      subscribers.set(entity, set);
      return () => set.delete(callback);
    },
  };
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function cleanFileName(name = "upload") {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "upload";
}

async function uploadSharedFile(file, options = {}) {
  if (!supabase) return { file_url: await fileToDataUrl(file), storage: "local" };

  const campaignSegment = cleanFileName(options.campaign_id || "shared");
  const path = `${campaignSegment}/${new Date().toISOString().slice(0, 10)}/${id("asset")}-${cleanFileName(file.name || "upload")}`;
  const { error } = await supabase.storage.from(SUPABASE_ASSET_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (error) {
    console.warn("Supabase Storage upload failed; falling back to embedded file data:", error);
    return { file_url: await fileToDataUrl(file), storage: "embedded" };
  }

  if (options.previousPath && options.previousPath !== path) {
    await deleteSharedFile(options.previousPath);
  }

  const { data } = supabase.storage.from(SUPABASE_ASSET_BUCKET).getPublicUrl(path);
  return { file_url: data.publicUrl, storage: "supabase", path };
}

function storagePathFromUrl(value = "") {
  const marker = `/storage/v1/object/public/${SUPABASE_ASSET_BUCKET}/`;
  const index = String(value).indexOf(marker);
  if (index === -1) return "";
  return decodeURIComponent(String(value).slice(index + marker.length).split("?")[0]);
}

async function deleteSharedFile(pathOrUrl) {
  if (!supabase || !pathOrUrl) return false;
  const path = storagePathFromUrl(pathOrUrl) || pathOrUrl;
  if (!path || path.startsWith("data:")) return false;
  try {
    const { error } = await supabase.storage.from(SUPABASE_ASSET_BUCKET).remove([path]);
    if (error) {
      console.warn("Supabase Storage delete failed:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Supabase Storage delete threw error:", err);
    return false;
  }
}

const entities = Object.fromEntries(ENTITY_NAMES.map((name) => [name, entityApi(name)]));

export const appClient = {
  entities,
  system: {
    getSyncStatus() {
      return syncStatus;
    },
  },
  data: {
    async export() {
      return readStoreAsync();
    },
    async import(payload, { mode = "merge" } = {}) {
      const incoming = normalizeImportPayload(payload);
      const current = mode === "replace" ? emptyStore() : await readStoreAsync();
      for (const name of ENTITY_NAMES) {
        const byId = new Map((current[name] || []).map((record) => [record.id, record]));
        for (const record of incoming[name]) {
          const recordWithId = {
            ...record,
            id: record.id || id(name.toLowerCase()),
            created_date: record.created_date || now(),
            updated_date: record.updated_date || now(),
          };
          byId.set(recordWithId.id, recordWithId);
        }
        current[name] = [...byId.values()];
      }
      if (mode === "replace") await clearRemoteStore();
      await writeStoreAsync(current);
      for (const name of ENTITY_NAMES) notify(name, { type: "import", data: null });
      return current;
    },
    async reset() {
      const fresh = defaultStore();
      await clearRemoteStore();
      await writeStoreAsync(fresh);
      localStorage.removeItem(SESSION_KEY);
      return fresh;
    },
  },
  auth: {
    rememberedAccount() {
      return readRememberedAccount();
    },
    async me() {
      const user = await currentSessionAsync();
      if (!user) throw new Error("No local user exists");
      return user;
    },
    async createAccount({ email, password, full_name, display_name, keepSignedIn = true }) {
      const store = await readStoreAsync();
      const cleanEmail = normalizeEmail(email);
      if (!cleanEmail) throw new Error("Email is required");
      if (!password?.trim()) throw new Error("Password is required");
      if (findUserByEmail(store, cleanEmail)) throw new Error("An account already exists for this email");
      const user = {
        id: stableUserId(cleanEmail),
        email: cleanEmail,
        password,
        full_name: full_name || display_name || cleanEmail,
        display_name: display_name || full_name || cleanEmail,
        role: isGlobalAdminEmail(cleanEmail) ? "admin" : "user",
        campaign_role: "",
        created_date: now(),
        updated_date: now(),
      };
      store.User.push(user);
      writeStore(store);
      await upsertRemoteRecord("User", user);
      saveUserSession(cleanEmail, keepSignedIn);
      saveRememberedAccount({ ...user, password }, keepSignedIn);
      notify("User", { type: "create", data: user });
      return user;
    },
    async login({ email, password = "", full_name, display_name, keepSignedIn = true }) {
      const store = await readStoreAsync();
      const cleanEmail = normalizeEmail(email);
      if (!cleanEmail) throw new Error("Email is required");
      let user = findUserByEmail(store, cleanEmail);
      if (!user) throw new Error("No account exists for this email");
      if (!ensurePasswordMatches(user, password)) throw new Error("Invalid email or password");
      user = {
        ...user,
        full_name: full_name || user.full_name || display_name || cleanEmail,
        display_name: display_name || full_name || user.display_name || cleanEmail,
        password: user.password || password || user.password,
        role: isGlobalAdminEmail(cleanEmail) ? "admin" : user.role,
        campaign_role: isGlobalAdminEmail(cleanEmail) && user.campaign_id ? "dm" : user.campaign_role,
        updated_date: now(),
      };
      store.User = store.User.map((existing) => (existing.id === user.id ? user : existing));
      writeStore(store);
      await upsertRemoteRecord("User", user);
      saveUserSession(cleanEmail, keepSignedIn);
      saveRememberedAccount({ ...user, password: password || user.password }, keepSignedIn);
      notify("User", { type: "update", data: user });
      return user;
    },
    async updateMe(patch) {
      const user = await this.me();
      return entities.User.update(user.id, patch);
    },
    async switchCampaign({ email, display_name, campaign_id, campaign_role, role }) {
      const store = await readStoreAsync();
      const cleanEmail = normalizeEmail(email);
      let user = findUserByEmail(store, cleanEmail);
      if (!user) {
        user = await this.createAccount({
          email: cleanEmail,
          password: id("password"),
          display_name,
          full_name: display_name,
        });
      }
      const updated = await entities.User.update(user.id, {
        display_name: display_name || user.display_name,
        full_name: display_name || user.full_name,
        campaign_id,
        campaign_role: isGlobalAdminEmail(cleanEmail) ? "dm" : campaign_role,
        role: isGlobalAdminEmail(cleanEmail) ? "admin" : role,
        last_seen_at: "",
      });
      saveUserSession(updated.email, Boolean(localStorage.getItem(SESSION_KEY)));
      return updated;
    },
    async logout() {
      try {
        const user = await currentSessionAsync();
        if (user?.id) await entities.User.update(user.id, { last_seen_at: "" });
      } catch {
        // Best effort only; local sign-out should still continue.
      } finally {
        sessionStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(SESSION_KEY);
        window.location.assign("/campaign");
      }
    },
    redirectToLogin() {
      window.location.assign("/campaign");
    },
  },
  functions: {
    async invoke(name, payload = {}) {
      if (name === "getUsers") {
        const users = await entities.User.list("display_name", 200);
        return { data: { users } };
      }
      if (name === "getMessages") {
        const user = await appClient.auth.me();
        if (!canAccessMessageChannel(user, payload.channel)) return { data: { messages: [] } };
        const messages = (await entities.Message.filter({ channel: payload.channel }, "created_date", 500))
          .filter((message) => message.campaign_id === user.campaign_id);
        return { data: { messages } };
      }
      if (name === "sendMessages") {
        const user = await appClient.auth.me();
        if (!canAccessMessageChannel(user, payload.channel)) throw new Error("You cannot send messages to this channel");
        const file_url = payload.file?.data ? `data:${payload.file.type};base64,${payload.file.data}` : "";
        const message = await entities.Message.create({
          campaign_id: user.campaign_id,
          content: payload.content,
          channel: payload.channel,
          recipient_email: payload.recipient_email,
          file_url,
          file_type: payload.file?.type?.includes("pdf") ? "pdf" : payload.file ? "image" : "",
        });
        return { data: { message } };
      }
      throw new Error(`Unknown local function: ${name}`);
    },
  },
  integrations: {
    Core: {
      async UploadFile({ file }) {
        const user = await appClient.auth.me().catch(() => null);
        return uploadSharedFile(file, { campaign_id: user?.campaign_id });
      },
      async ReplaceFile({ file, previousPath, previousUrl }) {
        const user = await appClient.auth.me().catch(() => null);
        return uploadSharedFile(file, { campaign_id: user?.campaign_id, previousPath: previousPath || storagePathFromUrl(previousUrl) });
      },
      async DeleteFile({ path, url }) {
        return deleteSharedFile(path || storagePathFromUrl(url));
      },
    },
  },
};

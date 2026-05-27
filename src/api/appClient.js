import { supabase } from "@/supabase";

const STORAGE_KEY = "sleepless_nights_store_v1";
const SESSION_KEY = "sleepless_nights_user_v1";
const SUPABASE_TABLE = "app_records";
const STORE_CACHE_TTL_MS = 8000;

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
  "User",
];

const subscribers = new Map();
let cachedStore = null;
let cachedStoreAt = 0;
let storeReadPromise = null;

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
  const dmEmail = "ameliapaisleyspam123@gmail.com";
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
  };
}

function readStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (parsed && typeof parsed === "object") {
      for (const name of ENTITY_NAMES) parsed[name] ||= [];
      return parsed;
    }
  } catch {
    // Fall through and recreate.
  }
  const fresh = defaultStore();
  writeStore(fresh);
  return fresh;
}

function writeStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function setCachedStore(store) {
  cachedStore = normalizeStore(store);
  cachedStoreAt = Date.now();
  return cachedStore;
}

function getCachedStore() {
  if (!cachedStore) return null;
  if (Date.now() - cachedStoreAt > STORE_CACHE_TTL_MS) return null;
  return cachedStore;
}

function recordKey(entity, recordId) {
  return `${entity}:${recordId}`;
}

function normalizeStore(store) {
  const normalized = emptyStore();
  for (const name of ENTITY_NAMES) normalized[name] = Array.isArray(store?.[name]) ? store[name] : [];
  return normalized;
}

async function readStoreAsync() {
  if (!supabase) return readStore();
  const cached = getCachedStore();
  if (cached) return cached;
  if (storeReadPromise) return storeReadPromise;

  storeReadPromise = (async () => {
    const { data, error } = await supabase.from(SUPABASE_TABLE).select("entity,data");
    if (error) {
      console.warn("Supabase read failed; falling back to browser storage.", error);
      return setCachedStore(readStore());
    }

    const store = emptyStore();
    for (const row of data || []) {
      if (ENTITY_NAMES.includes(row.entity) && row.data) store[row.entity].push(row.data);
    }

    const hasRemoteData = Object.values(store).some((records) => records.length > 0);
    if (!hasRemoteData) {
      const local = readStore();
      await writeStoreAsync(local);
      return setCachedStore(local);
    }

    writeStore(store);
    return setCachedStore(store);
  })();

  try {
    return await storeReadPromise;
  } catch (err) {
    console.warn("Supabase read threw error; using local storage:", err);
    return setCachedStore(readStore());
  } finally {
    storeReadPromise = null;
  }
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
      console.warn("Supabase writeStoreAsync failed; continuing with local storage only:", error);
    }
  } catch (err) {
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
  const store = await readStoreAsync();
  const savedEmail = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
  if (savedEmail) {
    const found = store.User.find((u) => u.email === savedEmail);
    if (found) return found;
  }
  return null;
}

function findUserByEmail(store, email) {
  return store.User.find((user) => user.email?.toLowerCase() === email?.toLowerCase());
}

function saveUserSession(email, keepSignedIn = true) {
  if (!email) return;
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
  const storage = keepSignedIn ? localStorage : sessionStorage;
  storage.setItem(SESSION_KEY, email);
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

function isDmAccount(user) {
  return user?.campaign_role === "dm" || user?.campaign_role === "DM" || user?.role === "admin";
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
      const store = await readStoreAsync();
      return sortRecords(store[entity] || [], sort).slice(0, limit);
    },
    async filter(query = {}, sort = "-created_date", limit = 1000) {
      const store = await readStoreAsync();
      return sortRecords((store[entity] || []).filter((record) => matches(record, query)), sort).slice(0, limit);
    },
    async get(recordId) {
      const store = await readStoreAsync();
      return (store[entity] || []).find((record) => record.id === recordId) || null;
    },
    async create(data) {
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
      const store = await readStoreAsync();
      store[entity] = store[entity].filter((record) => record.id !== recordId);
      writeStore(store);
      await deleteRemoteRecord(entity, recordId);
      notify(entity, { type: "delete", data: { id: recordId } });
      return true;
    },
    subscribe(callback) {
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

const entities = Object.fromEntries(ENTITY_NAMES.map((name) => [name, entityApi(name)]));

export const appClient = {
  entities,
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
    async me() {
      const user = await currentSessionAsync();
      if (!user) throw new Error("No local user exists");
      return user;
    },
    async createAccount({ email, password, full_name, display_name, keepSignedIn = true }) {
      const store = await readStoreAsync();
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) throw new Error("Email is required");
      if (!password?.trim()) throw new Error("Password is required");
      if (findUserByEmail(store, cleanEmail)) throw new Error("An account already exists for this email");
      const user = {
        id: id("user"),
        email: cleanEmail,
        password,
        full_name: full_name || display_name || cleanEmail,
        display_name: display_name || full_name || cleanEmail,
        role: "user",
        campaign_role: "",
        created_date: now(),
        updated_date: now(),
      };
      store.User.push(user);
      writeStore(store);
      await upsertRemoteRecord("User", user);
      saveUserSession(cleanEmail, keepSignedIn);
      notify("User", { type: "create", data: user });
      return user;
    },
    async login({ email, password = "", full_name, display_name, keepSignedIn = true }) {
      const store = await readStoreAsync();
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) throw new Error("Email is required");
      let user = findUserByEmail(store, cleanEmail);
      if (!user) throw new Error("No account exists for this email");
      if (!ensurePasswordMatches(user, password)) throw new Error("Invalid email or password");
      user = {
        ...user,
        full_name: full_name || user.full_name || display_name || cleanEmail,
        display_name: display_name || full_name || user.display_name || cleanEmail,
        password: user.password || password || user.password,
        updated_date: now(),
      };
      store.User = store.User.map((existing) => (existing.id === user.id ? user : existing));
      writeStore(store);
      await upsertRemoteRecord("User", user);
      saveUserSession(cleanEmail, keepSignedIn);
      notify("User", { type: "update", data: user });
      return user;
    },
    async updateMe(patch) {
      const user = await this.me();
      return entities.User.update(user.id, patch);
    },
    async switchCampaign({ email, display_name, campaign_id, campaign_role, role }) {
      const store = await readStoreAsync();
      const cleanEmail = email.trim().toLowerCase();
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
        campaign_role,
        role,
      });
      saveUserSession(updated.email, Boolean(localStorage.getItem(SESSION_KEY)));
      return updated;
    },
    logout() {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_KEY);
      window.location.assign("/campaign");
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
        return { file_url: await fileToDataUrl(file) };
      },
    },
  },
};

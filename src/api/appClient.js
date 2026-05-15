const STORAGE_KEY = "sleepless_nights_store_v1";
const SESSION_KEY = "sleepless_nights_user_v1";

export const ENTITY_NAMES = [
  "Broadcast",
  "Campaign",
  "CharacterSheet",
  "Document",
  "Initiative",
  "LoreEntry",
  "Message",
  "PlayerNote",
  "User",
];

const subscribers = new Map();

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
  const savedEmail = localStorage.getItem(SESSION_KEY);
  if (savedEmail) {
    const found = store.User.find((u) => u.email === savedEmail);
    if (found) return found;
  }
  const user = store.User[0];
  if (user) localStorage.setItem(SESSION_KEY, user.email);
  return user;
}

function findUserByEmail(store, email) {
  return store.User.find((user) => user.email?.toLowerCase() === email?.toLowerCase());
}

function saveUserSession(email) {
  if (email) localStorage.setItem(SESSION_KEY, email);
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

function notify(entity, event) {
  for (const cb of subscribers.get(entity) || []) cb(event);
}

function entityApi(entity) {
  return {
    async list(sort = "-created_date", limit = 1000) {
      return sortRecords(readStore()[entity] || [], sort).slice(0, limit);
    },
    async filter(query = {}, sort = "-created_date", limit = 1000) {
      return sortRecords((readStore()[entity] || []).filter((record) => matches(record, query)), sort).slice(0, limit);
    },
    async get(recordId) {
      return (readStore()[entity] || []).find((record) => record.id === recordId) || null;
    },
    async create(data) {
      const store = readStore();
      const user = currentSession();
      const record = {
        ...data,
        id: data.id || id(entity.toLowerCase()),
        created_by: data.created_by || user?.email,
        created_date: data.created_date || now(),
        updated_date: now(),
      };
      store[entity].push(record);
      writeStore(store);
      notify(entity, { type: "create", data: record });
      return record;
    },
    async update(recordId, patch) {
      const store = readStore();
      const index = store[entity].findIndex((record) => record.id === recordId);
      if (index === -1) throw new Error(`${entity} record not found`);
      const record = { ...store[entity][index], ...patch, updated_date: now() };
      store[entity][index] = record;
      writeStore(store);
      notify(entity, { type: "update", data: record });
      return record;
    },
    async delete(recordId) {
      const store = readStore();
      store[entity] = store[entity].filter((record) => record.id !== recordId);
      writeStore(store);
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
    export() {
      return readStore();
    },
    import(payload, { mode = "merge" } = {}) {
      const incoming = normalizeImportPayload(payload);
      const current = mode === "replace" ? Object.fromEntries(ENTITY_NAMES.map((name) => [name, []])) : readStore();
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
      writeStore(current);
      for (const name of ENTITY_NAMES) notify(name, { type: "import", data: null });
      return current;
    },
    reset() {
      const fresh = defaultStore();
      writeStore(fresh);
      localStorage.removeItem(SESSION_KEY);
      return fresh;
    },
  },
  auth: {
    async me() {
      const user = currentSession();
      if (!user) throw new Error("No local user exists");
      return user;
    },
    async login({ email, full_name, display_name }) {
      const store = readStore();
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) throw new Error("Email is required");
      let user = findUserByEmail(store, cleanEmail);
      if (user) {
        user = {
          ...user,
          full_name: full_name || user.full_name || display_name || cleanEmail,
          display_name: display_name || full_name || user.display_name || cleanEmail,
          updated_date: now(),
        };
        store.User = store.User.map((existing) => (existing.id === user.id ? user : existing));
      } else {
        user = {
          id: id("user"),
          email: cleanEmail,
          full_name: full_name || display_name || cleanEmail,
          display_name: display_name || full_name || cleanEmail,
          role: "user",
          campaign_role: "",
          created_date: now(),
          updated_date: now(),
        };
        store.User.push(user);
      }
      writeStore(store);
      saveUserSession(cleanEmail);
      notify("User", { type: "update", data: user });
      return user;
    },
    async updateMe(patch) {
      const user = await this.me();
      return entities.User.update(user.id, patch);
    },
    async switchCampaign({ email, display_name, campaign_id, campaign_role, role }) {
      const user = await this.login({ email, display_name, full_name: display_name });
      const updated = await entities.User.update(user.id, {
        display_name: display_name || user.display_name,
        full_name: display_name || user.full_name,
        campaign_id,
        campaign_role,
        role,
      });
      saveUserSession(updated.email);
      return updated;
    },
    logout() {
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
        const messages = await entities.Message.filter({ channel: payload.channel }, "created_date", 500);
        return { data: { messages } };
      }
      if (name === "sendMessages") {
        const user = await appClient.auth.me();
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

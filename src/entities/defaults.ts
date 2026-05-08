import type {
  Broadcast,
  Campaign,
  CharacterSheet,
  Document,
  Initiative,
  LoreEntry,
  Message,
  PlayerNote,
} from "./types";

export const broadcastDefaults: Partial<Broadcast> = {
  active: false,
  target_emails: [],
};

export const campaignDefaults: Partial<Campaign> = {
  active: true,
  player_emails: [],
};

export const characterSheetDefaults: Partial<CharacterSheet> = {
  level: 1,
  experience_points: 0,
  inspiration: false,
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
  hp_max: 10,
  hp_current: 10,
  hp_temp: 0,
  ac: 10,
  initiative: 0,
  speed: 30,
  proficiency_bonus: 2,
  death_save_successes: 0,
  death_save_failures: 0,
  passive_perception: 10,
  cp: 0,
  sp: 0,
  ep: 0,
  gp: 0,
  pp: 0,
  spell_save_dc: 8,
  spell_attack_bonus: 0,
  visibility: "public",
  allowed_emails: [],
};

export const documentDefaults: Partial<Document> = {
  visibility: "public",
  allowed_emails: [],
};

export const initiativeDefaults: Partial<Initiative> = {
  active: false,
  turn_seconds: 6,
  current_turn_index: 0,
  entries: [],
  spells: [],
  round: 1,
};

export const loreEntryDefaults: Partial<LoreEntry> = {
  category: "other",
  tags: [],
  visibility: "public",
  allowed_emails: [],
};

export const messageDefaults: Partial<Message> = {};

export const playerNoteDefaults: Partial<PlayerNote> = {};

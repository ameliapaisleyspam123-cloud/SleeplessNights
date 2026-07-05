export interface AppRecord {
  id?: string;
  created_date?: string;
  updated_date?: string;
  created_by?: string;
}

export interface Broadcast extends AppRecord {
  campaign_id?: string;
  active?: boolean;
  title?: string;
  message?: string;
  image_url?: string;
  video_url?: string;
  lore_entry_id?: string;
  target_emails?: string[];
  archived?: boolean;
}

export interface Campaign extends AppRecord {
  name: string;
  description?: string;
  dm_code: string;
  player_code: string;
  dm_email?: string;
  player_emails?: string[];
  active?: boolean;
  calendar_system?: CalendarSystem;
}

export interface CalendarSystem {
  days_per_month: number;
  months_per_year: number;
  custom_names?: boolean;
  era_label?: string;
  month_names?: string[];
  day_names?: string[];
}

export type CharacterAlignment =
  | "Lawful Good"
  | "Neutral Good"
  | "Chaotic Good"
  | "Lawful Neutral"
  | "True Neutral"
  | "Chaotic Neutral"
  | "Lawful Evil"
  | "Neutral Evil"
  | "Chaotic Evil";

export type SharedVisibility = "public" | "dm_only" | "archived" | "specific_players";

export interface CharacterSheet extends AppRecord {
  campaign_id?: string;
  folder?: string;
  name: string;
  race?: string;
  class?: string;
  subclass?: string;
  level?: number;
  background?: string;
  alignment?: CharacterAlignment;
  experience_points?: number;
  inspiration?: boolean;
  strength?: number;
  dexterity?: number;
  constitution?: number;
  intelligence?: number;
  wisdom?: number;
  charisma?: number;
  saving_throws?: string;
  hp_max?: number;
  hp_current?: number;
  hp_temp?: number;
  ac?: number;
  initiative?: number;
  initiative_advantage?: boolean;
  initiative_disadvantage?: boolean;
  speed?: number;
  damage_resistances?: string;
  damage_immunities?: string;
  damage_vulnerabilities?: string;
  proficiency_bonus?: number;
  hit_dice?: string;
  death_save_successes?: number;
  death_save_failures?: number;
  skills?: string;
  skill_expertises?: string;
  advantage_skills?: string;
  disadvantage_skills?: string;
  advantage_saving_throws?: string;
  disadvantage_saving_throws?: string;
  passive_perception?: number;
  languages?: string;
  traits?: string;
  ideals?: string;
  bonds?: string;
  flaws?: string;
  features_traits?: string;
  equipment?: string;
  inventory?: string;
  cp?: number;
  sp?: number;
  ep?: number;
  gp?: number;
  pp?: number;
  spellcasting_ability?: string;
  spell_save_dc?: number;
  spell_attack_bonus?: number;
  spell_slots?: string;
  ki_points_current?: number;
  ki_points_max?: number;
  channel_divinity_current?: number;
  channel_divinity_max?: number;
  sorcery_points_current?: number;
  sorcery_points_max?: number;
  spells_known?: string;
  attacks?: string;
  notes?: string;
  image_url?: string;
  visibility?: SharedVisibility;
  allowed_emails?: string[];
  assigned_to_email?: string;
}

export type DocumentVisibility = "public" | "private" | "archived";

export interface Document extends AppRecord {
  campaign_id?: string;
  folder?: string;
  title: string;
  description?: string;
  file_url: string;
  visibility?: DocumentVisibility;
  allowed_emails?: string[];
}

export interface InitiativeEntry {
  [key: string]: unknown;
}

export interface ActiveSpellTracker {
  [key: string]: unknown;
}

export interface Initiative extends AppRecord {
  campaign_id?: string;
  active?: boolean;
  turn_seconds?: number;
  current_turn_index?: number;
  entries?: InitiativeEntry[];
  spells?: ActiveSpellTracker[];
  events?: Record<string, unknown>[];
  round?: number;
}

export type LoreCategory =
  | "map"
  | "character"
  | "place"
  | "event"
  | "artifact"
  | "religion"
  | "other";

export interface LoreEntry extends AppRecord {
  campaign_id?: string;
  title: string;
  category?: LoreCategory;
  folder?: string;
  content?: string;
  image_url?: string;
  pdf_url?: string;
  pdf_rotation?: number;
  map_pins?: MapPin[];
  tags?: string[];
  visibility?: SharedVisibility;
  allowed_emails?: string[];
}

export interface MapPin {
  id: string;
  kind?: "pin" | "label";
  label?: string;
  x: number;
  y: number;
  size?: number;
  lore_entry_id?: string;
}

export interface Message extends AppRecord {
  campaign_id?: string;
  content: string;
  channel: string;
  recipient_email?: string;
  file_url?: string;
  file_type?: "image" | "pdf";
}

export interface PlayerNote extends AppRecord {
  campaign_id?: string;
  session_label?: string;
  content?: string;
}

export type TimelineEventType = "event" | "character" | "lore" | "session";

export interface TimelineEvent extends AppRecord {
  campaign_id?: string;
  title: string;
  description?: string;
  event_type?: TimelineEventType;
  year: number;
  month: number;
  day: number;
  character_ids?: string[];
  lore_entry_ids?: string[];
  calendar_snapshot?: CalendarSystem;
}

export interface ShopItem {
  id?: string;
  name: string;
  description?: string;
  quantity?: number;
  cp?: number;
  sp?: number;
  ep?: number;
  gp?: number;
  pp?: number;
}

export interface ShopPurchaseLog extends AppRecord {
  shop_id?: string;
  shop_name?: string;
  character_id?: string;
  character_name?: string;
  player_email?: string;
  item_name?: string;
  quantity?: number;
  total_cp?: number;
  price_label?: string;
  currency_before?: Record<string, number>;
  currency_after?: Record<string, number>;
}

export interface Shop extends AppRecord {
  campaign_id?: string;
  name: string;
  description?: string;
  status?: "open" | "closed";
  items?: ShopItem[];
  purchase_log?: ShopPurchaseLog[];
}

export type EntityName =
  | "Broadcast"
  | "Campaign"
  | "CharacterSheet"
  | "Document"
  | "Initiative"
  | "LoreEntry"
  | "Message"
  | "PlayerNote"
  | "Shop"
  | "TimelineEvent";

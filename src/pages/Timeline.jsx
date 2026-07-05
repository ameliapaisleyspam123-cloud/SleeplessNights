import React, { useEffect, useMemo, useState } from "react";
import { appClient } from "@/api/appClient";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { canViewVisibleItem } from "@/lib/visibility";
import { isDmUser } from "@/lib/visibility";
import { campaignDate, dateKey, formatTimelineDate, hasTimelineDate, isRecordOnDate, makeDatedRecord, readLocalTimelineViewDate, timelineSeriesId, writeLocalTimelineViewDate } from "@/lib/timeline";
import { BookOpen, CalendarDays, ChevronDown, ChevronUp, Eye, EyeOff, GitBranch, Link2, ListTree, Lock, Plus, Save, Sparkles, Trash2, Users } from "lucide-react";

const DEFAULT_CALENDAR = {
  days_per_month: 30,
  months_per_year: 12,
  custom_names: false,
  era_label: "Year",
  before_era_label: "BCE",
  after_era_label: "ACE",
  month_names: [],
  day_names: [],
};

const EVENT_TYPES = ["event", "character", "lore", "session"];

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function toSignedYear(value, fallback = 1) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.floor(parsed) : fallback;
}

function normalizeCalendar(campaign) {
  const saved = campaign?.calendar_system || {};
  const days = toNumber(saved.days_per_month, DEFAULT_CALENDAR.days_per_month);
  const months = toNumber(saved.months_per_year, DEFAULT_CALENDAR.months_per_year);
  return {
    ...DEFAULT_CALENDAR,
    ...saved,
    days_per_month: days,
    months_per_year: months,
    month_names: Array.from({ length: months }, (_, index) => saved.month_names?.[index] || `Month ${index + 1}`),
    day_names: Array.from({ length: days }, (_, index) => saved.day_names?.[index] || `Day ${index + 1}`),
  };
}

function emptyEvent(campaignId, calendar) {
  return {
    campaign_id: campaignId,
    title: "",
    description: "",
    event_type: "event",
    year: 1,
    month: 1,
    day: 1,
    visibility: "public",
    allowed_emails: [],
    character_ids: [],
    lore_entry_ids: [],
    calendar_snapshot: calendar,
  };
}

function compareTimelineDates(a, b) {
  return (
    toSignedYear(a.year, 1) - toSignedYear(b.year, 1) ||
    toNumber(a.month, 1) - toNumber(b.month, 1) ||
    toNumber(a.day, 1) - toNumber(b.day, 1) ||
    String(a.title || "").localeCompare(String(b.title || ""))
  );
}

function formatDate(event, calendar) {
  const monthIndex = Math.max(0, toNumber(event.month, 1) - 1);
  const dayIndex = Math.max(0, toNumber(event.day, 1) - 1);
  const monthName = calendar.month_names[monthIndex] || `Month ${event.month}`;
  const dayName = calendar.day_names[dayIndex] || `Day ${event.day}`;
  return formatTimelineDate(event, calendar);
}

function markerId(date, calendar) {
  return dateKey(date, calendar);
}

function buildTimelineMarkers({ events, characters, lore, activeDate, calendar, includeActiveDate }) {
  const markers = new Map();
  const ensureMarker = (date, source = "timepoint") => {
    const normalized = {
      year: toSignedYear(date.year, 1),
      month: toNumber(date.month, 1),
      day: toNumber(date.day, 1),
    };
    const key = markerId(normalized, calendar);
    const existing = markers.get(key) || {
      ...normalized,
      key,
      events: [],
      characters: [],
      lore: [],
      characterCount: 0,
      loreCount: 0,
      hasStandalone: false,
    };
    if (source === "timepoint") existing.hasStandalone = true;
    markers.set(key, existing);
    return existing;
  };

  if (includeActiveDate) ensureMarker(activeDate, "timepoint");

  for (const event of events) {
    ensureMarker(event, "event").events.push(event);
  }
  for (const character of characters) {
    if (!character.timeline_date) continue;
    const marker = ensureMarker(character.timeline_date, "character");
    marker.characters.push(character);
    marker.characterCount = marker.characters.length;
  }
  for (const item of lore) {
    if (!item.timeline_date) continue;
    const marker = ensureMarker(item.timeline_date, "lore");
    marker.lore.push(item);
    marker.loreCount = marker.lore.length;
  }

  return [...markers.values()].sort(compareTimelineDates);
}

function groupMarkersForTree(markers) {
  const years = new Map();
  for (const marker of markers) {
    if (!years.has(marker.year)) years.set(marker.year, new Map());
    const months = years.get(marker.year);
    if (!months.has(marker.month)) months.set(marker.month, []);
    months.get(marker.month).push(marker);
  }
  return [...years.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, months]) => ({
      year,
      months: [...months.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([month, points]) => ({ month, points: points.sort(compareTimelineDates) })),
    }));
}

function recordsToCarry(records, activeDate, calendar) {
  const activeKey = dateKey(activeDate, calendar);
  const activeSeries = new Set(records.filter((item) => item.timeline_date_key === activeKey).map((item) => timelineSeriesId(item)));
  const candidatesBySeries = new Map();
  for (const record of records) {
    if (record.visibility === "archived") continue;
    const seriesId = timelineSeriesId(record);
    if (activeSeries.has(seriesId)) continue;
    const current = candidatesBySeries.get(seriesId);
    if (!current || String(record.updated_date || record.created_date || "").localeCompare(String(current.updated_date || current.created_date || "")) > 0) {
      candidatesBySeries.set(seriesId, record);
    }
  }
  return [...candidatesBySeries.values()].sort((a, b) => (a.name || a.title || "").localeCompare(b.name || b.title || ""));
}

async function saveRecordForDate(api, records, record, activeDate, calendar) {
  const activeKey = dateKey(activeDate, calendar);
  const seriesId = timelineSeriesId(record);
  const existingForDate = records.find((item) => item.id !== record.id && item.timeline_date_key === activeKey && timelineSeriesId(item) === seriesId);
  if (existingForDate) {
    return api.update(existingForDate.id, makeDatedRecord(record, activeDate, calendar));
  }
  if (!hasTimelineDate(record)) {
    return api.update(record.id, {
      timeline_date: activeDate,
      timeline_date_key: activeKey,
      timeline_series_id: seriesId,
    });
  }
  const created = await api.create(makeDatedRecord(record, activeDate, calendar));
  if (!created.timeline_series_id) {
    await api.update(created.id, { timeline_series_id: seriesId });
  }
  return created;
}

export default function Timeline() {
  const [user, setUser] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [events, setEvents] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [lore, setLore] = useState([]);
  const [calendarDraft, setCalendarDraft] = useState(DEFAULT_CALENDAR);
  const [entry, setEntry] = useState(null);
  const [dateDraft, setDateDraft] = useState({ year: 1, month: 1, day: 1 });
  const [dmViewDate, setDmViewDate] = useState({ year: 1, month: 1, day: 1 });
  const [carrySelection, setCarrySelection] = useState({ characters: [], lore: [] });
  const [showCalendarRules, setShowCalendarRules] = useState(false);
  const [showRecordIndex, setShowRecordIndex] = useState(false);
  const [timelineView, setTimelineView] = useState(() => localStorage.getItem("sleepless_timeline_view_v1") || "rail");
  const [savingCalendar, setSavingCalendar] = useState(false);
  const [savingEntry, setSavingEntry] = useState(false);
  const [savingDate, setSavingDate] = useState(false);
  const [savingCarry, setSavingCarry] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const calendar = useMemo(() => normalizeCalendar(campaign), [campaign]);
  const canManage = isDmUser(user);
  const campaignActiveDate = useMemo(() => campaignDate(campaign, calendar), [campaign, calendar]);
  const activeDate = useMemo(() => campaignDate({ timeline_current_date: dmViewDate }, calendar), [dmViewDate, calendar]);
  const activeDateKey = dateKey(activeDate, calendar);
  const campaignDateKey = dateKey(campaignActiveDate, calendar);
  const dmViewingCampaignDate = activeDateKey === campaignDateKey;
  const playerDateKeys = Array.isArray(campaign?.timeline_player_date_keys) ? campaign.timeline_player_date_keys : [];
  const visiblePlayerDateKeys = new Set([...playerDateKeys, campaignDateKey]);
  const isDateVisibleToPlayers = (key) => visiblePlayerDateKeys.has(key);

  const load = async ({ resetView = false } = {}) => {
    const currentUser = await appClient.auth.me();
    const [currentCampaign, timelineEvents, sheets, loreEntries] = await Promise.all([
      currentUser.campaign_id ? appClient.entities.Campaign.get(currentUser.campaign_id) : null,
      appClient.entities.TimelineEvent.filter({ campaign_id: currentUser.campaign_id }, "year", 500),
      appClient.entities.CharacterSheet.filter({ campaign_id: currentUser.campaign_id }, "name", 500),
      appClient.entities.LoreEntry.filter({ campaign_id: currentUser.campaign_id }, "title", 500),
    ]);
    const nextCalendar = normalizeCalendar(currentCampaign);
    setUser(currentUser);
    setCampaign(currentCampaign);
    setCalendarDraft(nextCalendar);
    const nextDate = campaignDate(currentCampaign, nextCalendar);
    if (resetView || !loaded) {
      const storedDate = readLocalTimelineViewDate(currentCampaign, nextCalendar, currentUser);
      const storedKey = dateKey(storedDate, nextCalendar);
      const unlockedKeys = new Set([dateKey(nextDate, nextCalendar), ...(currentCampaign?.timeline_player_date_keys || [])]);
      const nextViewDate = isDmUser(currentUser) || unlockedKeys.has(storedKey) ? storedDate : nextDate;
      setDateDraft(nextViewDate);
      setDmViewDate(nextViewDate);
    }
    setEvents(timelineEvents.sort(compareTimelineDates));
    setCharacters(sheets);
    setLore(loreEntries);
    setCarrySelection({ characters: [], lore: [] });
    setLoaded(true);
  };

  useEffect(() => {
    load({ resetView: true }).catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (entry && !entry.id) setEntry((current) => ({ ...current, calendar_snapshot: calendar }));
  }, [calendar, entry?.id]);

  const visibleEvents = useMemo(() => events.filter((event) => canViewVisibleItem(event, user, canManage)), [events, user, canManage]);
  const visibleCharacters = useMemo(() => characters.filter((item) => canViewVisibleItem(item, user, canManage)), [characters, user, canManage]);
  const visibleLore = useMemo(() => lore.filter((item) => canViewVisibleItem(item, user, canManage)), [lore, user, canManage]);
  const characterById = useMemo(() => new Map(characters.map((character) => [character.id, character])), [characters]);
  const loreById = useMemo(() => new Map(lore.map((item) => [item.id, item])), [lore]);
  const datedCharacters = useMemo(
    () => visibleCharacters.filter((item) => isRecordOnDate(item, activeDate, calendar)),
    [visibleCharacters, activeDate, calendar],
  );
  const datedLore = useMemo(
    () => visibleLore.filter((item) => isRecordOnDate(item, activeDate, calendar)),
    [visibleLore, activeDate, calendar],
  );
  const carryableCharacters = useMemo(
    () => recordsToCarry(characters, activeDate, calendar).filter((item) => canViewVisibleItem(item, user, canManage)),
    [characters, activeDate, calendar, user, canManage],
  );
  const carryableLore = useMemo(
    () => recordsToCarry(lore, activeDate, calendar).filter((item) => canViewVisibleItem(item, user, canManage)),
    [lore, activeDate, calendar, user, canManage],
  );
  const timelineStarted = Boolean(campaign?.timeline_started || visibleEvents.length > 0 || visibleCharacters.some(hasTimelineDate) || visibleLore.some(hasTimelineDate));
  const timelineMarkers = useMemo(
    () => buildTimelineMarkers({
      events: visibleEvents,
      characters: visibleCharacters,
      lore: visibleLore,
      activeDate,
      calendar,
      includeActiveDate: timelineStarted,
    }).filter((marker) => canManage || isDateVisibleToPlayers(marker.key)),
    [visibleEvents, visibleCharacters, visibleLore, activeDate, calendar, timelineStarted, canManage, campaignDateKey, playerDateKeys.join("|")],
  );
  const markerTree = useMemo(() => groupMarkersForTree(timelineMarkers), [timelineMarkers]);
  const indexedCharacters = useMemo(() => [...visibleCharacters].sort((a, b) => (a.name || "").localeCompare(b.name || "")), [visibleCharacters]);
  const indexedLore = useMemo(() => [...visibleLore].sort((a, b) => (a.title || "").localeCompare(b.title || "")), [visibleLore]);

  if (!loaded) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!canManage && !campaign?.timeline_player_visible) {
    return (
      <div className="p-6 lg:p-10">
        <PageHeader
          eyebrow="Chronicle"
          title="Timeline Tree"
          description="This section is currently available to the DM only."
        />
        <div className="min-h-[18rem] border border-dashed border-border rounded-sm flex flex-col items-center justify-center text-center px-4 text-muted-foreground">
          <Lock className="w-10 h-10 mb-4" strokeWidth={1.5} />
          <div className="font-display text-2xl text-foreground">DM access required</div>
          <div className="mt-2 max-w-md">The timeline is hidden from players while the calendar and lore-linking workflow is being prepared.</div>
        </div>
      </div>
    );
  }

  const updateCalendarSize = (patch) => {
    setCalendarDraft((current) => normalizeCalendar({ calendar_system: { ...current, ...patch } }));
  };

  const updateCalendarName = (kind, index, value) => {
    setCalendarDraft((current) => {
      const names = [...current[kind]];
      names[index] = value;
      return { ...current, [kind]: names };
    });
  };

  const saveCalendar = async () => {
    if (!campaign?.id) return;
    setSavingCalendar(true);
    const normalized = normalizeCalendar({ calendar_system: calendarDraft });
    const updated = await appClient.entities.Campaign.update(campaign.id, { calendar_system: normalized });
    setCampaign(updated);
    setCalendarDraft(normalizeCalendar(updated));
    const nextDate = campaignDate(updated, normalizeCalendar(updated));
    setDmViewDate(writeLocalTimelineViewDate(updated, nextDate, normalizeCalendar(updated), user));
    setDateDraft(nextDate);
    setSavingCalendar(false);
  };

  const saveCurrentDate = async (nextDate = dateDraft) => {
    if (!campaign?.id) return;
    setSavingDate(true);
    const normalized = campaignDate({ timeline_current_date: nextDate }, calendar);
    setDmViewDate(writeLocalTimelineViewDate(campaign, normalized, calendar, user));
    setDateDraft(normalized);
    await appClient.entities.Campaign.update(campaign.id, {
      timeline_current_date: normalized,
      timeline_started: true,
    }).then(setCampaign);
    setSavingDate(false);
  };

  const viewDate = (nextDate) => {
    const normalized = campaignDate({ timeline_current_date: nextDate }, calendar);
    setDmViewDate(writeLocalTimelineViewDate(campaign, normalized, calendar, user));
    setDateDraft(normalized);
  };

  const viewMarker = (marker) => {
    const nextDate = { year: marker.year, month: marker.month, day: marker.day };
    viewDate(nextDate);
  };

  const togglePlayerTimeline = async () => {
    if (!campaign?.id) return;
    const updated = await appClient.entities.Campaign.update(campaign.id, { timeline_player_visible: !campaign.timeline_player_visible });
    setCampaign(updated);
  };

  const togglePlayerDate = async (marker) => {
    if (!campaign?.id || !canManage) return;
    const key = marker.key || dateKey(marker, calendar);
    const current = new Set(playerDateKeys);
    if (current.has(key)) current.delete(key);
    else current.add(key);
    const updated = await appClient.entities.Campaign.update(campaign.id, { timeline_player_date_keys: [...current] });
    setCampaign(updated);
  };

  const chooseTimelineView = (view) => {
    setTimelineView(view);
    localStorage.setItem("sleepless_timeline_view_v1", view);
  };

  const toggleCarry = (kind, id) => {
    setCarrySelection((current) => {
      const values = current[kind] || [];
      return { ...current, [kind]: values.includes(id) ? values.filter((value) => value !== id) : [...values, id] };
    });
  };

  const selectAllCarry = (kind, records) => {
    setCarrySelection((current) => ({ ...current, [kind]: records.map((item) => item.id) }));
  };

  const clearCarry = (kind) => {
    setCarrySelection((current) => ({ ...current, [kind]: [] }));
  };

  const carryRecords = async () => {
    if (!campaign?.id) return;
    const selectedCharacters = carryableCharacters.filter((item) => carrySelection.characters.includes(item.id));
    const selectedLore = carryableLore.filter((item) => carrySelection.lore.includes(item.id));
    if (selectedCharacters.length + selectedLore.length === 0) return;
    setSavingCarry(true);
    await Promise.all([
      ...selectedCharacters.map((item) => saveRecordForDate(appClient.entities.CharacterSheet, characters, item, activeDate, calendar)),
      ...selectedLore.map((item) => saveRecordForDate(appClient.entities.LoreEntry, lore, item, activeDate, calendar)),
    ]);
    setSavingCarry(false);
    await load();
  };

  const updateEntry = (patch) => {
    setEntry((current) => ({ ...current, ...patch }));
  };

  const toggleLinkedId = (field, id) => {
    setEntry((current) => {
      const values = current[field] || [];
      return { ...current, [field]: values.includes(id) ? values.filter((value) => value !== id) : [...values, id] };
    });
  };

  const saveEntry = async (event) => {
    event.preventDefault();
    setSavingEntry(true);
    const payload = {
      ...entry,
      title: entry.title?.trim() || "",
      year: toSignedYear(entry.year, 1),
      month: Math.min(calendar.months_per_year, Math.max(1, toNumber(entry.month, 1))),
      day: Math.min(calendar.days_per_month, Math.max(1, toNumber(entry.day, 1))),
      calendar_snapshot: calendar,
    };
    if (!payload.title && !payload.id) {
      await appClient.entities.Campaign.update(campaign.id, {
        timeline_current_date: { year: payload.year, month: payload.month, day: payload.day },
        timeline_started: true,
      }).then((updated) => {
        setCampaign(updated);
        const nextDate = campaignDate(updated, calendar);
        setDmViewDate(writeLocalTimelineViewDate(updated, nextDate, calendar, user));
        setDateDraft(nextDate);
      });
      setSavingEntry(false);
      setEntry(null);
      return;
    }
    if (!payload.title && payload.id) {
      setSavingEntry(false);
      return;
    }
    if (payload.id) {
      await appClient.entities.TimelineEvent.update(payload.id, payload);
    } else {
      await appClient.entities.TimelineEvent.create(payload);
    }
    setSavingEntry(false);
    setEntry(null);
    await load();
  };

  const deleteEntry = async (timelineEvent) => {
    if (!timelineEvent?.id) return;
    if (!window.confirm(`Delete "${timelineEvent.title}" from the timeline?`)) return;
    await appClient.entities.TimelineEvent.delete(timelineEvent.id);
    if (entry?.id === timelineEvent.id) setEntry(null);
    await load();
  };

  const moveTargetDate = campaignDate({ timeline_current_date: dateDraft }, calendar);

  return (
    <div className="p-6 pb-28 lg:p-10 lg:pb-28 space-y-6">
      <PageHeader
        eyebrow="Chronicle"
        title="Timeline Tree"
        description="Chart the ages of your campaign - eras, dates, and the moments that change the world."
        action={
          canManage ? (
            <Button onClick={() => setEntry({ ...emptyEvent(user?.campaign_id, calendar), ...activeDate })}>
              <Plus className="w-4 h-4" /> Timepoint
            </Button>
          ) : null
        }
      />

      <section className="border border-border bg-card/50 rounded-sm overflow-hidden">
        <div className="flex items-center justify-between gap-3 flex-wrap border-b border-border p-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-accent font-medium">{canManage ? "DM Viewing" : "Viewing"}</div>
            <div className="font-display text-2xl mt-1">{formatTimelineDate(activeDate, calendar)}</div>
            <div className="text-sm text-muted-foreground mt-1">
              {datedCharacters.length} character{datedCharacters.length === 1 ? "" : "s"} and {datedLore.length} lore entr{datedLore.length === 1 ? "y" : "ies"} saved here.
            </div>
            {canManage && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className={`rounded-sm border px-2 py-1 ${dmViewingCampaignDate ? "border-accent/50 bg-accent/10 text-accent" : "border-border text-muted-foreground"}`}>
                  {dmViewingCampaignDate ? "Viewing campaign date" : "Private DM view"}
                </span>
                {!dmViewingCampaignDate && (
                  <span className="text-muted-foreground">Campaign date: {formatTimelineDate(campaignActiveDate, calendar)}</span>
                )}
              </div>
            )}
            {!canManage && !dmViewingCampaignDate && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-sm border border-border bg-secondary/70 px-2 py-1 text-muted-foreground">Viewing older date</span>
                <span className="text-muted-foreground">Campaign date: {formatTimelineDate(campaignActiveDate, calendar)}</span>
              </div>
            )}
          </div>
          {canManage && (
            <Button variant={campaign?.timeline_player_visible ? "default" : "outline"} onClick={togglePlayerTimeline}>
              {campaign?.timeline_player_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              Players {campaign?.timeline_player_visible ? "can see timeline" : "cannot see timeline"}
            </Button>
          )}
        </div>
        {canManage && (
          <div className="p-4">
            <div className="grid lg:grid-cols-[1fr_1fr_1fr_auto_auto] gap-3 items-end">
              <Field label={calendar.era_label || "Year"}>
                <Input type="number" value={dateDraft.year} onChange={(event) => setDateDraft((current) => ({ ...current, year: event.target.value }))} />
              </Field>
              <Field label="Month">
                <Input type="number" min="1" max={calendar.months_per_year} value={dateDraft.month} onChange={(event) => setDateDraft((current) => ({ ...current, month: event.target.value }))} />
              </Field>
              <Field label="Day">
                <Input type="number" min="1" max={calendar.days_per_month} value={dateDraft.day} onChange={(event) => setDateDraft((current) => ({ ...current, day: event.target.value }))} />
              </Field>
              <Button variant="outline" className="h-auto min-h-10 whitespace-normal leading-snug" onClick={() => viewDate(dateDraft)}>
                <Eye className="w-4 h-4" /> DM View {formatTimelineDate(moveTargetDate, calendar)}
              </Button>
              <Button className="h-auto min-h-10 whitespace-normal leading-snug" onClick={() => saveCurrentDate()} disabled={savingDate}>
                <CalendarDays className="w-4 h-4" /> Set Campaign Date
              </Button>
            </div>
          </div>
        )}
      </section>

      {canManage && (
        <section className="border border-border bg-card/50 rounded-sm overflow-hidden">
          <div className={`flex items-center justify-between gap-3 flex-wrap ${!timelineStarted || showCalendarRules ? "border-b border-border" : ""} p-3`}>
            <div>
              <div className="text-[10px] uppercase tracking-[0.24em] text-accent font-medium">Calendar Rules</div>
              <div className="text-xs text-muted-foreground mt-1">
                {calendar.days_per_month} days per month, {calendar.months_per_year} months per year.
              </div>
            </div>
            <div className="flex gap-2">
              {timelineStarted && (
                <Button type="button" variant="ghost" onClick={() => setShowCalendarRules((open) => !open)}>
                  {showCalendarRules ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {showCalendarRules ? "Hide" : "Edit"}
                </Button>
              )}
              {(!timelineStarted || showCalendarRules) && (
                <Button onClick={saveCalendar} disabled={savingCalendar || !campaign?.id}>
                  <Save className="w-4 h-4" /> {savingCalendar ? "Saving" : "Save"}
                </Button>
              )}
            </div>
          </div>
          {(!timelineStarted || showCalendarRules) && (
            <div className="p-4 grid xl:grid-cols-[0.9fr_1.1fr] gap-4">
              <div className="grid sm:grid-cols-2 gap-3 content-start">
                <Field label="Days in a month">
                  <Input type="number" min="1" max="80" value={calendarDraft.days_per_month} onChange={(event) => updateCalendarSize({ days_per_month: event.target.value })} />
                </Field>
                <Field label="Months in a year">
                  <Input type="number" min="1" max="30" value={calendarDraft.months_per_year} onChange={(event) => updateCalendarSize({ months_per_year: event.target.value })} />
                </Field>
                <Field label="Year label">
                  <Input value={calendarDraft.era_label} onChange={(event) => setCalendarDraft((current) => ({ ...current, era_label: event.target.value }))} placeholder="Year" />
                </Field>
                <Field label="Before era">
                  <Input value={calendarDraft.before_era_label || ""} onChange={(event) => setCalendarDraft((current) => ({ ...current, before_era_label: event.target.value }))} placeholder="BCE" />
                </Field>
                <Field label="After era">
                  <Input value={calendarDraft.after_era_label || ""} onChange={(event) => setCalendarDraft((current) => ({ ...current, after_era_label: event.target.value }))} placeholder="ACE" />
                </Field>
                <label className="flex items-center gap-3 rounded-sm border border-border bg-background/50 px-3 py-2 text-sm text-muted-foreground">
                  <input type="checkbox" checked={calendarDraft.custom_names} onChange={(event) => setCalendarDraft((current) => ({ ...current, custom_names: event.target.checked }))} />
                  Use non-conventional month and day names
                </label>
              </div>

              {calendarDraft.custom_names && (
                <div className="grid md:grid-cols-2 gap-4">
                  <NameGrid title="Month Names" names={calendarDraft.month_names} onChange={(index, value) => updateCalendarName("month_names", index, value)} />
                  <NameGrid title="Day Names" names={calendarDraft.day_names} onChange={(index, value) => updateCalendarName("day_names", index, value)} />
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {canManage && (carryableCharacters.length > 0 || carryableLore.length > 0) && (
        <section className="border border-border bg-card/50 rounded-sm overflow-hidden">
          <div className="flex items-center justify-between gap-3 flex-wrap border-b border-border p-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.24em] text-accent font-medium">Carry Into This Date</div>
              <div className="text-sm text-muted-foreground mt-1">Add all or selected existing records to {formatTimelineDate(activeDate, calendar)}.</div>
            </div>
            <Button onClick={carryRecords} disabled={savingCarry || carrySelection.characters.length + carrySelection.lore.length === 0}>
              <GitBranch className="w-4 h-4" /> {savingCarry ? "Carrying" : "Carry Selected"}
            </Button>
          </div>
          <div className="p-4 grid lg:grid-cols-2 gap-4">
            <CarryPicker
              title="Characters"
              items={carryableCharacters}
              selected={carrySelection.characters}
              getLabel={(item) => item.name || "Unnamed"}
              getMeta={(item) => [item.race, item.class].filter(Boolean).join(" - ")}
              onToggle={(id) => toggleCarry("characters", id)}
              onSelectAll={() => selectAllCarry("characters", carryableCharacters)}
              onClear={() => clearCarry("characters")}
            />
            <CarryPicker
              title="Lore Entries"
              items={carryableLore}
              selected={carrySelection.lore}
              getLabel={(item) => item.title || "Untitled"}
              getMeta={(item) => item.category || "lore"}
              onToggle={(id) => toggleCarry("lore", id)}
              onSelectAll={() => selectAllCarry("lore", carryableLore)}
              onClear={() => clearCarry("lore")}
            />
          </div>
        </section>
      )}

      <section className="border border-border bg-card/50 rounded-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowRecordIndex((open) => !open)}
          className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-secondary/50 transition-colors"
          aria-expanded={showRecordIndex}
        >
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-accent font-medium">Timeline Records</div>
            <div className="text-sm text-muted-foreground mt-1">
              {indexedCharacters.length} character{indexedCharacters.length === 1 ? "" : "s"} and {indexedLore.length} lore entr{indexedLore.length === 1 ? "y" : "ies"}
            </div>
          </div>
          {showRecordIndex ? <ChevronUp className="w-4 h-4 text-accent shrink-0" /> : <ChevronDown className="w-4 h-4 text-accent shrink-0" />}
        </button>
        {showRecordIndex && (
          <div className="border-t border-border p-4 grid lg:grid-cols-2 gap-4">
            <RecordIndexList
              title="Characters"
              icon={Users}
              items={indexedCharacters}
              calendar={calendar}
              getLabel={(item) => item.name || "Unnamed"}
              getMeta={(item) => [item.race, item.class].filter(Boolean).join(" - ")}
            />
            <RecordIndexList
              title="Lore Entries"
              icon={BookOpen}
              items={indexedLore}
              calendar={calendar}
              getLabel={(item) => item.title || "Untitled"}
              getMeta={(item) => item.category || "lore"}
            />
          </div>
        )}
      </section>

      <Dialog open={Boolean(entry && canManage)} onOpenChange={(open) => !open && setEntry(null)}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto thin-scroll p-0">
          {entry && (
            <form onSubmit={saveEntry}>
              <DialogHeader className="flex items-center justify-between gap-3 flex-row border-b border-border px-6 py-4 mb-0">
            <div className="flex items-center gap-2 text-accent">
              <CalendarDays className="w-4 h-4" />
                  <DialogTitle className="font-display text-2xl text-foreground">{entry.id ? "Edit Timepoint" : "New Timepoint"}</DialogTitle>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setEntry(null)}>Cancel</Button>
              <Button type="submit" disabled={savingEntry || (entry.id && !entry.title?.trim())}>
                <Save className="w-4 h-4" /> {savingEntry ? "Saving" : "Save"}
              </Button>
            </div>
              </DialogHeader>
              <div className="p-6 grid xl:grid-cols-[1fr_0.8fr] gap-4">
            <div className="space-y-3">
              <Field label="Title (optional for standalone dates)">
                <Input value={entry.title} onChange={(event) => updateEntry({ title: event.target.value })} placeholder="A pact is broken" />
              </Field>
              <Field label="Description">
                <Textarea value={entry.description} onChange={(event) => updateEntry({ description: event.target.value })} placeholder="What changed in the world?" />
              </Field>
              <div className="grid sm:grid-cols-4 gap-3">
                <Field label={calendar.era_label || "Year"}>
                  <Input type="number" value={entry.year} onChange={(event) => updateEntry({ year: event.target.value })} />
                </Field>
                <Field label="Month">
                  <Input type="number" min="1" max={calendar.months_per_year} value={entry.month} onChange={(event) => updateEntry({ month: event.target.value })} />
                </Field>
                <Field label="Day">
                  <Input type="number" min="1" max={calendar.days_per_month} value={entry.day} onChange={(event) => updateEntry({ day: event.target.value })} />
                </Field>
                <Field label="Kind">
                  <select
                    value={entry.event_type}
                    onChange={(event) => updateEntry({ event_type: event.target.value })}
                    className="h-10 w-full rounded-sm border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {EVENT_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Visibility">
                <select
                  value={entry.visibility || "public"}
                  onChange={(event) => updateEntry({ visibility: event.target.value })}
                  className="h-10 w-full rounded-sm border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="public">Public - players can view when timeline is enabled</option>
                  <option value="dm_only">DM Only - hidden from players</option>
                </select>
              </Field>
              <div className="rounded-sm border border-border bg-background/50 px-3 py-2 text-sm text-muted-foreground">
                This will land on <span className="text-foreground">{formatDate(entry, calendar)}</span>.
              </div>
            </div>
            <div className="grid md:grid-cols-2 xl:grid-cols-1 gap-3">
              <LinkPicker title="Characters" items={characters} selected={entry.character_ids || []} getLabel={(item) => item.name || "Unnamed"} onToggle={(id) => toggleLinkedId("character_ids", id)} />
              <LinkPicker title="Lore Entries" items={lore} selected={entry.lore_entry_ids || []} getLabel={(item) => item.title || "Untitled"} onToggle={(id) => toggleLinkedId("lore_entry_ids", id)} />
            </div>
          </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <section className="border border-border bg-card/50 rounded-sm overflow-hidden">
        <div className="border-b border-border p-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-accent font-medium">Campaign Timeline</div>
            <div className="text-sm text-muted-foreground mt-1">{timelineMarkers.length} date marker{timelineMarkers.length === 1 ? "" : "s"} on the timeline</div>
          </div>
          <div className="flex border border-border rounded-sm overflow-hidden shrink-0">
            <button
              type="button"
              onClick={() => chooseTimelineView("rail")}
              className={`h-9 px-3 flex items-center gap-1.5 text-xs transition-colors ${timelineView === "rail" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
            >
              <Sparkles className="w-3.5 h-3.5" /> Rail
            </button>
            <button
              type="button"
              onClick={() => chooseTimelineView("tree")}
              className={`h-9 px-3 flex items-center gap-1.5 text-xs border-l border-border transition-colors ${timelineView === "tree" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
            >
              <ListTree className="w-3.5 h-3.5" /> Tree
            </button>
          </div>
        </div>
        {timelineView === "tree" ? (
          <TimelineTree
            grouped={markerTree}
            calendar={calendar}
            activeDate={activeDate}
            campaignActiveDate={campaignActiveDate}
            canManage={canManage}
            user={user}
            characterById={characterById}
            loreById={loreById}
            onEdit={setEntry}
            onDelete={deleteEntry}
            onView={viewMarker}
            onSetCampaign={saveCurrentDate}
            onTogglePlayerDate={togglePlayerDate}
            isDateVisibleToPlayers={isDateVisibleToPlayers}
          />
        ) : timelineMarkers.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground border border-dashed border-border m-4 rounded-sm">Move to a date to place the first marker on the timeline.</div>
        ) : (
          <div className="overflow-hidden md:overflow-x-auto thin-scroll p-4 pb-6">
            <div
              className="relative grid min-w-0 grid-cols-1 gap-6 py-12 md:w-max md:min-w-full md:auto-cols-[17rem] md:grid-flow-col md:grid-cols-none"
            >
              <div
                className="absolute left-6 right-6 top-1/2 h-2 -translate-y-1/2 rounded-full shadow-sm"
                style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)), hsl(var(--border)))" }}
              />
              {timelineMarkers.map((marker, index) => (
                <TimelineMarker
                  key={marker.key}
                  marker={marker}
                  index={index}
                  calendar={calendar}
                  active={marker.key === activeDateKey}
                  campaignActive={marker.key === campaignDateKey}
                  playerVisible={isDateVisibleToPlayers(marker.key)}
                  canManage={canManage}
                  onEdit={setEntry}
                  onAdd={() => setEntry({ ...emptyEvent(user?.campaign_id, calendar), year: marker.year, month: marker.month, day: marker.day })}
                  onView={() => viewMarker(marker)}
                  onSetCampaign={() => saveCurrentDate(marker)}
                  onTogglePlayerDate={() => togglePlayerDate(marker)}
                />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function NameGrid({ title, names, onChange }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">{title}</div>
      <div className="max-h-64 overflow-y-auto thin-scroll space-y-2 pr-1">
        {names.map((name, index) => (
          <div key={index} className="grid grid-cols-[3rem_1fr] gap-2 items-center">
            <span className="text-xs text-muted-foreground">#{index + 1}</span>
            <Input value={name} onChange={(event) => onChange(index, event.target.value)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function LinkPicker({ title, items, selected, getLabel, onToggle }) {
  return (
    <div className="border border-border rounded-sm bg-background/50 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border text-[10px] uppercase tracking-[0.2em] text-accent">
        <Link2 className="w-3.5 h-3.5" /> {title}
      </div>
      <div className="max-h-52 overflow-y-auto thin-scroll p-2 space-y-1">
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground px-2 py-4">None found.</div>
        ) : (
          items.map((item) => (
            <label key={item.id} className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground">
              <input type="checkbox" checked={selected.includes(item.id)} onChange={() => onToggle(item.id)} />
              <span className="truncate">{getLabel(item)}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}

function CarryPicker({ title, items, selected, getLabel, getMeta, onToggle, onSelectAll, onClear }) {
  return (
    <div className="border border-border rounded-sm bg-background/50 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border">
        <div className="text-[10px] uppercase tracking-[0.2em] text-accent">{title}</div>
        <div className="flex gap-1">
          <Button type="button" size="sm" variant="ghost" onClick={onSelectAll}>All</Button>
          <Button type="button" size="sm" variant="ghost" onClick={onClear}>Clear</Button>
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto thin-scroll p-2 space-y-1">
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground px-2 py-4">Everything is already saved to this date.</div>
        ) : (
          items.map((item) => (
            <label key={item.id} className="flex items-center gap-2 rounded-sm px-2 py-2 text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground">
              <input type="checkbox" checked={selected.includes(item.id)} onChange={() => onToggle(item.id)} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-foreground">{getLabel(item)}</span>
                {getMeta(item) && <span className="block truncate text-xs text-muted-foreground">{getMeta(item)}</span>}
              </span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}

function RecordIndexList({ title, icon: Icon, items, calendar, getLabel, getMeta }) {
  return (
    <div className="border border-border rounded-sm bg-background/50 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border text-[10px] uppercase tracking-[0.2em] text-accent">
        <Icon className="w-3.5 h-3.5" /> {title}
      </div>
      <div className="max-h-72 overflow-y-auto thin-scroll p-2 space-y-1">
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground px-2 py-4">None found.</div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-sm px-2 py-2 text-sm hover:bg-secondary/60">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-foreground">{getLabel(item)}</div>
                  {getMeta(item) && <div className="truncate text-xs text-muted-foreground mt-0.5">{getMeta(item)}</div>}
                </div>
                <div className="shrink-0 text-right text-[10px] uppercase tracking-[0.14em] text-accent">
                  {hasTimelineDate(item) ? formatTimelineDate(item.timeline_date, calendar) : "Unplaced"}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function TimelineTree({ grouped, calendar, activeDate, campaignActiveDate, canManage, user, characterById, loreById, onEdit, onDelete, onView, onSetCampaign, onTogglePlayerDate, isDateVisibleToPlayers }) {
  if (grouped.length === 0) {
    return <div className="p-10 text-center text-muted-foreground border border-dashed border-border m-4 rounded-sm">No dated entries in tree view yet.</div>;
  }

  return (
    <div className="relative p-4 pl-8 space-y-5">
      <div className="absolute left-6 top-4 bottom-4 w-2 rounded-full bg-gradient-to-b from-primary via-accent to-border shadow-sm" />
      {grouped.map((yearGroup) => (
        <div key={yearGroup.year} className="relative pl-8">
          <div className="absolute left-[-1.25rem] top-4 h-4 w-4 rounded-full border-4 border-background bg-primary shadow-sm" />
          <div className="absolute left-[-1.25rem] top-6 h-px w-8 bg-accent/60" />
          <div className="flex items-center gap-2 font-display text-2xl min-h-8">
            <GitBranch className="w-5 h-5 text-accent" /> {formatYear(yearGroup.year, calendar)}
          </div>
          <div className="relative mt-3 ml-2 space-y-4 pl-6">
            <div className="absolute left-0 top-0 bottom-0 w-px bg-accent/35" />
            {yearGroup.months.map((monthGroup) => (
              <div key={`${yearGroup.year}-${monthGroup.month}`} className="relative pl-6">
                <div className="absolute left-[-1.35rem] top-2.5 h-3 w-3 rounded-full border-2 border-background bg-accent" />
                <div className="absolute left-[-1.35rem] top-4 h-px w-8 bg-accent/45" />
                <div className="text-sm uppercase tracking-[0.2em] text-accent min-h-6">{calendar.month_names[monthGroup.month - 1] || `Month ${monthGroup.month}`}</div>
                <div className="relative mt-3 space-y-3 pl-5">
                  <div className="absolute left-0 top-0 bottom-0 w-px bg-border" />
                  {monthGroup.points.map((marker) => {
                    const active = marker.key === dateKey(activeDate, calendar);
                    const campaignActive = marker.key === dateKey(campaignActiveDate, calendar);
                    const playerVisible = isDateVisibleToPlayers(marker.key);
                    return (
                      <div key={marker.key} className="relative pl-5">
                        <div className={`absolute left-[-1.2rem] top-2 h-2.5 w-2.5 rounded-full border border-background ${active ? "bg-accent" : "bg-border"}`} />
                        <div className="absolute left-[-1.2rem] top-3 h-px w-7 bg-border" />
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-xs text-muted-foreground">{calendar.day_names[marker.day - 1] || `Day ${marker.day}`}</div>
                          {active && <span className="rounded-sm border border-accent/50 bg-accent/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-accent">{canManage ? "DM View" : "Viewing"}</span>}
                          {campaignActive && <span className="rounded-sm border border-primary/50 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-primary">Campaign Date</span>}
                          {playerVisible && <span className="rounded-sm border border-border bg-secondary/70 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Player Visible</span>}
                          {!active && (
                            <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onView(marker)}>
                              <Eye className="w-3.5 h-3.5" /> View Here
                            </Button>
                          )}
                          {canManage && !campaignActive && (
                            <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => onSetCampaign(marker)}>
                              <CalendarDays className="w-3.5 h-3.5" /> Set Campaign
                            </Button>
                          )}
                          {canManage && !campaignActive && (
                            <Button type="button" size="sm" variant={playerVisible ? "default" : "outline"} className="h-7 px-2 text-xs" onClick={() => onTogglePlayerDate(marker)}>
                              {playerVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              {playerVisible ? "Hide from Players" : "Show to Players"}
                            </Button>
                          )}
                        </div>
                        <DayRecordSummary marker={marker} calendar={calendar} />
                        {marker.events.length > 0 && (
                          <div className="mt-2 grid lg:grid-cols-2 gap-3">
                            {marker.events.map((timelineEvent) => (
                              <TimelineCard
                                key={timelineEvent.id}
                                event={timelineEvent}
                                calendar={calendar}
                                canManage={canManage}
                                user={user}
                                characterById={characterById}
                                loreById={loreById}
                                onEdit={() => onEdit(timelineEvent)}
                                onDelete={() => onDelete(timelineEvent)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatYear(year, calendar) {
  const label = year <= 0 ? calendar.before_era_label || "BCE" : calendar.after_era_label || calendar.era_label || "ACE";
  return `${Math.abs(year)} ${label}`;
}

function DayRecordSummary({ marker, calendar, events = [], compact = false }) {
  const eventItems = events.length > 0 ? events : marker.events || [];
  const characters = marker.characters || [];
  const lore = marker.lore || [];
  const total = eventItems.length + characters.length + lore.length;

  if (total === 0) return null;

  return (
    <details className={`mt-3 rounded-sm border border-border bg-background/70 text-left ${compact ? "mx-auto w-full max-w-56 overflow-hidden" : ""}`}>
      <summary className="cursor-pointer list-none px-3 py-2 text-xs text-muted-foreground hover:text-foreground break-words">
        <span className="font-medium text-foreground">{total}</span> item{total === 1 ? "" : "s"}{compact ? "" : ` on ${formatTimelineDate(marker, calendar)}`}
      </summary>
      <div className={`border-t border-border p-3 space-y-3 ${compact ? "max-h-44 overflow-y-auto thin-scroll" : ""}`}>
        {eventItems.length > 0 && (
          <RecordNameGroup
            title="Events"
            items={eventItems}
            getLabel={(item) => item.title || "Untitled"}
          />
        )}
        {characters.length > 0 && (
          <RecordNameGroup
            title="Characters"
            items={characters}
            getLabel={(item) => item.name || "Unnamed"}
          />
        )}
        {lore.length > 0 && (
          <RecordNameGroup
            title="Lore Entries"
            items={lore}
            getLabel={(item) => item.title || "Untitled"}
          />
        )}
      </div>
    </details>
  );
}

function RecordNameGroup({ title, items, getLabel }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-accent">{title}</div>
      <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
        {items.map((item) => (
          <li key={item.id} className="truncate">{getLabel(item)}</li>
        ))}
      </ul>
    </div>
  );
}

function TimelineMarker({ marker, index, calendar, active, campaignActive, playerVisible, canManage, onEdit, onAdd, onView, onSetCampaign, onTogglePlayerDate }) {
  const above = index % 2 === 0;
  const monthName = calendar.month_names[marker.month - 1] || `Month ${marker.month}`;
  const dayName = calendar.day_names[marker.day - 1] || `Day ${marker.day}`;
  const countLabel = [
    marker.events.length ? `${marker.events.length} event${marker.events.length === 1 ? "" : "s"}` : "",
    marker.characterCount ? `${marker.characterCount} character${marker.characterCount === 1 ? "" : "s"}` : "",
    marker.loreCount ? `${marker.loreCount} lore` : "",
  ].filter(Boolean).join(" / ");

  return (
    <div className="relative min-h-[34rem]">
      <button
        type="button"
        onClick={onView}
        title={`View ${formatTimelineDate(marker, calendar)}`}
        className={`absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 bg-background text-center shadow-lg transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background ${
          active ? "border-accent text-accent" : "border-primary text-primary"
        }`}
      >
        <div>
          <div className="font-display text-lg leading-none">{Math.abs(marker.year)}</div>
          <div className="mt-0.5 text-[9px] uppercase tracking-widest">{marker.month}/{marker.day}</div>
        </div>
      </button>
      <div className={`absolute left-1/2 w-px -translate-x-1/2 bg-border ${above ? "bottom-1/2 h-14" : "top-1/2 h-14"}`} />
      <div className={`absolute left-0 right-0 ${above ? "bottom-[calc(50%+5rem)]" : "top-[calc(50%+5rem)]"}`}>
        <div className="mx-auto max-w-64 text-center">
          <div className="text-[10px] uppercase tracking-[0.2em] text-accent">{monthName} / {dayName}</div>
          <div className="font-display text-lg leading-tight mt-1 break-words">{formatTimelineDate(marker, calendar)}</div>
          <div className="text-xs text-muted-foreground mt-1">{countLabel || "Standalone timepoint"}</div>
          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
            {active && <div className="inline-flex rounded-sm border border-accent/50 bg-accent/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-accent">{canManage ? "DM View" : "Viewing"}</div>}
            {campaignActive && <div className="inline-flex rounded-sm border border-primary/50 bg-primary/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-primary">Campaign Date</div>}
            {playerVisible && <div className="inline-flex rounded-sm border border-border bg-secondary/70 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Player Visible</div>}
          </div>
          <DayRecordSummary marker={marker} calendar={calendar} compact />
          {marker.events.length > 0 && canManage && (
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {marker.events.map((event) => (
                <Button key={event.id} type="button" size="sm" variant="ghost" onClick={() => onEdit(event)}>
                  Edit {event.title || "Event"}
                </Button>
              ))}
            </div>
          )}
          {(!active || canManage) && (
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {!active && (
                <Button type="button" size="sm" variant="ghost" onClick={onView}>
                  <Eye className="w-3.5 h-3.5" /> View Here
                </Button>
              )}
              {canManage && !campaignActive && (
                <Button type="button" size="sm" variant="outline" onClick={onSetCampaign}>
                  <CalendarDays className="w-3.5 h-3.5" /> Set Campaign
                </Button>
              )}
              {canManage && !campaignActive && (
                <Button type="button" size="sm" variant={playerVisible ? "default" : "outline"} onClick={onTogglePlayerDate}>
                  {playerVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {playerVisible ? "Hide from Players" : "Show to Players"}
                </Button>
              )}
              <Button type="button" size="sm" variant="outline" onClick={onAdd}>
                <Plus className="w-3.5 h-3.5" /> Add Event
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TimelineCard({ event, calendar, canManage, user, characterById, loreById, onEdit, onDelete }) {
  const linkedCharacters = (event.character_ids || [])
    .map((id) => characterById.get(id))
    .filter((item) => canViewVisibleItem(item, user, canManage));
  const linkedLore = (event.lore_entry_ids || [])
    .map((id) => loreById.get(id))
    .filter((item) => canViewVisibleItem(item, user, canManage));

  return (
    <article className="border border-border bg-background/75 rounded-sm p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{event.event_type || "event"}</div>
          <h2 className="font-display text-lg mt-1 truncate">{event.title || "Untitled"}</h2>
        </div>
        {canManage && (
          <div className="flex gap-1 shrink-0">
            <Button type="button" size="sm" variant="ghost" onClick={onEdit}>Edit</Button>
            <Button type="button" size="icon" variant="ghost" onClick={onDelete} title="Delete event">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
      <div className="text-xs text-accent mt-2">{formatDate(event, calendar)}</div>
      {event.description && <p className="text-sm text-muted-foreground mt-3 whitespace-pre-wrap">{event.description}</p>}
      {(linkedCharacters.length > 0 || linkedLore.length > 0) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {linkedCharacters.map((character) => (
            <span key={character.id} className="rounded-sm border border-border bg-card px-2 py-1 text-xs">{character.name || "Unnamed"}</span>
          ))}
          {linkedLore.map((item) => (
            <span key={item.id} className="rounded-sm border border-accent/40 bg-accent/10 px-2 py-1 text-xs text-accent">{item.title || "Untitled"}</span>
          ))}
        </div>
      )}
    </article>
  );
}

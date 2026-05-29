import React, { useEffect, useMemo, useState } from "react";
import { appClient } from "@/api/appClient";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isDmUser } from "@/lib/visibility";
import { CalendarDays, GitBranch, Link2, Lock, Plus, Save, Sparkles, Trash2 } from "lucide-react";

const DEFAULT_CALENDAR = {
  days_per_month: 30,
  months_per_year: 12,
  custom_names: false,
  era_label: "Year",
  month_names: [],
  day_names: [],
};

const EVENT_TYPES = ["event", "character", "lore", "omen", "session"];

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
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
    character_ids: [],
    lore_entry_ids: [],
    calendar_snapshot: calendar,
  };
}

function eventKey(event) {
  return [toNumber(event.year, 1), toNumber(event.month, 1), toNumber(event.day, 1), event.title || ""].join(":");
}

function formatDate(event, calendar) {
  const monthIndex = Math.max(0, toNumber(event.month, 1) - 1);
  const dayIndex = Math.max(0, toNumber(event.day, 1) - 1);
  const monthName = calendar.month_names[monthIndex] || `Month ${event.month}`;
  const dayName = calendar.day_names[dayIndex] || `Day ${event.day}`;
  return `${calendar.era_label || "Year"} ${event.year}, ${monthName}, ${dayName}`;
}

function groupEvents(events) {
  const years = new Map();
  for (const event of events) {
    const year = toNumber(event.year, 1);
    const month = toNumber(event.month, 1);
    const day = toNumber(event.day, 1);
    if (!years.has(year)) years.set(year, new Map());
    const months = years.get(year);
    if (!months.has(month)) months.set(month, new Map());
    const days = months.get(month);
    if (!days.has(day)) days.set(day, []);
    days.get(day).push(event);
  }
  return [...years.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, months]) => ({
      year,
      months: [...months.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([month, days]) => ({
          month,
          days: [...days.entries()].sort((a, b) => a[0] - b[0]).map(([day, dayEvents]) => ({ day, events: dayEvents.sort((a, b) => eventKey(a).localeCompare(eventKey(b))) })),
        })),
    }));
}

export default function Timeline() {
  const [user, setUser] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [events, setEvents] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [lore, setLore] = useState([]);
  const [calendarDraft, setCalendarDraft] = useState(DEFAULT_CALENDAR);
  const [entry, setEntry] = useState(null);
  const [savingCalendar, setSavingCalendar] = useState(false);
  const [savingEntry, setSavingEntry] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const calendar = useMemo(() => normalizeCalendar(campaign), [campaign]);
  const canManage = isDmUser(user);

  const load = async () => {
    const currentUser = await appClient.auth.me();
    const [campaigns, timelineEvents, sheets, loreEntries] = await Promise.all([
      appClient.entities.Campaign.list("-created_date", 200),
      appClient.entities.TimelineEvent.filter({ campaign_id: currentUser.campaign_id }, "year", 500),
      appClient.entities.CharacterSheet.filter({ campaign_id: currentUser.campaign_id }, "name", 500),
      appClient.entities.LoreEntry.filter({ campaign_id: currentUser.campaign_id }, "title", 500),
    ]);
    const currentCampaign = campaigns.find((item) => item.id === currentUser.campaign_id) || null;
    const nextCalendar = normalizeCalendar(currentCampaign);
    setUser(currentUser);
    setCampaign(currentCampaign);
    setCalendarDraft(nextCalendar);
    setEvents(timelineEvents.sort((a, b) => eventKey(a).localeCompare(eventKey(b))));
    setCharacters(sheets);
    setLore(loreEntries);
    setLoaded(true);
  };

  useEffect(() => {
    load().catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (entry && !entry.id) setEntry((current) => ({ ...current, calendar_snapshot: calendar }));
  }, [calendar, entry?.id]);

  const grouped = useMemo(() => groupEvents(events), [events]);
  const characterById = useMemo(() => new Map(characters.map((character) => [character.id, character])), [characters]);
  const loreById = useMemo(() => new Map(lore.map((item) => [item.id, item])), [lore]);

  if (!loaded) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!canManage) {
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
    await appClient.entities.Campaign.update(campaign.id, { calendar_system: normalized });
    setSavingCalendar(false);
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
    if (!entry?.title?.trim()) return;
    setSavingEntry(true);
    const payload = {
      ...entry,
      title: entry.title.trim(),
      year: Math.max(1, toNumber(entry.year, 1)),
      month: Math.min(calendar.months_per_year, Math.max(1, toNumber(entry.month, 1))),
      day: Math.min(calendar.days_per_month, Math.max(1, toNumber(entry.day, 1))),
      calendar_snapshot: calendar,
    };
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

  return (
    <div className="p-6 pb-28 lg:p-10 lg:pb-28 space-y-6">
      <PageHeader
        eyebrow="Chronicle"
        title="Timeline Tree"
        description="Arrange the campaign by custom years, named months, and named days."
        action={
          canManage ? (
            <Button onClick={() => setEntry(emptyEvent(user?.campaign_id, calendar))}>
              <Plus className="w-4 h-4" /> Event
            </Button>
          ) : null
        }
      />

      {canManage && (
        <section className="border border-border bg-card/50 rounded-sm overflow-hidden">
          <div className="flex items-center justify-between gap-3 flex-wrap border-b border-border p-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.24em] text-accent font-medium">Calendar Rules</div>
              <div className="text-sm text-muted-foreground mt-1">Set the shape of this world before adding dates.</div>
            </div>
            <Button onClick={saveCalendar} disabled={savingCalendar || !campaign?.id}>
              <Save className="w-4 h-4" /> {savingCalendar ? "Saving" : "Save Calendar"}
            </Button>
          </div>
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
        </section>
      )}

      {entry && canManage && (
        <form onSubmit={saveEntry} className="border border-border bg-card/60 rounded-sm overflow-hidden">
          <div className="flex items-center justify-between gap-3 flex-wrap border-b border-border p-4">
            <div className="flex items-center gap-2 text-accent">
              <CalendarDays className="w-4 h-4" />
              <span className="text-[10px] uppercase tracking-[0.24em] font-medium">{entry.id ? "Edit Timepoint" : "New Timepoint"}</span>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setEntry(null)}>Cancel</Button>
              <Button type="submit" disabled={savingEntry || !entry.title?.trim()}>
                <Save className="w-4 h-4" /> {savingEntry ? "Saving" : "Save"}
              </Button>
            </div>
          </div>
          <div className="p-4 grid xl:grid-cols-[1fr_0.8fr] gap-4">
            <div className="space-y-3">
              <Field label="Title">
                <Input value={entry.title} onChange={(event) => updateEntry({ title: event.target.value })} placeholder="A pact is broken" />
              </Field>
              <Field label="Description">
                <Textarea value={entry.description} onChange={(event) => updateEntry({ description: event.target.value })} placeholder="What changed in the world?" />
              </Field>
              <div className="grid sm:grid-cols-4 gap-3">
                <Field label={calendar.era_label || "Year"}>
                  <Input type="number" min="1" value={entry.year} onChange={(event) => updateEntry({ year: event.target.value })} />
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

      <section className="border border-border bg-card/50 rounded-sm overflow-hidden">
        <div className="border-b border-border p-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-accent font-medium">World Branches</div>
            <div className="text-sm text-muted-foreground mt-1">{events.length} saved timepoint{events.length === 1 ? "" : "s"}</div>
          </div>
          <Sparkles className="w-4 h-4 text-accent" />
        </div>
        {grouped.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground border border-dashed border-border m-4 rounded-sm">No timeline entries yet.</div>
        ) : (
          <div className="p-4 space-y-5">
            {grouped.map((yearGroup) => (
              <div key={yearGroup.year} className="relative pl-6">
                <div className="absolute left-2 top-7 bottom-0 w-px bg-accent/40" />
                <div className="flex items-center gap-2 font-display text-2xl">
                  <GitBranch className="w-5 h-5 text-accent" /> {calendar.era_label || "Year"} {yearGroup.year}
                </div>
                <div className="mt-3 space-y-4">
                  {yearGroup.months.map((monthGroup) => (
                    <div key={`${yearGroup.year}-${monthGroup.month}`} className="relative pl-6">
                      <div className="absolute left-[-0.9rem] top-3 h-px w-6 bg-accent/40" />
                      <div className="text-sm uppercase tracking-[0.2em] text-accent">{calendar.month_names[monthGroup.month - 1] || `Month ${monthGroup.month}`}</div>
                      <div className="mt-3 space-y-3">
                        {monthGroup.days.map((dayGroup) => (
                          <div key={`${yearGroup.year}-${monthGroup.month}-${dayGroup.day}`} className="relative pl-5">
                            <div className="absolute left-[-0.45rem] top-3 h-px w-5 bg-border" />
                            <div className="text-xs text-muted-foreground">{calendar.day_names[dayGroup.day - 1] || `Day ${dayGroup.day}`}</div>
                            <div className="mt-2 grid lg:grid-cols-2 gap-3">
                              {dayGroup.events.map((timelineEvent) => (
                                <TimelineCard
                                  key={timelineEvent.id}
                                  event={timelineEvent}
                                  calendar={calendar}
                                  canManage={canManage}
                                  characterById={characterById}
                                  loreById={loreById}
                                  onEdit={() => setEntry(timelineEvent)}
                                  onDelete={() => deleteEntry(timelineEvent)}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
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

function TimelineCard({ event, calendar, canManage, characterById, loreById, onEdit, onDelete }) {
  const linkedCharacters = (event.character_ids || []).map((id) => characterById.get(id)).filter(Boolean);
  const linkedLore = (event.lore_entry_ids || []).map((id) => loreById.get(id)).filter(Boolean);

  return (
    <article className="border border-border bg-background/55 rounded-sm p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{event.event_type || "event"}</div>
          <h2 className="font-display text-2xl mt-1 truncate">{event.title || "Untitled"}</h2>
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

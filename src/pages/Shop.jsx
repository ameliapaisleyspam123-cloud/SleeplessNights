import React, { useEffect, useMemo, useState } from "react";
import { appClient } from "@/api/appClient";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Archive, Coins, Plus, ReceiptText, Save, ShoppingBag, ShoppingCart, Store, Trash2 } from "lucide-react";

const COINS = [
  ["pp", "PP", 1000],
  ["gp", "GP", 100],
  ["ep", "EP", 50],
  ["sp", "SP", 10],
  ["cp", "CP", 1],
];

const DEFAULT_ITEMS = [
  { name: "Potion of Healing", description: "Restores 2d4 + 2 hit points.", quantity: 6, gp: 50 },
  { name: "Rations (1 day)", description: "Trail food for one adventurer.", quantity: 20, sp: 5 },
  { name: "Torch", description: "Burns for 1 hour.", quantity: 30, cp: 1 },
  { name: "Rope, hempen (50 ft)", description: "Standard adventuring rope.", quantity: 8, gp: 1 },
  { name: "Arrows (20)", description: "A bundle of ammunition.", quantity: 12, gp: 1 },
  { name: "Antitoxin", description: "Advantage on saves against poison for 1 hour.", quantity: 3, gp: 50 },
];

const emptyShop = () => ({ name: "", description: "", status: "open", items: [], purchase_log: [] });
const emptyItem = () => ({ id: itemId(), name: "", description: "", quantity: 1, cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 });
const itemId = () => `item_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

function priceToCopper(item) {
  return COINS.reduce((sum, [key, , value]) => sum + (Number(item[key]) || 0) * value, 0);
}

function walletToCopper(sheet) {
  return COINS.reduce((sum, [key, , value]) => sum + (Number(sheet?.[key]) || 0) * value, 0);
}

function copperToWallet(total) {
  let remaining = Math.max(0, Math.floor(total));
  return COINS.reduce((wallet, [key, , value]) => {
    wallet[key] = Math.floor(remaining / value);
    remaining %= value;
    return wallet;
  }, {});
}

function formatPriceFromCopper(total) {
  if (!total) return "Free";
  const wallet = copperToWallet(total);
  return COINS.map(([key, label]) => (wallet[key] ? `${wallet[key]} ${label}` : "")).filter(Boolean).join(" ");
}

function formatItemPrice(item) {
  const price = COINS.map(([key, label]) => (Number(item?.[key]) ? `${Number(item[key])} ${label}` : "")).filter(Boolean).join(" ");
  return price || "Free";
}

function formatWallet(sheet) {
  return COINS.map(([key, label]) => `${Number(sheet?.[key]) || 0} ${label}`).join(" / ");
}

function readInventory(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function addInventoryItem(inventory, item, quantity) {
  const index = inventory.findIndex((entry) => entry.name?.toLowerCase() === item.name?.toLowerCase());
  if (index >= 0) {
    return inventory.map((entry, idx) => (idx === index ? { ...entry, qty: (Number(entry.qty) || 0) + quantity } : entry));
  }
  return [...inventory, { name: item.name, qty: quantity, weight: "", equipped: false, notes: item.description || "" }];
}

function normalizeItems(items = []) {
  return items.map((item) => ({ ...emptyItem(), ...item, id: item.id || itemId() }));
}

function logDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export default function Shop() {
  const [user, setUser] = useState(null);
  const [shops, setShops] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [selectedShopId, setSelectedShopId] = useState("");
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const currentUser = await appClient.auth.me();
    const [campaignShops, campaignCharacters] = await Promise.all([
      appClient.entities.Shop.filter({ campaign_id: currentUser.campaign_id }, "-updated_date", 200),
      appClient.entities.CharacterSheet.filter({ campaign_id: currentUser.campaign_id }, "name", 200),
    ]);
    setUser(currentUser);
    setShops(campaignShops);
    setCharacters(campaignCharacters);
    setSelectedShopId((current) => current || campaignShops.find((shop) => shop.status !== "closed")?.id || campaignShops[0]?.id || "");
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const isSuperuser = user?.email === "ameliapaisleyspam123@gmail.com";
  const isAdmin = user?.campaign_role === "dm" || (isSuperuser && localStorage.getItem("dm_override") === "true");
  const availableCharacters = characters.filter((character) => isAdmin || character.assigned_to_email === user?.email);
  const selectedShop = shops.find((shop) => shop.id === selectedShopId);
  const selectedCharacter = availableCharacters.find((character) => character.id === selectedCharacterId);
  const openShops = shops.filter((shop) => shop.status !== "closed");
  const allLogs = useMemo(
    () =>
      shops
        .flatMap((shop) => (shop.purchase_log || []).map((entry) => ({ ...entry, shop_name: entry.shop_name || shop.name })))
        .sort((a, b) => String(b.created_date || "").localeCompare(String(a.created_date || ""))),
    [shops],
  );

  useEffect(() => {
    if (!user) return;
    const stillValid = availableCharacters.some((character) => character.id === selectedCharacterId);
    if (!stillValid) setSelectedCharacterId(availableCharacters[0]?.id || "");
  }, [availableCharacters, selectedCharacterId, user]);

  const startNewShop = (withDefaults = false) => {
    setEditing({
      ...emptyShop(),
      name: withDefaults ? "General Goods" : "",
      description: withDefaults ? "A dependable shop stocked with everyday adventuring supplies." : "",
      items: withDefaults ? normalizeItems(DEFAULT_ITEMS) : [],
    });
  };

  const editShop = (shop) => setEditing({ ...emptyShop(), ...shop, items: normalizeItems(shop.items || []) });
  const setEdit = (key, value) => setEditing((current) => ({ ...current, [key]: value }));
  const setItem = (index, key, value) =>
    setEditing((current) => ({
      ...current,
      items: current.items.map((item, idx) => (idx === index ? { ...item, [key]: value } : item)),
    }));
  const addItem = () => setEditing((current) => ({ ...current, items: [...current.items, emptyItem()] }));
  const removeItem = (index) => setEditing((current) => ({ ...current, items: current.items.filter((_, idx) => idx !== index) }));

  const saveShop = async () => {
    if (!editing?.name?.trim() || !user?.campaign_id) return;
    setSaving(true);
    const payload = {
      ...editing,
      name: editing.name.trim(),
      campaign_id: user.campaign_id,
      items: normalizeItems(editing.items).filter((item) => item.name?.trim()),
      purchase_log: editing.purchase_log || [],
    };
    if (editing.id) {
      await appClient.entities.Shop.update(editing.id, payload);
    } else {
      await appClient.entities.Shop.create(payload);
    }
    setEditing(null);
    setSaving(false);
    await load();
  };

  const buyItem = async (item) => {
    if (!selectedShop || !selectedCharacter || !item?.name) return;
    setMessage("");
    const total = priceToCopper(item);
    const currentCopper = walletToCopper(selectedCharacter);
    if (total > currentCopper) {
      setMessage(`${selectedCharacter.name} does not have enough coin for ${item.name}.`);
      return;
    }
    if ((Number(item.quantity) || 0) <= 0) {
      setMessage(`${item.name} is out of stock.`);
      return;
    }

    const before = copperToWallet(currentCopper);
    const after = copperToWallet(currentCopper - total);
    const inventory = addInventoryItem(readInventory(selectedCharacter.inventory), item, 1);
    const nextItems = normalizeItems(selectedShop.items).map((shopItem) =>
      shopItem.id === item.id ? { ...shopItem, quantity: Math.max(0, (Number(shopItem.quantity) || 0) - 1) } : shopItem,
    );
    const entry = {
      id: `purchase_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      created_date: new Date().toISOString(),
      shop_id: selectedShop.id,
      shop_name: selectedShop.name,
      character_id: selectedCharacter.id,
      character_name: selectedCharacter.name,
      player_email: user.email,
      item_name: item.name,
      quantity: 1,
      total_cp: total,
      price_label: formatItemPrice(item),
      currency_before: before,
      currency_after: after,
    };

    await appClient.entities.CharacterSheet.update(selectedCharacter.id, { ...after, inventory: JSON.stringify(inventory) });
    await appClient.entities.Shop.update(selectedShop.id, {
      items: nextItems,
      purchase_log: [entry, ...(selectedShop.purchase_log || [])].slice(0, 300),
    });
    setMessage(`${selectedCharacter.name} bought ${item.name} for ${formatItemPrice(item)}.`);
    await load();
  };

  return (
    <div className="p-6 lg:p-10 space-y-5">
      <PageHeader
        eyebrow="Market"
        title="Shop"
        description={isAdmin ? "Build stores, stock shelves, and audit every player purchase." : "Buy supplies directly with your character's coin."}
        action={
          isAdmin ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => startNewShop(true)}>
                <Store className="w-4 h-4" /> Default Store
              </Button>
              <Button onClick={() => startNewShop(false)}>
                <Plus className="w-4 h-4" /> New Store
              </Button>
            </div>
          ) : null
        }
      />

      {message && <div className="rounded-sm border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-accent">{message}</div>}

      {editing && isAdmin ? (
        <ShopEditor editing={editing} setEdit={setEdit} setItem={setItem} addItem={addItem} removeItem={removeItem} saving={saving} onSave={saveShop} onCancel={() => setEditing(null)} />
      ) : (
        <div className="grid xl:grid-cols-[minmax(0,1fr)_24rem] gap-5">
          <section className="border border-border bg-card/50 rounded-sm overflow-hidden">
            <div className="border-b border-border p-4 flex flex-col md:flex-row md:items-end gap-3">
              <div className="flex-1 min-w-0">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Store</Label>
                <Select value={selectedShopId} onValueChange={setSelectedShopId}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(isAdmin ? shops : openShops).map((shop) => (
                      <SelectItem key={shop.id} value={shop.id}>{shop.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-0">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Character Wallet</Label>
                <Select value={selectedCharacterId} onValueChange={setSelectedCharacterId}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {availableCharacters.map((character) => (
                      <SelectItem key={character.id} value={character.id}>{character.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCharacter && <div className="text-[10px] text-muted-foreground mt-1">{formatWallet(selectedCharacter)}</div>}
              </div>
              {isAdmin && selectedShop && (
                <Button variant="outline" onClick={() => editShop(selectedShop)} className="shrink-0">
                  <Save className="w-4 h-4" /> Edit Store
                </Button>
              )}
            </div>

            {!selectedShop ? (
              <EmptyState label={isAdmin ? "No stores yet. Create one from scratch or start with the default store." : "No open stores yet."} />
            ) : availableCharacters.length === 0 ? (
              <EmptyState label={isAdmin ? "Create a character sheet before shopping." : "Claim a character before shopping."} />
            ) : (
              <div className="p-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-display text-2xl">{selectedShop.name}</h2>
                    <span className={`text-[10px] uppercase tracking-widest rounded-sm border px-2 py-1 ${selectedShop.status === "closed" ? "border-muted-foreground/40 text-muted-foreground" : "border-accent/50 text-accent"}`}>
                      {selectedShop.status || "open"}
                    </span>
                  </div>
                  {selectedShop.description && <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{selectedShop.description}</p>}
                </div>

                <div className="grid md:grid-cols-2 2xl:grid-cols-3 gap-3">
                  {normalizeItems(selectedShop.items).map((item) => {
                    const price = priceToCopper(item);
                    const canBuy = selectedShop.status !== "closed" && selectedCharacter && price <= walletToCopper(selectedCharacter) && (Number(item.quantity) || 0) > 0;
                    return (
                      <div key={item.id} className="border border-border rounded-sm bg-background/60 p-4 flex flex-col min-h-44">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{item.name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">Stock: {Number(item.quantity) || 0}</div>
                          </div>
                          <div className="text-sm text-accent tabular-nums shrink-0">{formatItemPrice(item)}</div>
                        </div>
                        {item.description && <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{item.description}</p>}
                        <Button className="mt-auto w-full" disabled={!canBuy} onClick={() => buyItem(item)}>
                          <ShoppingCart className="w-4 h-4" /> Buy
                        </Button>
                      </div>
                    );
                  })}
                </div>
                {normalizeItems(selectedShop.items).length === 0 && <EmptyState label="This store has no items on the shelves." compact />}
              </div>
            )}
          </section>

          <aside className="space-y-5">
            <div className="border border-border bg-card/50 rounded-sm p-4">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
                <Coins className="w-4 h-4 text-accent" /> Character Coin
              </div>
              {selectedCharacter ? (
                <div className="grid grid-cols-5 gap-2 text-center">
                  {COINS.map(([key, label]) => (
                    <div key={key} className="border border-border rounded-sm bg-background/70 p-2">
                      <div className="text-sm font-medium">{Number(selectedCharacter[key]) || 0}</div>
                      <div className="text-[8px] uppercase tracking-widest text-muted-foreground">{label}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No character selected.</div>
              )}
            </div>

            {isAdmin && (
              <div className="border border-border bg-card/50 rounded-sm overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground">
                  <ReceiptText className="w-4 h-4 text-accent" /> Purchase Log
                </div>
                <div className="max-h-[32rem] overflow-y-auto thin-scroll divide-y divide-border">
                  {allLogs.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground">No purchases yet.</div>
                  ) : (
                    allLogs.map((entry) => (
                      <div key={entry.id} className="p-4 text-sm">
                        <div className="font-medium">{entry.character_name} bought {entry.item_name}</div>
                        <div className="text-xs text-muted-foreground mt-1">{entry.shop_name} - {entry.price_label || formatPriceFromCopper(entry.total_cp)} - {entry.player_email}</div>
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-2">{logDate(entry.created_date)}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function ShopEditor({ editing, setEdit, setItem, addItem, removeItem, saving, onSave, onCancel }) {
  return (
    <section className="border border-border bg-card/50 rounded-sm overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-accent" />
          <h2 className="font-display text-2xl">{editing.id ? "Edit Store" : "New Store"}</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button onClick={onSave} disabled={saving || !editing.name?.trim()}>
            <Save className="w-4 h-4" /> Save Store
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-5">
        <div className="grid md:grid-cols-[1fr_12rem] gap-3">
          <div>
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Store Name</Label>
            <Input className="mt-1" value={editing.name} onChange={(event) => setEdit("name", event.target.value)} placeholder="The Lantern Market" />
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Status</Label>
            <Select value={editing.status || "open"} onValueChange={(value) => setEdit("status", value)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">open</SelectItem>
                <SelectItem value="closed">closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Description</Label>
            <Textarea className="mt-1 min-h-20" value={editing.description || ""} onChange={(event) => setEdit("description", event.target.value)} placeholder="What players see when they enter the shop." />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="text-[10px] uppercase tracking-widest text-accent font-medium">Store Inventory</div>
          <Button size="sm" variant="outline" onClick={addItem}>
            <Plus className="w-4 h-4" /> Add Item
          </Button>
        </div>

        <div className="space-y-3">
          {editing.items.map((item, index) => (
            <div key={item.id || index} className="border border-border rounded-sm bg-background/60 p-3 space-y-3">
              <div className="grid lg:grid-cols-[minmax(12rem,1fr)_7rem_repeat(5,4.5rem)_2.5rem] gap-2 items-end">
                <div>
                  <Label className="text-[9px] uppercase tracking-widest text-muted-foreground">Item</Label>
                  <Input className="mt-1" value={item.name} onChange={(event) => setItem(index, "name", event.target.value)} placeholder="Potion of Healing" />
                </div>
                <div>
                  <Label className="text-[9px] uppercase tracking-widest text-muted-foreground">Stock</Label>
                  <Input className="mt-1 text-center" type="number" min={0} value={item.quantity} onChange={(event) => setItem(index, "quantity", Number(event.target.value) || 0)} />
                </div>
                {COINS.map(([key, label]) => (
                  <div key={key}>
                    <Label className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</Label>
                    <Input className="mt-1 text-center px-1" type="number" min={0} value={item[key] || 0} onChange={(event) => setItem(index, key, Number(event.target.value) || 0)} />
                  </div>
                ))}
                <Button variant="ghost" size="icon" onClick={() => removeItem(index)} title="Remove item">
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
              <Textarea value={item.description || ""} onChange={(event) => setItem(index, "description", event.target.value)} placeholder="Short item description." className="min-h-16" />
            </div>
          ))}
          {editing.items.length === 0 && <EmptyState label="No items yet." compact />}
        </div>
      </div>
    </section>
  );
}

function EmptyState({ label, compact = false }) {
  return (
    <div className={`border border-dashed border-border rounded-sm text-center text-muted-foreground ${compact ? "p-5 text-sm" : "p-10"}`}>
      <Archive className="w-5 h-5 mx-auto mb-2 opacity-60" />
      {label}
    </div>
  );
}

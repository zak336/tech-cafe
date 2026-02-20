"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Trash2, Clock, AlertCircle, Zap } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { useInitializeSlots } from "@/hooks/useInitializeSlots";

interface PickupSlot {
  id: string;
  cafe_id: string;
  slot_time: string;
  max_orders: number;
  is_active: boolean;
  created_at: string;
}

interface SlotAvailability {
  id: string;
  cafe_id: string;
  slot_id: string;
  slot_date: string;
  slot_time: string;
  max_orders: number;
  booked_count: number;
  is_blocked: boolean;
  created_at: string;
}

export default function AdminSlotsPage() {
  const [slots, setSlots] = useState<PickupSlot[]>([]);
  const [availability, setAvailability] = useState<SlotAvailability[]>([]);
  const [cafeId, setCafeId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [newSlotTime, setNewSlotTime] = useState("08:00");
  const [newSlotCapacity, setNewSlotCapacity] = useState(10);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  async function load() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("cafe_id")
      .eq("id", user.id)
      .single();

    if (!profile?.cafe_id) return;
    setCafeId(profile.cafe_id);

    // Load pickup slots templates
    const { data: slotsData } = await supabase
      .from("pickup_slots")
      .select("*")
      .eq("cafe_id", profile.cafe_id)
      .order("slot_time");

    setSlots(slotsData || []);

    // Load today's availability
    const { data: availData } = await supabase
      .from("slot_availability")
      .select("*")
      .eq("cafe_id", profile.cafe_id)
      .eq("slot_date", selectedDate)
      .order("slot_time");

    setAvailability(availData || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [selectedDate]);

  async function handleAddSlot() {
    if (!newSlotTime) {
      toast.error("Select a time");
      return;
    }
    setSaving(true);

    // Check if slot already exists
    const exists = slots.some((s) => s.slot_time === newSlotTime);
    if (exists) {
      toast.error("Slot time already exists");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("pickup_slots").insert({
      cafe_id: cafeId,
      slot_time: newSlotTime,
      max_orders: newSlotCapacity,
      is_active: true,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Slot added successfully");
      setNewSlotTime("08:00");
      setNewSlotCapacity(10);
      load();
    }
    setSaving(false);
  }

  async function handleDeleteSlot(slotId: string) {
    if (
      !confirm(
        "Delete this slot template? Orders already booked will not be affected.",
      )
    )
      return;

    setSaving(true);
    const { error } = await supabase
      .from("pickup_slots")
      .delete()
      .eq("id", slotId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Slot deleted");
      load();
    }
    setSaving(false);
  }

  async function toggleSlotActive(slot: PickupSlot) {
    setSaving(true);
    const { error } = await supabase
      .from("pickup_slots")
      .update({ is_active: !slot.is_active })
      .eq("id", slot.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(slot.is_active ? "Slot disabled" : "Slot enabled");
      setSlots((prev) =>
        prev.map((s) =>
          s.id === slot.id ? { ...s, is_active: !s.is_active } : s,
        ),
      );
    }
    setSaving(false);
  }

  async function toggleBlockDate(availId: string, isBlocked: boolean) {
    setSaving(true);
    const { error } = await supabase
      .from("slot_availability")
      .update({ is_blocked: !isBlocked })
      .eq("id", availId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(isBlocked ? "Slot unblocked" : "Slot blocked");
      setAvailability((prev) =>
        prev.map((a) =>
          a.id === availId ? { ...a, is_blocked: !a.is_blocked } : a,
        ),
      );
    }
    setSaving(false);
  }

  const { initializeSlots, loading: initLoading } = useInitializeSlots();

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-4xl font-bold">Slot Management</h1>
        <p className="text-text-muted mt-1">
          Configure pickup slots and manage availability
        </p>
      </div>

      {/* Initialize Slots Prompt */}
      {slots.length === 0 && (
        <div className="mb-8 p-4 rounded-lg bg-blue/10 border border-blue/20 flex items-start justify-between">
          <div>
            <p className="font-semibold text-blue mb-1">No slots created yet</p>
            <p className="text-sm text-text-muted">
              Create default pickup slots from 8 AM to 10 PM (15-minute
              intervals) to enable customers to place orders.
            </p>
          </div>
          <button
            onClick={() => initializeSlots().then(() => load())}
            disabled={initLoading || saving}
            className="btn btn-gold btn-sm whitespace-nowrap ml-4"
          >
            <Zap size={16} /> Create Slots
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Slot Templates */}
        <div className="card p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Clock size={20} />
            Slot Templates
          </h2>
          <p className="text-text-muted text-sm mb-4">
            Define recurring pickup time slots (15-min intervals)
          </p>

          <div className="flex gap-2 mb-4">
            <input
              type="time"
              value={newSlotTime}
              onChange={(e) => setNewSlotTime(e.target.value)}
              className="input flex-1"
            />
            <input
              type="number"
              value={newSlotCapacity}
              onChange={(e) => setNewSlotCapacity(parseInt(e.target.value))}
              min="1"
              max="100"
              placeholder="Max orders"
              className="input w-24"
            />
            <button
              onClick={handleAddSlot}
              disabled={saving}
              className="btn btn-gold"
            >
              <Plus size={16} /> Add
            </button>
          </div>

          <div className="space-y-2">
            {slots.map((slot) => (
              <div
                key={slot.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border",
                  slot.is_active
                    ? "bg-green/5 border-green/20"
                    : "bg-red/5 border-red/20 opacity-50",
                )}
              >
                <div>
                  <p className="font-mono font-bold">{slot.slot_time}</p>
                  <p className="text-xs text-text-muted">
                    Max {slot.max_orders} orders
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleSlotActive(slot)}
                    disabled={saving}
                    className="text-xs px-2 py-1 rounded bg-blue/10 text-blue hover:bg-blue/20 transition"
                  >
                    {slot.is_active ? "Active" : "Inactive"}
                  </button>
                  <button
                    onClick={() => handleDeleteSlot(slot.id)}
                    disabled={saving}
                    className="text-red hover:text-red-dark transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Availability */}
        <div className="card p-6">
          <h2 className="text-xl font-bold mb-4">Availability</h2>
          <p className="text-text-muted text-sm mb-4">
            Block/unblock slots for specific dates
          </p>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input w-full mb-4"
          />

          {availability.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <AlertCircle size={20} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No slots for this date yet</p>
              <p className="text-xs mt-1">
                Slots are generated automatically from templates
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {availability.map((slot) => (
                <div
                  key={slot.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    slot.is_blocked
                      ? "bg-red/5 border-red/20"
                      : "bg-white border-border",
                  )}
                >
                  <div>
                    <p className="font-mono font-bold">{slot.slot_time}</p>
                    <p className="text-xs text-text-muted">
                      {slot.booked_count}/{slot.max_orders} booked
                    </p>
                  </div>
                  <button
                    onClick={() => toggleBlockDate(slot.id, slot.is_blocked)}
                    disabled={saving}
                    className={cn(
                      "text-xs px-3 py-1 rounded font-medium transition",
                      slot.is_blocked
                        ? "bg-red/20 text-red"
                        : "bg-green/20 text-green",
                    )}
                  >
                    {slot.is_blocked ? "Blocked" : "Open"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

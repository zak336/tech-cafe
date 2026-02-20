"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Plus,
  Trash2,
  Pencil,
  Image as ImageIcon,
  Eye,
  EyeOff,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface Banner {
  id: string;
  cafe_id: string;
  title?: string;
  subtitle?: string;
  image_url: string;
  link_type: "item" | "category" | "url" | "none";
  link_value?: string;
  sort_order: number;
  is_active: boolean;
  starts_at?: string;
  ends_at?: string;
  created_at: string;
  updated_at: string;
}

const EMPTY_BANNER: Partial<Banner> = {
  title: "",
  subtitle: "",
  image_url: "",
  link_type: "none",
  link_value: "",
  sort_order: 0,
  is_active: true,
  starts_at: undefined,
  ends_at: undefined,
};

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [cafeId, setCafeId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Banner> | null>(null);
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

    const { data } = await supabase
      .from("banners")
      .select("*")
      .eq("cafe_id", profile.cafe_id)
      .order("sort_order");

    setBanners(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave() {
    if (!editing?.image_url?.trim()) {
      toast.error("Image URL is required");
      return;
    }

    setSaving(true);
    const payload = {
      cafe_id: cafeId,
      title: editing.title || null,
      subtitle: editing.subtitle || null,
      image_url: editing.image_url,
      link_type: editing.link_type || "none",
      link_value: editing.link_value || null,
      sort_order: editing.sort_order || 0,
      is_active: editing.is_active ?? true,
      starts_at: editing.starts_at || null,
      ends_at: editing.ends_at || null,
    };

    if (editing.id) {
      // Update
      const { error } = await supabase
        .from("banners")
        .update(payload)
        .eq("id", editing.id);

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Banner updated");
        load();
      }
    } else {
      // Create
      const { error } = await supabase.from("banners").insert(payload);

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Banner created");
        load();
      }
    }

    setEditing(null);
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this banner?")) return;
    setSaving(true);

    const { error } = await supabase.from("banners").delete().eq("id", id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Banner deleted");
      load();
    }
    setSaving(false);
  }

  async function toggleActive(banner: Banner) {
    setSaving(true);
    const { error } = await supabase
      .from("banners")
      .update({ is_active: !banner.is_active })
      .eq("id", banner.id);

    if (error) {
      toast.error(error.message);
    } else {
      setBanners((prev) =>
        prev.map((b) =>
          b.id === banner.id ? { ...b, is_active: !b.is_active } : b,
        ),
      );
    }
    setSaving(false);
  }

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold">Banners</h1>
          <p className="text-text-muted mt-1">Manage promotional banners</p>
        </div>
        <button
          onClick={() => setEditing({ ...EMPTY_BANNER })}
          className="btn btn-gold"
        >
          <Plus size={16} /> New Banner
        </button>
      </div>

      {/* Editor Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <h2 className="text-2xl font-bold">
                {editing.id ? "Edit Banner" : "New Banner"}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Image URL *
                </label>
                <input
                  type="url"
                  value={editing.image_url || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, image_url: e.target.value })
                  }
                  placeholder="https://..."
                  className="input w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editing.title || ""}
                    onChange={(e) =>
                      setEditing({ ...editing, title: e.target.value })
                    }
                    placeholder="Banner title"
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Subtitle
                  </label>
                  <input
                    type="text"
                    value={editing.subtitle || ""}
                    onChange={(e) =>
                      setEditing({ ...editing, subtitle: e.target.value })
                    }
                    placeholder="Banner subtitle"
                    className="input w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Link Type
                </label>
                <select
                  value={editing.link_type || "none"}
                  onChange={(e) =>
                    setEditing({ ...editing, link_type: e.target.value as any })
                  }
                  className="input w-full"
                >
                  <option value="none">No Link</option>
                  <option value="item">Menu Item</option>
                  <option value="category">Category</option>
                  <option value="url">URL</option>
                </select>
              </div>

              {editing.link_type !== "none" && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {editing.link_type === "url" ? "URL" : "ID"}
                  </label>
                  <input
                    type={editing.link_type === "url" ? "url" : "text"}
                    value={editing.link_value || ""}
                    onChange={(e) =>
                      setEditing({ ...editing, link_value: e.target.value })
                    }
                    placeholder={
                      editing.link_type === "url"
                        ? "https://..."
                        : "Paste item or category ID"
                    }
                    className="input w-full"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Start Date
                  </label>
                  <input
                    type="datetime-local"
                    value={
                      editing.starts_at ? editing.starts_at.slice(0, 16) : ""
                    }
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        starts_at: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : undefined,
                      })
                    }
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    End Date
                  </label>
                  <input
                    type="datetime-local"
                    value={editing.ends_at ? editing.ends_at.slice(0, 16) : ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        ends_at: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : undefined,
                      })
                    }
                    className="input w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={editing.sort_order || 0}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      sort_order: parseInt(e.target.value),
                    })
                  }
                  className="input w-full"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={editing.is_active ?? true}
                  onChange={(e) =>
                    setEditing({ ...editing, is_active: e.target.checked })
                  }
                  className="w-4 h-4 rounded border border-border"
                />
                <label htmlFor="is_active" className="text-sm font-medium">
                  Active
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-border flex gap-2 justify-end">
              <button
                onClick={() => setEditing(null)}
                disabled={saving}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn btn-gold"
              >
                {editing.id ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banners Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {banners.map((banner) => (
          <div key={banner.id} className="card overflow-hidden">
            <div className="relative w-full h-48 bg-border overflow-hidden">
              {banner.image_url ? (
                <img
                  src={banner.image_url}
                  alt={banner.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-border/50">
                  <ImageIcon size={32} className="text-text-muted opacity-50" />
                </div>
              )}
              <div className="absolute top-2 right-2">
                <button
                  onClick={() => toggleActive(banner)}
                  disabled={saving}
                  className={cn(
                    "p-2 rounded-full transition",
                    banner.is_active
                      ? "bg-green/20 text-green"
                      : "bg-red/20 text-red",
                  )}
                >
                  {banner.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>
            </div>

            <div className="p-4">
              {banner.title && <h3 className="font-bold">{banner.title}</h3>}
              {banner.subtitle && (
                <p className="text-sm text-text-muted">{banner.subtitle}</p>
              )}
              {banner.link_type !== "none" && (
                <p className="text-xs text-blue mt-2">
                  Links to {banner.link_type}: {banner.link_value?.slice(0, 20)}
                  ...
                </p>
              )}
              {banner.starts_at || banner.ends_at ? (
                <p className="text-xs text-text-muted mt-2">
                  {banner.starts_at &&
                    `From ${new Date(banner.starts_at).toLocaleDateString()}`}
                  {banner.ends_at &&
                    ` to ${new Date(banner.ends_at).toLocaleDateString()}`}
                </p>
              ) : null}
            </div>

            <div className="p-4 border-t border-border flex gap-2">
              <button
                onClick={() => {
                  setEditing(banner);
                }}
                disabled={saving}
                className="flex-1 btn btn-secondary text-sm"
              >
                <Pencil size={14} /> Edit
              </button>
              <button
                onClick={() => handleDelete(banner.id)}
                disabled={saving}
                className="btn btn-secondary text-red hover:bg-red/10"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {banners.length === 0 && (
        <div className="text-center py-12">
          <ImageIcon size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-text-muted">No banners yet</p>
          <button
            onClick={() => setEditing({ ...EMPTY_BANNER })}
            className="btn btn-gold mt-4"
          >
            <Plus size={16} /> Create First Banner
          </button>
        </div>
      )}
    </div>
  );
}

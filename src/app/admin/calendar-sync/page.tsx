"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  RefreshCw,
  Plus,
  Copy,
  Check,
  AlertTriangle,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Clock,
  Layers,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface CalendarConnection {
  id: string;
  connectionName: string;
  platform: string;
  importUrl: string | null;
  exportToken: string;
  isActive: boolean;
  syncIntervalMinutes: number;
  lastSyncedAt: string | null;
  nextSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
  createdAt: string;
  inventoryGroup: {
    id: string;
    name: string;
    code: string;
  };
  listingOption?: {
    id: string;
    title: string;
    slug: string;
  } | null;
  _count: {
    events: number;
    availabilityBlocks: number;
    syncLogs: number;
  };
}

interface ConflictLog {
  id: string;
  action: string;
  entityId: string;
  createdAt: string;
  metadata: {
    connectionId?: string;
    platform?: string;
    eventUid?: string;
    summary?: string;
    eventDates?: { start: string; end: string };
    conflictingBookings?: Array<{
      id: string;
      bookingReference: string;
      customerName: string;
      checkInDate: string;
      checkOutDate: string;
    }>;
  };
}

export default function CalendarSyncAdminPage() {
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [conflicts, setConflicts] = useState<ConflictLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formPlatform, setFormPlatform] = useState("AIRBNB");
  const [formImportUrl, setFormImportUrl] = useState("");
  const [formInterval, setFormInterval] = useState(15);
  const [submitting, setSubmitting] = useState(false);

  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/calendar-connections");
      const data = await res.json();
      if (data.success) {
        setConnections(data.connections);
      }

      const confRes = await fetch("/api/admin/calendar-conflicts");
      const confData = await confRes.json();
      if (confData.success) {
        setConflicts(confData.conflictLogs || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Failed to load calendar connections:", msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const res = await fetch("/api/admin/calendar-connections");
        const data = await res.json();
        if (active && data.success) {
          setConnections(data.connections);
        }

        const confRes = await fetch("/api/admin/calendar-conflicts");
        const confData = await confRes.json();
        if (active && confData.success) {
          setConflicts(confData.conflictLogs || []);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("Failed to load calendar connections on mount:", msg);
      } finally {
        if (active) setLoading(false);
      }
    };
    void init();
    return () => {
      active = false;
    };
  }, []);

  const handleManualSync = async (id: string) => {
    setSyncingId(id);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/admin/calendar-connections/${id}/sync`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(
          `Sync completed! Processed: ${data.result.eventsProcessed}, Created: ${data.result.eventsCreated}, Updated: ${data.result.eventsUpdated}, Conflicts: ${data.result.conflictsDetected}`
        );
        await fetchConnections();
      } else {
        setErrorMsg(data.error || "Manual sync encountered an error");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Manual sync failed: ${msg}`);
    } finally {
      setSyncingId(null);
    }
  };

  const handleDeleteConnection = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will release its external calendar blocks.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/calendar-connections/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Connection "${name}" deleted.`);
        await fetchConnections();
      } else {
        setErrorMsg(data.error || "Failed to delete connection");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Delete failed: ${msg}`);
    }
  };

  const handleCreateConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/admin/calendar-connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionName: formName,
          platform: formPlatform,
          importUrl: formImportUrl || null,
          syncIntervalMinutes: formInterval,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Connection "${formName}" created successfully!`);
        setShowAddModal(false);
        setFormName("");
        setFormImportUrl("");
        await fetchConnections();
      } else {
        setErrorMsg(data.error || "Failed to create connection");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Creation error: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const copyExportUrl = (exportToken: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/api/calendar/export/${exportToken}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(exportToken);
    setTimeout(() => setCopiedToken(null), 3000);
  };

  const totalEvents = connections.reduce((acc, c) => acc + c._count.events, 0);
  const totalBlocks = connections.reduce((acc, c) => acc + c._count.availabilityBlocks, 0);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-neutral-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-amber-500 font-serif tracking-widest text-xs uppercase mb-1">
              <span>Hotel Federation Rajasthan</span>
              <span>•</span>
              <span>Inventory Sync Engine</span>
            </div>
            <h1 className="text-3xl font-serif text-white tracking-tight">
              External Channel Calendar Synchronization
            </h1>
            <p className="text-neutral-400 text-sm mt-1">
              Two-way iCal availability synchronization protecting the single physical shared estate (
              <span className="font-mono text-neutral-300">DEV-MAIN-ESTATE</span>).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchConnections()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-sm font-medium transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-500" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition shadow-lg shadow-amber-900/20"
            >
              <Plus className="w-4 h-4" />
              Add Channel Feed
            </button>
          </div>
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-sm flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
            <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-sm flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">{successMsg}</div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5">
            <div className="flex items-center justify-between text-neutral-400 text-xs uppercase font-medium">
              <span>Connected Channels</span>
              <Calendar className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-white mt-2">{connections.length}</div>
            <div className="text-xs text-neutral-500 mt-1">
              {connections.filter((c) => c.isActive).length} active, {connections.filter((c) => !c.isActive).length} paused
            </div>
          </div>

          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5">
            <div className="flex items-center justify-between text-neutral-400 text-xs uppercase font-medium">
              <span>Imported External Events</span>
              <Layers className="w-4 h-4 text-sky-500" />
            </div>
            <div className="text-2xl font-bold text-white mt-2">{totalEvents}</div>
            <div className="text-xs text-neutral-500 mt-1">Across Airbnb, Booking.com, VRBO</div>
          </div>

          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5">
            <div className="flex items-center justify-between text-neutral-400 text-xs uppercase font-medium">
              <span>Active Estate Blocks</span>
              <Clock className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-white mt-2">{totalBlocks}</div>
            <div className="text-xs text-neutral-500 mt-1">
              Blocks Main Bedroom, 2BR & Full Villa
            </div>
          </div>

          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5">
            <div className="flex items-center justify-between text-neutral-400 text-xs uppercase font-medium">
              <span>Sync Conflicts</span>
              <AlertTriangle className={`w-4 h-4 ${conflicts.length > 0 ? "text-amber-500 animate-pulse" : "text-neutral-500"}`} />
            </div>
            <div className={`text-2xl font-bold mt-2 ${conflicts.length > 0 ? "text-amber-400" : "text-white"}`}>
              {conflicts.length}
            </div>
            <div className="text-xs text-neutral-500 mt-1">
              {conflicts.length === 0 ? "Zero double-bookings" : "Direct bookings preserved"}
            </div>
          </div>
        </div>

        {/* Physical Invariant Info Box */}
        <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 text-amber-200/90 text-sm flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-300">
              Shared Physical Inventory Invariant Enforcement
            </p>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Dev Stays Jaipur is one physical estate with 3 configurable options (Main Bedroom, 2 Bedrooms, Whole Villa).
              Every external reservation imported from any channel atomically writes an exclusive block to inventory group{" "}
              <code className="text-amber-400 font-mono">DEV-MAIN-ESTATE</code>, instantaneously blocking all 3 options on the website.
              If an external calendar attempts to overlap an existing confirmed website reservation, the website booking is strictly preserved.
            </p>
          </div>
        </div>

        {/* Conflict Warning Section (if any) */}
        {conflicts.length > 0 && (
          <div className="bg-neutral-900 border border-amber-900/60 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-amber-400 font-medium">
              <AlertTriangle className="w-5 h-5" />
              <h2>Detected Channel Overlaps / Conflicts ({conflicts.length})</h2>
            </div>
            <p className="text-xs text-neutral-400">
              The following external calendar reservations overlap with direct website bookings. In accordance with platform policy, direct website bookings are always protected and kept confirmed.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-neutral-800 rounded-lg overflow-hidden">
                <thead className="bg-neutral-800/80 text-neutral-300 uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Detected At</th>
                    <th className="p-3">External Event UID</th>
                    <th className="p-3">Conflicting Direct Booking</th>
                    <th className="p-3">Direct Guest</th>
                    <th className="p-3">Overlap Dates</th>
                    <th className="p-3">Action Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {conflicts.map((c) => {
                    const direct = c.metadata.conflictingBookings?.[0];
                    return (
                      <tr key={c.id} className="hover:bg-neutral-800/40">
                        <td className="p-3 text-neutral-400 font-mono">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3 font-mono text-neutral-300 max-w-xs truncate">
                          {c.metadata.eventUid || c.entityId}
                        </td>
                        <td className="p-3 font-medium text-amber-300">
                          {direct?.bookingReference || "Direct Reservation"}
                        </td>
                        <td className="p-3 text-neutral-300">{direct?.customerName || "Customer"}</td>
                        <td className="p-3 text-neutral-400">
                          {direct ? `${direct.checkInDate.slice(0, 10)} → ${direct.checkOutDate.slice(0, 10)}` : "Dates"}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-medium">
                            Direct Booking Preserved
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Connections List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-serif text-white">Active Channel Connections</h2>
            <span className="text-xs text-neutral-500 font-mono">
              Auto-sync intervals: every 15 minutes
            </span>
          </div>

          {connections.length === 0 && !loading && (
            <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-12 text-center space-y-3">
              <Calendar className="w-10 h-10 text-neutral-600 mx-auto" />
              <p className="text-neutral-300 font-medium">No channel connections created yet</p>
              <p className="text-xs text-neutral-500 max-w-md mx-auto">
                Connect Airbnb, Booking.com, or VRBO iCal feeds to automate real-time availability synchronization.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Your First Channel
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {connections.map((conn) => (
              <div
                key={conn.id}
                className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-5 hover:border-neutral-700 transition space-y-4"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {conn.platform}
                      </span>
                      <h3 className="font-semibold text-white text-base">{conn.connectionName}</h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium ${
                          conn.isActive
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : "bg-neutral-800 text-neutral-400"
                        }`}
                      >
                        {conn.isActive ? "Active" : "Paused"}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-400">
                      Inventory Group:{" "}
                      <span className="text-neutral-200 font-mono">{conn.inventoryGroup.name}</span> (
                      {conn.inventoryGroup.code})
                      {conn.listingOption && (
                        <span>
                          {" "}• Option: <span className="text-amber-400">{conn.listingOption.title}</span>
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleManualSync(conn.id)}
                      disabled={syncingId === conn.id || !conn.isActive}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${syncingId === conn.id ? "animate-spin text-amber-500" : ""}`}
                      />
                      {syncingId === conn.id ? "Syncing..." : "Sync Now"}
                    </button>

                    <button
                      onClick={() => handleDeleteConnection(conn.id, conn.connectionName)}
                      className="p-1.5 rounded-lg bg-neutral-800 hover:bg-red-950/60 hover:text-red-400 text-neutral-400 transition"
                      title="Delete connection"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Feed Details & Export URL */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-neutral-800/80 text-xs">
                  {/* Import URL */}
                  <div className="space-y-1">
                    <span className="text-neutral-500 font-medium">Channel Import Feed (Inbound):</span>
                    <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 font-mono text-neutral-300 break-all select-all flex items-center justify-between gap-2">
                      <span className="truncate">{conn.importUrl || "No import feed URL configured"}</span>
                      {conn.importUrl && (
                        <a
                          href={conn.importUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-neutral-500 hover:text-neutral-300 shrink-0"
                          title="Open URL"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Export Feed */}
                  <div className="space-y-1">
                    <span className="text-neutral-500 font-medium">
                      Dev Stays Export Feed (Paste into {conn.platform}):
                    </span>
                    <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 font-mono text-neutral-300 flex items-center justify-between gap-2">
                      <span className="truncate">
                        /api/calendar/export/{conn.exportToken}
                      </span>
                      <button
                        onClick={() => copyExportUrl(conn.exportToken)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs shrink-0 transition"
                      >
                        {copiedToken === conn.exportToken ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-neutral-400" />
                            <span>Copy URL</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Status bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-400 pt-1">
                  <div className="flex items-center gap-3">
                    <span>
                      Events Imported: <strong className="text-white">{conn._count.events}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Estate Blocks: <strong className="text-white">{conn._count.availabilityBlocks}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Interval: <strong className="text-white">{conn.syncIntervalMinutes}m</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span>Last Synced:</span>
                    <span className="font-mono text-neutral-300">
                      {conn.lastSyncedAt
                        ? new Date(conn.lastSyncedAt).toLocaleTimeString()
                        : "Never"}
                    </span>
                    {conn.lastSyncStatus && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold ${
                          conn.lastSyncStatus === "SUCCESS"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : conn.lastSyncStatus === "WARNING"
                            ? "bg-amber-950 text-amber-400 border border-amber-800"
                            : "bg-red-950 text-red-400 border border-red-800"
                        }`}
                      >
                        {conn.lastSyncStatus}
                      </span>
                    )}
                  </div>
                </div>

                {conn.lastSyncError && (
                  <div className="p-2.5 rounded bg-red-950/40 border border-red-900/60 text-red-300 text-xs font-mono">
                    {conn.lastSyncError}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Modal: Add Channel Feed */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-500" />
                  <h3 className="text-lg font-semibold text-white">Add External Channel Feed</h3>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-neutral-500 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateConnection} className="space-y-4 text-xs">
                <div>
                  <label className="block text-neutral-400 font-medium mb-1">Channel Platform</label>
                  <select
                    value={formPlatform}
                    onChange={(e) => setFormPlatform(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="AIRBNB">Airbnb</option>
                    <option value="BOOKING_COM">Booking.com</option>
                    <option value="VRBO">VRBO</option>
                    <option value="OTHER">Other iCal Feed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-400 font-medium mb-1">
                    Connection Label / Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Airbnb - Full Villa Listing"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 font-medium mb-1">
                    Channel iCal Import URL (Inbound feed)
                  </label>
                  <input
                    type="url"
                    placeholder="https://www.airbnb.com/calendar/ical/..."
                    value={formImportUrl}
                    onChange={(e) => setFormImportUrl(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-white placeholder-neutral-600 font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Paste the calendar export link provided in your Airbnb or OTA host calendar export settings.
                  </p>
                </div>

                <div>
                  <label className="block text-neutral-400 font-medium mb-1">
                    Sync Interval (Minutes)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={1440}
                    value={formInterval}
                    onChange={(e) => setFormInterval(parseInt(e.target.value, 10) || 15)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Default: 15 minutes. Background BullMQ queue processes recurring sync automatically.
                  </p>
                </div>

                <div className="pt-4 border-t border-neutral-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium disabled:opacity-50"
                  >
                    {submitting ? "Connecting & Syncing..." : "Add & Initialize Connection"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

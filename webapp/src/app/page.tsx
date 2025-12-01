'use client';

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

type Entry = {
  id: string;
  plateNumber: string;
  yukBilan: number;
  yuksiz: number;
  sofVazin: number;
  date: string;
  price: number;
  checkNumber: string;
};

const camelLogoSrc =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=200&q=80";

const backgroundUrl =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80";

const MoonIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M21 12.79A9 9 0 0 1 11.21 3 7 7 0 1 0 21 12.79z" />
  </svg>
);

const AlarmIndicator = ({
  muted,
  onToggle,
}: {
  muted: boolean;
  onToggle: () => void;
}) => {
  const [tick, setTick] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {
          /* ignored */
        });
      }
    };
  }, []);

  useEffect(() => {
    if (muted) {
      return undefined;
    }

    const ensureContext = () => {
      if (typeof window === "undefined") {
        return null;
      }
      if (!audioContextRef.current) {
        const win = window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        };
        const AudioCtx = win.AudioContext ?? win.webkitAudioContext;
        audioContextRef.current = AudioCtx ? new AudioCtx() : null;
      }
      const ctx = audioContextRef.current;
      if (ctx && ctx.state === "suspended") {
        void ctx.resume().catch(() => {
          /* ignored */
        });
      }
      return ctx;
    };

    const playChirp = () => {
      const ctx = ensureContext();
      if (!ctx) {
        return;
      }
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 740;
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.22);
    };

    const interval = setInterval(() => {
      setTick((value) => value + 1);
      try {
        playChirp();
      } catch {
        /* ignored */
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [muted]);

  return (
    <div className="flex items-center gap-4 rounded-xl bg-red-900/80 p-4 shadow-lg shadow-red-900/70">
      <div className="relative flex h-12 w-12 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-red-500/60" />
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-red-500 font-semibold">
          🔔
        </span>
      </div>
      <div>
        <p className="text-lg font-semibold tracking-wide">Alarm Active</p>
        <p className="text-sm text-red-100/90">
          Caravan safeguard ping #{tick.toString().padStart(3, "0")}
        </p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className="ml-auto rounded-lg border border-red-200/40 px-4 py-2 text-xs font-medium uppercase tracking-widest text-red-50 transition hover:bg-red-50/10"
      >
        {muted ? "Unmute" : "Mute"}
      </button>
    </div>
  );
};

const initialDate = () => new Date().toISOString().split("T")[0];

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [relayTimestamp, setRelayTimestamp] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [alarmMuted, setAlarmMuted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    plateNumber: "",
    yukBilan: "",
    yuksiz: "",
    date: initialDate(),
    price: "30000",
    checkNumber: "",
  });

  const sofVazin = useMemo(() => {
    const load = Number(formData.yukBilan);
    const empty = Number(formData.yuksiz);
    if (Number.isNaN(load) || Number.isNaN(empty)) {
      return 0;
    }
    return Math.max(load - empty, 0);
  }, [formData.yukBilan, formData.yuksiz]);

  const hasWeights =
    formData.yukBilan.trim() !== "" && formData.yuksiz.trim() !== "";

  const handleRelay = () => {
    const now = new Date();
    setRelayTimestamp(now.toLocaleString());
  };

  const handleInputChange = (
    field: keyof typeof formData,
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      plateNumber: "",
      yukBilan: "",
      yuksiz: "",
      date: initialDate(),
      price: "30000",
      checkNumber: "",
    });
    setEditingId(null);
  };

  const handleSubmit = () => {
    const plateNumber = formData.plateNumber.trim();
    const yukBilan = Number(formData.yukBilan);
    const yuksiz = Number(formData.yuksiz);
    const price = Number(formData.price);
    const date = formData.date;
    const checkNumber = formData.checkNumber.trim();

    if (!plateNumber) {
      setFormError("Plate Number is required.");
      return;
    }

    if (Number.isNaN(yukBilan) || Number.isNaN(yuksiz)) {
      setFormError("Both Yuk bilan and Yuksiz must be valid numbers.");
      return;
    }

    if (Number.isNaN(price)) {
      setFormError("Summa must be a valid number.");
      return;
    }

    const entry: Entry = {
      id: editingId ?? crypto.randomUUID(),
      plateNumber,
      yukBilan,
      yuksiz,
      sofVazin,
      date,
      price,
      checkNumber,
    };

    setEntries((prev) => {
      if (editingId) {
        return prev.map((item) => (item.id === editingId ? entry : item));
      }
      return [...prev, entry];
    });

    setFormError(null);
    resetForm();
  };

  const handleEdit = (id: string) => {
    const item = entries.find((entry) => entry.id === id);
    if (!item) return;
    setFormData({
      plateNumber: item.plateNumber,
      yukBilan: item.yukBilan.toString(),
      yuksiz: item.yuksiz.toString(),
      date: item.date,
      price: item.price.toString(),
      checkNumber: item.checkNumber,
    });
    setEditingId(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id: string) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
    if (editingId === id) {
      resetForm();
    }
  };

  const displayedEntries = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return entries;
    }
    return entries.filter((entry) =>
      [
        entry.plateNumber,
        entry.yukBilan,
        entry.yuksiz,
        entry.sofVazin,
        entry.date,
        entry.price,
        entry.checkNumber,
      ]
        .map((value) => value.toString().toLowerCase())
        .some((value) => value.includes(term)),
    );
  }, [entries, searchTerm]);

  const isSearchActive = searchTerm.trim().length > 0;

  return (
    <div
      className="min-h-screen bg-cover bg-center text-white"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.72), rgba(0,0,0,0.75)), url(${backgroundUrl})`,
      }}
    >
      <div className="min-h-screen bg-black/10 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-8 lg:px-12">
          <header className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-amber-400 shadow-lg shadow-amber-900/50">
                <Image src={camelLogoSrc} alt="Camel caravan logo" fill sizes="64px" />
              </div>
              <div>
                <p className="text-xl font-semibold tracking-wide uppercase">Desert Weighmaster</p>
                <p className="text-sm uppercase tracking-[0.35em] text-amber-200/80">
                  Caravan logistics control
                </p>
              </div>
            </div>
            <div className="flex flex-1 items-center justify-end gap-4">
              <div className="relative max-w-md flex-1 sm:flex-initial">
                <MoonIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-amber-200/80" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="w-full rounded-full border border-white/20 bg-white/10 py-3 pl-10 pr-5 text-sm tracking-wide text-white placeholder:text-white/60 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-200/50"
                  placeholder="Search caravan records"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-lg border border-white/30 px-4 py-2 text-sm font-medium uppercase tracking-widest text-white transition hover:border-amber-200 hover:bg-amber-200/10"
                >
                  Print
                </button>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="rounded-lg border border-white/30 px-4 py-2 text-sm font-medium uppercase tracking-widest text-white transition hover:border-amber-200 hover:bg-amber-200/10"
                >
                  Reload
                </button>
              </div>
            </div>
          </header>

          <AlarmIndicator
            muted={alarmMuted}
            onToggle={() => setAlarmMuted((prev) => !prev)}
          />

          <section className="grid gap-8 rounded-3xl border border-white/10 bg-black/35 p-8 shadow-2xl shadow-black/40">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
              <h2 className="text-2xl font-semibold uppercase tracking-[0.3em] text-amber-200">
                Load Manifest Entry
              </h2>
              <div className="flex flex-wrap gap-2 text-xs font-medium uppercase tracking-widest">
                <span className="rounded-full border border-white/20 px-4 py-2">Add</span>
                <span className="rounded-full border border-white/20 px-4 py-2">Edit</span>
                <span className="rounded-full border border-white/20 px-4 py-2">Delete</span>
                <span className="rounded-full border border-white/20 px-4 py-2">Relay</span>
              </div>
            </div>

            <form
              className="grid grid-cols-1 gap-6 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                handleSubmit();
              }}
            >
              <label className="flex flex-col gap-2 text-sm uppercase tracking-widest">
                Plate Number
                <input
                  value={formData.plateNumber}
                  onChange={(event) => handleInputChange("plateNumber", event.target.value)}
                  placeholder="Enter plate number"
                  className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-base normal-case text-white placeholder:text-white/60 focus:border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-200/50"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm uppercase tracking-widest">
                Add-on Check Number
                <input
                  value={formData.checkNumber}
                  onChange={(event) => handleInputChange("checkNumber", event.target.value)}
                  placeholder="Verification code"
                  className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-base normal-case text-white placeholder:text-white/60 focus:border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-200/50"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm uppercase tracking-widest">
                Yuk bilan (Kg)
                <input
                  type="number"
                  value={formData.yukBilan}
                  onChange={(event) => handleInputChange("yukBilan", event.target.value)}
                  placeholder="e.g. 12000"
                  className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-base normal-case text-white placeholder:text-white/60 focus:border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-200/50"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm uppercase tracking-widest">
                Yuksiz (Kg)
                <input
                  type="number"
                  value={formData.yuksiz}
                  onChange={(event) => handleInputChange("yuksiz", event.target.value)}
                  placeholder="e.g. 8000"
                  className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-base normal-case text-white placeholder:text-white/60 focus:border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-200/50"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm uppercase tracking-widest">
                Sof Vazin (Kg)
                <input
                  value={hasWeights ? sofVazin.toLocaleString() : ""}
                  readOnly
                  placeholder="Computed"
                  className="cursor-not-allowed rounded-xl border border-amber-200/50 bg-amber-200/10 px-4 py-3 text-base normal-case text-amber-100"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm uppercase tracking-widest">
                Date
                <input
                  type="date"
                  value={formData.date}
                  onChange={(event) => handleInputChange("date", event.target.value)}
                  className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-base normal-case text-white focus:border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-200/50"
                />
              </label>
              <label className="flex flex-col gap-3 text-sm uppercase tracking-widest md:col-span-2">
                Summa (Price)
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <input
                    type="number"
                    min={30000}
                    max={40000}
                    step={100}
                    value={formData.price}
                    onChange={(event) => handleInputChange("price", event.target.value)}
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-base normal-case text-white focus:border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-200/50 lg:max-w-xs"
                  />
                  <div className="flex gap-3 text-xs font-semibold uppercase tracking-widest">
                    <button
                      type="button"
                      onClick={() => handleInputChange("price", "30000")}
                      className="rounded-full border border-white/20 px-4 py-2 transition hover:border-amber-200 hover:bg-amber-200/10"
                    >
                      30,000
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInputChange("price", "40000")}
                      className="rounded-full border border-white/20 px-4 py-2 transition hover:border-amber-200 hover:bg-amber-200/10"
                    >
                      40,000
                    </button>
                  </div>
                  <span className="text-xs uppercase tracking-widest text-white/60">
                    Preferred range: 30,000 – 40,000
                  </span>
                </div>
              </label>

              {formError && (
                <p className="md:col-span-2 rounded-xl border border-red-400/60 bg-red-900/40 px-4 py-3 text-sm font-medium text-red-100">
                  {formError}
                </p>
              )}

              <div className="flex flex-col gap-3 md:col-span-2 md:flex-row md:items-center md:justify-between">
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="rounded-xl border border-amber-300 bg-amber-400/70 px-6 py-3 text-sm font-semibold uppercase tracking-widest text-black transition hover:bg-amber-300"
                  >
                    {editingId ? "Update Entry" : "Add Entry"}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold uppercase tracking-widest text-white transition hover:border-amber-200 hover:bg-amber-200/10"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleRelay}
                    className="rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold uppercase tracking-widest text-white transition hover:border-amber-200 hover:bg-amber-200/10"
                  >
                    Relay
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold uppercase tracking-widest text-white transition hover:border-amber-200 hover:bg-amber-200/10"
                  >
                    Clear Form
                  </button>
                </div>
              </div>

              {relayTimestamp && (
                <div className="md:col-span-2 rounded-xl border border-amber-200/50 bg-amber-200/10 px-4 py-3 text-xs font-semibold uppercase tracking-widest text-amber-100">
                  Data relay confirmed at {relayTimestamp}
                </div>
              )}
            </form>
          </section>

          <section className="rounded-3xl border border-white/10 bg-black/45 p-8 shadow-2xl shadow-black/40">
            <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-xl font-semibold uppercase tracking-[0.25em] text-amber-200">
                Caravan Weight Ledger
              </h3>
              <span className="text-xs uppercase tracking-widest text-white/70">
                {entries.length} total entries
              </span>
            </header>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/10 text-sm">
                <thead className="uppercase tracking-[0.3em] text-amber-200 text-xs">
                  <tr className="bg-white/5">
                    <th className="px-4 py-3 text-left">Plate_Number</th>
                    <th className="px-4 py-3 text-left">Yuk_bilan</th>
                    <th className="px-4 py-3 text-left">Sana (Date)</th>
                    <th className="px-4 py-3 text-left">Yuksiz</th>
                    <th className="px-4 py-3 text-left">Sof_Vazin</th>
                    <th className="px-4 py-3 text-left">Price</th>
                    <th className="px-4 py-3 text-left">Check_No</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {displayedEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      className={
                        isSearchActive
                          ? "bg-red-900/30 text-red-300"
                          : "bg-white/5 text-white"
                      }
                    >
                      <td className="px-4 py-3 font-medium uppercase tracking-widest">
                        {entry.plateNumber}
                      </td>
                      <td className="px-4 py-3">{entry.yukBilan.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        {new Date(entry.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">{entry.yuksiz.toLocaleString()}</td>
                      <td className="px-4 py-3">{entry.sofVazin.toLocaleString()}</td>
                      <td className="px-4 py-3">{entry.price.toLocaleString()}</td>
                      <td className="px-4 py-3 uppercase tracking-widest">
                        {entry.checkNumber || "––"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(entry.id)}
                            className="rounded-lg border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest transition hover:border-amber-200 hover:bg-amber-200/10"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(entry.id)}
                            className="rounded-lg border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-red-200 transition hover:border-red-200 hover:bg-red-200/10"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {displayedEntries.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-8 text-center text-sm uppercase tracking-[0.3em] text-white/60"
                      >
                        No entries match the search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

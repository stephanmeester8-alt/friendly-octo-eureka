"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatEur } from "@/lib/utils";

export function TaskCreateForm({ walletBalance }: { walletBalance: number }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState(0.5);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onFiles = useCallback((files: FileList | null) => {
    if (!files?.length) return;
    setFile(files[0]);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !description.trim()) {
      setError("Title and description are required.");
      return;
    }
    if (budget < 0) {
      setError("Budget cannot be negative.");
      return;
    }
    if (budget > walletBalance) {
      setError("Insufficient wallet balance. Top up first.");
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          budget,
          fileName: file?.name ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create task");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <label htmlFor="title" className="text-sm font-medium text-[var(--ink)]">
          Title
        </label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Color-correct product shot"
          className="mt-2 h-11 w-full rounded-xl border border-[var(--ink)]/15 bg-[var(--paper)] px-3 text-sm outline-none ring-[var(--snap)] focus:ring-2"
        />
      </div>

      <div>
        <label
          htmlFor="description"
          className="text-sm font-medium text-[var(--ink)]"
        >
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          placeholder="What needs doing? Include format, constraints, and deadline cues."
          className="mt-2 w-full resize-y rounded-xl border border-[var(--ink)]/15 bg-[var(--paper)] px-3 py-2.5 text-sm outline-none ring-[var(--snap)] focus:ring-2"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-[var(--ink)]">
          Attachment
        </label>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            onFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={`mt-2 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-10 transition-colors ${
            dragging
              ? "border-[var(--ink)] bg-[var(--snap)]/20"
              : "border-[var(--ink)]/20 bg-[var(--paper-elevated)] hover:border-[var(--ink)]/40"
          }`}
        >
          <Upload className="mb-3 h-6 w-6 text-[var(--ink-muted)]" />
          <p className="text-sm font-medium text-[var(--ink)]">
            Drop a photo or file here
          </p>
          <p className="mt-1 text-xs text-[var(--ink-muted)]">
            PNG, JPG, PDF, TXT — click to browse
          </p>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf,.txt,.zip"
            onChange={(e) => onFiles(e.target.files)}
          />
        </div>
        {file && (
          <div className="mt-2 flex items-center justify-between rounded-xl border border-[var(--ink)]/10 bg-[var(--paper)] px-3 py-2 text-sm">
            <span className="truncate text-[var(--ink)]">{file.name}</span>
            <button
              type="button"
              onClick={() => setFile(null)}
              className="rounded-md p-1 text-[var(--ink-muted)] hover:bg-[var(--ink)]/5"
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="budget" className="text-sm font-medium text-[var(--ink)]">
            Budget
          </label>
          <span className="text-xs text-[var(--ink-muted)]">
            Available {formatEur(walletBalance)}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-4">
          <input
            id="budget"
            type="range"
            min={0}
            max={Math.max(walletBalance, 5)}
            step={0.1}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--ink)]/10 accent-[var(--coral)]"
          />
          <div className="relative w-28">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--ink-muted)]">
              €
            </span>
            <input
              type="number"
              min={0}
              step={0.1}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="h-11 w-full rounded-xl border border-[var(--ink)]/15 bg-[var(--paper)] pl-7 pr-2 text-sm outline-none ring-[var(--snap)] focus:ring-2"
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-[var(--ink-muted)]">
          Free (€0) tasks are fine — great for portfolio builders and AI workers.
        </p>
      </div>

      {error && (
        <p className="text-sm font-medium text-[var(--coral)]">{error}</p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Posting…" : "Post task"}
      </Button>
    </form>
  );
}

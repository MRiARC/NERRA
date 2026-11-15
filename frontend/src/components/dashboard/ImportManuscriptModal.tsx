"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Surface } from "@/components/ui/Surface";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import { toast } from "sonner";
import type { Project, InspectionOut } from "@/lib/types";
import { useManuscriptStatus } from "@/hooks/useStoryData";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Sparkles,
  Cpu,
  Layers,
  Settings2,
  ArrowRight,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Activity,
  ExternalLink,
  FolderArchive,
  Folder,
  FileCheck,
  ListOrdered,
} from "lucide-react";

interface ImportManuscriptModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
  initialManuscriptId?: string;
  initialStep?: "select" | "processing" | "failed";
}

export function ImportManuscriptModal({
  project,
  isOpen,
  onClose,
  onImportComplete,
  initialManuscriptId,
  initialStep,
}: ImportManuscriptModalProps) {
  const router = useRouter();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [inspectionData, setInspectionData] = useState<InspectionOut | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [sequenceConfirmed, setSequenceConfirmed] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [manualStep, setManualStep] = useState<"select" | "processing" | "failed" | "completed">(
    initialStep ?? (initialManuscriptId ? "processing" : "select")
  );
  const [activeManuscriptId, setActiveManuscriptId] = useState<string | null>(
    initialManuscriptId ?? null
  );
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showRawTrace, setShowRawTrace] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Reset the flow each time the modal opens (adjusting state during render
  // instead of in an effect avoids a second render pass after paint).
  const [previousOpen, setPreviousOpen] = useState(isOpen);
  if (isOpen !== previousOpen) {
    setPreviousOpen(isOpen);
    if (isOpen) {
      setManualStep(initialStep ?? (initialManuscriptId ? "processing" : "select"));
      setActiveManuscriptId(initialManuscriptId ?? null);
      setSelectedFiles([]);
      setInspectionData(null);
      setIsInspecting(false);
      setSequenceConfirmed(true);
      setSyncError(null);
    }
  }

  // Status Poller
  const { data: statusData, refetch: refetchStatus } = useManuscriptStatus(
    project?.id || "",
    activeManuscriptId || undefined
  );

  // Progress is derived from the polled job status, not copied into state.
  const liveStep: "processing" | "failed" | "completed" | null =
    statusData && statusData.manuscript_id === activeManuscriptId
      ? statusData.status === "failed"
        ? "failed"
        : statusData.status === "ready"
        ? "completed"
        : "processing"
      : null;
  const step = liveStep ?? manualStep;

  // Notify the parent once the job finishes; no local state is written here.
  useEffect(() => {
    if (statusData?.status === "ready") {
      onImportComplete?.();
    }
  }, [statusData?.status, onImportComplete]);

  if (!project) return null;

  const runInspection = async (files: File[]) => {
    if (!files.length) return;
    setSelectedFiles(files);
    setIsInspecting(true);
    setSyncError(null);
    try {
      const data = await api.projects.inspectManuscript(project.id, files);
      setInspectionData(data);
      setSequenceConfirmed(true);
    } catch (err: unknown) {
      const msg = getErrorMessage(err, "Failed to inspect manuscript structure");
      toast.error(msg);
      setSyncError(msg);
      setInspectionData(null);
    } finally {
      setIsInspecting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      runInspection(Array.from(e.target.files));
    }
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      runInspection(Array.from(e.target.files));
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
      const collected: File[] = [];
      const traverseEntry = async (entry: any): Promise<void> => {
        if (!entry) return;
        if (entry.isFile) {
          await new Promise<void>((resolve) => {
            entry.file(
              (file: File) => {
                collected.push(file);
                resolve();
              },
              () => resolve()
            );
          });
        } else if (entry.isDirectory) {
          const reader = entry.createReader();
          const readBatch = async (): Promise<any[]> => {
            return new Promise((resolve) => {
              reader.readEntries((entries: any[]) => resolve(entries), () => resolve([]));
            });
          };
          let batch: any[] = [];
          do {
            batch = await readBatch();
            for (const child of batch) {
              await traverseEntry(child);
            }
          } while (batch.length > 0);
        }
      };

      const hasDirectories = Array.from(items).some(
        (it) => it.webkitGetAsEntry && it.webkitGetAsEntry()?.isDirectory
      );

      if (hasDirectories) {
        for (let i = 0; i < items.length; i++) {
          const entry = items[i].webkitGetAsEntry?.();
          if (entry) {
            await traverseEntry(entry);
          }
        }
        if (collected.length > 0) {
          await runInspection(collected);
          return;
        }
      }
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await runInspection(Array.from(e.dataTransfer.files));
    }
  };

  const handleUpload = async () => {
    if (!selectedFiles.length) return;

    setIsUploading(true);
    setSyncError(null);
    try {
      const res = await api.projects.importManuscript(project.id, selectedFiles);
      setActiveManuscriptId(res.manuscript_id);
      setManualStep("processing");
      const summary =
        inspectionData?.source_mode === "zip_archive"
          ? selectedFiles[0]?.name
          : inspectionData?.source_mode === "folder"
          ? `${inspectionData.total_chapters} chapters folder`
          : selectedFiles.length > 1
          ? `${selectedFiles.length} chapter files`
          : selectedFiles[0]?.name || "manuscript";
      toast.info(`Folio "${summary}" accepted. Background ingestion initiated.`);
    } catch (err: unknown) {
      const msg = getErrorMessage(err, "Failed to upload manuscript draft");
      setSyncError(msg);
      setManualStep("failed");
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedFiles([]);
    setInspectionData(null);
    setIsInspecting(false);
    setSyncError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (folderInputRef.current) folderInputRef.current.value = "";
  };

  const handleRetry = async () => {
    if (!activeManuscriptId) return;
    setIsRetrying(true);
    try {
      await api.projects.reanalyzeChapter(project.id, activeManuscriptId);
      setManualStep("processing");
      toast.info("Re-analysis triggered. Monitoring pipeline...");
      await refetchStatus();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to retry analysis"));
    } finally {
      setIsRetrying(false);
    }
  };

  const handleEnterWorkspace = () => {
    onClose();
    router.push(`/projects/${project.id}`);
  };

  // Derive human error diagnosis
  const rawErrorMessage = statusData?.error_note || syncError || "";
  const isAuthError =
    rawErrorMessage.includes("401") ||
    rawErrorMessage.toLowerCase().includes("unauthorized") ||
    rawErrorMessage.toLowerCase().includes("authentication_error") ||
    rawErrorMessage.toLowerCase().includes("api_key");
  const isRateLimit =
    rawErrorMessage.includes("429") || rawErrorMessage.toLowerCase().includes("rate");

  const progressPercent =
    statusData?.chapters_total && statusData.chapters_total > 0
      ? Math.round(((statusData.chapters_done || 0) / statusData.chapters_total) * 100)
      : statusData?.status === "processing"
      ? 15
      : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        step === "failed"
          ? "Extraction Engine Interrupted"
          : step === "processing"
          ? `Ingesting Folio: "${selectedFiles[0]?.name || project.title}"`
          : step === "completed"
          ? "Manuscript Ingestion Complete"
          : inspectionData
          ? "Verify Chapter Sequence"
          : `Import Manuscript to "${project.title}"`
      }
      description={
        step === "failed"
          ? "The background analysis halted. Review the diagnostic report below to configure keys or fall back to air-gapped local extraction."
          : step === "processing"
          ? "NERRA is segmenting chapters, extracting character rosters, indexing temporal anchors, and auditing continuity."
          : step === "completed"
          ? "All chapters have been indexed, entities recognised, and graph chronology synchronised."
          : inspectionData
          ? "Review the detected chapter catalogue and confirm narrative sequence before initiating ingestion."
          : "Ingest your manuscript as a .zip archive, folder of chapters, or single document. NERRA will verify chapter sequence, audit continuity, and populate your story bible."
      }
    >
      <div className="space-y-5 mt-2">
        {/* STEP 1: FILE SELECT & DRAG DROP / PRE-FLIGHT INSPECTION */}
        {step === "select" && (
          <>
            {isInspecting ? (
              <div className="border border-border-quiet rounded-xl p-8 text-center bg-surface-subtle flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-full bg-wine-crimson/10 border border-wine-crimson/30 flex items-center justify-center">
                  <RotateCw className="w-6 h-6 text-wine-crimson animate-spin" />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink-parchment">
                    Analysing Manuscript Folio...
                  </p>
                  <p className="text-[11px] text-ink-ash mt-1 max-w-xs mx-auto">
                    Unpacking archive, calculating cumulative words, and cataloguing chapter sequence.
                  </p>
                </div>
              </div>
            ) : inspectionData ? (
              <div className="space-y-4">
                {/* Folio Summary Card */}
                <Surface depth={2} border="subtle" rounded="md" className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FolderArchive className="w-4 h-4 text-wine-crimson" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-ink-parchment">
                        Folio Pre-Flight Inspection
                      </span>
                    </div>
                    <Badge variant="subtle" size="xs">
                      {inspectionData.source_mode === "zip_archive"
                        ? "ZIP Archive"
                        : inspectionData.source_mode === "folder"
                        ? "Folder Collection"
                        : inspectionData.source_mode === "multi_file"
                        ? "Multi-File Batch"
                        : "Single Manuscript"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-border-quiet">
                    <div className="p-2 rounded bg-surface-subtle">
                      <p className="text-sm font-serif font-medium text-ink-parchment">
                        {inspectionData.total_chapters}
                      </p>
                      <p className="text-[10px] text-ink-ash uppercase font-mono">Chapters</p>
                    </div>
                    <div className="p-2 rounded bg-surface-subtle">
                      <p className="text-sm font-serif font-medium text-ink-parchment">
                        {inspectionData.total_words.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-ink-ash uppercase font-mono">Total Words</p>
                    </div>
                    <div className="p-2 rounded bg-surface-subtle">
                      <p className="text-sm font-serif font-medium text-pine-moss">
                        Within Limit
                      </p>
                      <p className="text-[10px] text-ink-ash uppercase font-mono">&lt; 500k Ceiling</p>
                    </div>
                  </div>

                  {inspectionData.ignored_files && inspectionData.ignored_files.length > 0 && (
                    <div className="p-2.5 rounded bg-surface-subtle/80 border border-border-quiet text-[11px] text-ink-ash flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-wine-crimson shrink-0 mt-0.5" />
                      <span>
                        {inspectionData.ignored_files.length} non-manuscript artefact{inspectionData.ignored_files.length > 1 ? "s" : ""} filtered out (e.g. {inspectionData.ignored_files.slice(0, 3).map((f) => f.split("/").pop()).join(", ")}).
                      </span>
                    </div>
                  )}
                </Surface>

                {/* Sequence Confirmation Checkbox */}
                <label className="flex items-start gap-2.5 p-3 rounded-lg border border-border-quiet bg-surface-subtle hover:bg-surface-card cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={sequenceConfirmed}
                    onChange={(e) => setSequenceConfirmed(e.target.checked)}
                    className="mt-0.5 rounded border-border-prominent text-wine-crimson focus:ring-wine-crimson"
                  />
                  <div>
                    <p className="text-xs font-semibold text-ink-parchment">
                      Sequence verified: Ingest chapters in this detected order
                    </p>
                    <p className="text-[11px] text-ink-ash mt-0.5">
                      Chapters are naturally ordered numerically (e.g. Chapter 2 precedes Chapter 10).
                    </p>
                  </div>
                </label>

                {/* Chapter List Preview */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-ink-ash px-0.5">
                    <span className="font-medium">
                      Detected Chapter Catalogue ({inspectionData.chapters.length})
                    </span>
                    <span className="text-[11px] font-mono text-ink-faint">Naturally Sorted</span>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-border-quiet rounded-lg p-2 bg-surface-subtle/40">
                    {inspectionData.chapters.map((ch) => (
                      <div
                        key={ch.index}
                        className="flex items-start gap-2.5 p-2 rounded-md border border-border-quiet/60 bg-surface-card text-xs"
                      >
                        <span className="px-1.5 py-0.5 rounded bg-surface-subtle font-mono text-[10px] font-bold text-wine-crimson border border-border-quiet shrink-0">
                          #{ch.index}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-ink-parchment truncate">{ch.title}</span>
                            <span className="text-[10px] font-mono text-ink-ash shrink-0">
                              {ch.word_count.toLocaleString()} w
                            </span>
                          </div>
                          <p className="text-[10px] text-ink-faint truncate mt-0.5">{ch.filename}</p>
                          {ch.preview && (
                            <p className="text-[10px] text-ink-ash italic truncate mt-0.5">
                              &ldquo;{ch.preview}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-border-quiet">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSelection}
                    disabled={isUploading}
                    className="text-xs"
                  >
                    Choose Different Files
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleUpload}
                    isLoading={isUploading}
                    disabled={!sequenceConfirmed || isUploading}
                    className="gap-2 text-xs"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Confirm &amp; Begin Ingestion</span>
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 flex flex-col items-center justify-center gap-3 ${
                    isDragOver
                      ? "border-wine-accent bg-wine-accent/10"
                      : "border-border-subtle hover:border-border-prominent bg-surface-subtle"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".zip,.txt,.md,.pdf,.docx,.html,.htm"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <input
                    ref={folderInputRef}
                    type="file"
                    {...({ webkitdirectory: "", directory: "" } as any)}
                    multiple
                    onChange={handleFolderChange}
                    className="hidden"
                  />

                  <div className="w-12 h-12 rounded-full bg-surface-card border border-border-quiet flex items-center justify-center">
                    <FolderArchive className="w-6 h-6 text-wine-crimson" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-ink-parchment">
                      Drag and drop manuscript archive, folder, or chapter files
                    </p>
                    <p className="text-[11px] text-ink-ash mt-1 max-w-sm mx-auto">
                      Supports .zip archives, multi-file folders, .docx, .pdf, .txt, .md, and .html up to 500,000 words
                    </p>
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => fileInputRef.current?.click()}
                      className="gap-1.5 text-xs"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Select File(s) / .ZIP</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => folderInputRef.current?.click()}
                      className="gap-1.5 text-xs"
                    >
                      <Folder className="w-3.5 h-3.5" />
                      <span>Select Folder</span>
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </>
        )}

        {/* STEP 2: LIVE INGESTION RADAR & PROGRESS */}
        {step === "processing" && (
          <div className="space-y-5">
            {/* Live Progress Card */}
            <Surface depth={2} border="subtle" rounded="md" className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-wine-crimson animate-ping" />
                  <span className="text-xs font-mono font-medium text-ink-parchment uppercase tracking-wider">
                    Pipeline Active • {statusData?.chapters_done || 0} / {statusData?.chapters_total || "?"} Chapters Analyzed
                  </span>
                </div>
                <Badge variant="thread" size="xs">
                  {progressPercent}% COMPLETE
                </Badge>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-surface-card rounded-full h-2 overflow-hidden border border-border-quiet">
                <div
                  className="bg-wine-crimson h-full transition-all duration-500 rounded-full"
                  style={{ width: `${Math.max(8, progressPercent)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-ink-ash font-mono">
                <span>Current Stage: Roster & Horizon Pass</span>
                <span>Est. Remaining: ~{Math.max(1, (statusData?.chapters_total || 4) - (statusData?.chapters_done || 0)) * 3}s</span>
              </div>
            </Surface>

            {/* Pipeline Stage Stepper */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
                Extraction Vectors
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-lg border border-border-quiet bg-surface-subtle flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-pine-moss shrink-0" />
                  <div>
                    <p className="font-medium text-ink-parchment">1. Folio Segmentation</p>
                    <p className="text-[10px] text-ink-ash">Regex chapter splitting & hashing</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-wine-crimson/40 bg-wine-crimson/5 flex items-center gap-2.5">
                  <RotateCw className="w-4 h-4 text-wine-crimson animate-spin shrink-0" />
                  <div>
                    <p className="font-medium text-ink-parchment">2. Multi-Pass LLM Extraction</p>
                    <p className="text-[10px] text-ink-ash">Entities, lore artifacts, and quotes</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border-quiet bg-surface-subtle/50 flex items-center gap-2.5 text-ink-ash">
                  <div className="w-4 h-4 rounded-full border border-border-subtle shrink-0" />
                  <div>
                    <p className="font-medium">3. Epistemic Timeline</p>
                    <p className="text-[10px]">Anchor ordering & character knowledge</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border-quiet bg-surface-subtle/50 flex items-center gap-2.5 text-ink-ash">
                  <div className="w-4 h-4 rounded-full border border-border-subtle shrink-0" />
                  <div>
                    <p className="font-medium">4. Canon Verification Pass</p>
                    <p className="text-[10px]">Cross-chapter contradiction audit</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-border-quiet">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-xs text-ink-ash"
              >
                Run in Background
              </Button>

              <div className="flex items-center gap-2">
                <Link
                  href={`/projects/${project.id}/ingestion`}
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border-subtle hover:border-border-prominent text-ink-bone hover:text-ink-parchment transition-colors"
                >
                  <Activity className="w-3.5 h-3.5 text-wine-crimson" />
                  <span>Open Full Ingestion Radar</span>
                </Link>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleEnterWorkspace}
                  className="gap-1.5 text-xs"
                >
                  <span>Enter Atelier</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: FAILED STATE / DIAGNOSTIC ADJUDICATION */}
        {step === "failed" && (
          <div className="space-y-4">
            {/* Error Banner */}
            <div className="rounded-xl border border-wine-crimson/50 bg-wine-crimson/10 p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-wine-crimson/20 border border-wine-crimson/40 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5 text-wine-crimson" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-ink-parchment">
                    {isAuthError
                      ? "Authentication Error (HTTP 401: Unauthorized)"
                      : isRateLimit
                      ? "AI Rate Limit Encountered (HTTP 429)"
                      : "Extraction Pipeline Halted"}
                  </h4>
                  <p className="text-xs text-ink-bone leading-relaxed">
                    {rawErrorMessage.toLowerCase().includes("temporarily_suspended") || rawErrorMessage.toLowerCase().includes("temporarily suspended") ? (
                      <>
                        <strong className="text-wine-crimson font-mono">Upstream Account Suspended:</strong> Your local proxy (AWS / Kiro) reported:{" "}
                        <em>&quot;Your User ID is temporarily suspended by AWS security.&quot;</em> Please check your proxy account or switch to a direct Anthropic or OpenRouter key in Settings.
                      </>
                    ) : isAuthError ? (
                      <>
                        The background AI extraction failed because the API key or endpoint returned HTTP 401 Unauthorized. You can verify and update your sovereign key or Base URL in Settings.
                      </>
                    ) : isRateLimit ? (
                      <>
                        API rate limit reached. Please wait a moment before retrying, or configure your
                        own sovereign API key in Global Settings.
                      </>
                    ) : (
                      rawErrorMessage || "An unexpected error occurred during manuscript extraction."
                    )}
                  </p>
                </div>
              </div>

              {/* Raw Error Accordion */}
              {rawErrorMessage && (
                <div className="pt-2 border-t border-wine-crimson/20">
                  <button
                    type="button"
                    onClick={() => setShowRawTrace(!showRawTrace)}
                    className="flex items-center gap-1.5 text-[11px] font-mono text-ink-ash hover:text-ink-parchment transition-colors"
                  >
                    <span>{showRawTrace ? "Hide Diagnostic Trace" : "Show Diagnostic Trace"}</span>
                    {showRawTrace ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {showRawTrace && (
                    <div className="mt-2 p-3 rounded bg-surface-subtle border border-border-quiet font-mono text-[10px] text-ink-ash max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text">
                      {rawErrorMessage}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Action Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option A: Configure Sovereign Key */}
              <div className="p-4 rounded-xl border border-border-subtle bg-surface-subtle space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-ink-parchment">
                  <Settings2 className="w-4 h-4 text-wine-crimson" />
                  <span>Configure Sovereign API Key</span>
                </div>
                <p className="text-[11px] text-ink-ash leading-relaxed">
                  Provide your Anthropic Claude or OpenRouter API key in Global Settings to authenticate multi-pass extraction.
                </p>
                <Link
                  href="/settings?tab=ai"
                  onClick={onClose}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-md bg-surface-card hover:bg-surface-elevated border border-border-subtle text-ink-parchment transition-colors font-medium"
                >
                  <span>Open Key Settings</span>
                  <ExternalLink className="w-3 h-3 text-ink-ash" />
                </Link>
              </div>

              {/* Option B: Open Full Ingestion Radar */}
              <div className="p-4 rounded-xl border border-border-subtle bg-surface-subtle space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-ink-parchment">
                  <Activity className="w-4 h-4 text-pine-moss" />
                  <span>Story Ingestion Radar</span>
                </div>
                <p className="text-[11px] text-ink-ash leading-relaxed">
                  Inspect the detailed stage stepper, error trace logs, and pipeline telemetry for this draft.
                </p>
                <Link
                  href={`/projects/${project.id}/ingestion`}
                  onClick={onClose}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-md bg-surface-card hover:bg-surface-elevated border border-border-subtle text-ink-parchment transition-colors font-medium"
                >
                  <span>Open Ingestion Radar</span>
                  <ArrowRight className="w-3 h-3 text-ink-ash" />
                </Link>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-border-quiet">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-xs text-ink-ash"
              >
                Dismiss
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setManualStep("select")}
                  className="text-xs"
                >
                  Upload Another File
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleRetry}
                  isLoading={isRetrying}
                  className="gap-1.5 text-xs"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Retry Analysis</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: COMPLETED STATE */}
        {step === "completed" && (
          <div className="space-y-5">
            <Surface depth={2} border="subtle" rounded="md" className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-pine-accent/20 border border-pine-accent/40 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 text-pine-moss" />
              </div>

              <div>
                <h3 className="font-serif text-lg font-medium text-ink-parchment">
                  Manuscript Ingestion Succeeded
                </h3>
                <p className="text-xs text-ink-ash mt-1 max-w-md mx-auto leading-relaxed">
                  {statusData?.error_note && statusData.error_note.includes("Air-Gapped") ? (
                    <span className="text-pine-moss font-medium">
                      Analyzed via Air-Gapped Heuristic Engine. All chapters, characters, and claims are populated.
                    </span>
                  ) : (
                    `All ${statusData?.chapters_total || 4} chapters were parsed and canon-verified. Characters, locations, and timelines are ready.`
                  )}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border-quiet text-center">
                <div className="p-2.5 rounded bg-surface-subtle">
                  <p className="text-xs font-serif font-medium text-ink-parchment">
                    {statusData?.chapters_total || 4}
                  </p>
                  <p className="text-[10px] text-ink-ash uppercase font-mono">Chapters</p>
                </div>
                <div className="p-2.5 rounded bg-surface-subtle">
                  <p className="text-xs font-serif font-medium text-pine-moss">Verified</p>
                  <p className="text-[10px] text-ink-ash uppercase font-mono">Continuity</p>
                </div>
                <div className="p-2.5 rounded bg-surface-subtle">
                  <p className="text-xs font-serif font-medium text-ink-parchment">Ready</p>
                  <p className="text-[10px] text-ink-ash uppercase font-mono">Story Graph</p>
                </div>
              </div>
            </Surface>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs"
              >
                Close
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleEnterWorkspace}
                className="gap-2 text-xs"
              >
                <span>Enter Story Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

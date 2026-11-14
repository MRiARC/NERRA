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
import type { Project } from "@/lib/types";
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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

  // Reset the flow each time the modal opens (adjusting state during render
  // instead of in an effect avoids a second render pass after paint).
  const [previousOpen, setPreviousOpen] = useState(isOpen);
  if (isOpen !== previousOpen) {
    setPreviousOpen(isOpen);
    if (isOpen) {
      setManualStep(initialStep ?? (initialManuscriptId ? "processing" : "select"));
      setActiveManuscriptId(initialManuscriptId ?? null);
      setSelectedFile(null);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setSyncError(null);
    try {
      const res = await api.projects.importManuscript(project.id, selectedFile);
      setActiveManuscriptId(res.manuscript_id);
      setManualStep("processing");
      toast.info(`Draft "${selectedFile.name}" uploaded. Live ingestion started.`);
    } catch (err: unknown) {
      const msg = getErrorMessage(err, "Failed to upload manuscript draft");
      setSyncError(msg);
      setManualStep("failed");
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
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
          ? `Ingesting Folio: "${selectedFile?.name || project.title}"`
          : step === "completed"
          ? "Manuscript Ingestion Complete"
          : `Import Draft to "${project.title}"`
      }
      description={
        step === "failed"
          ? "The background analysis halted. Review the diagnostic report below to configure keys or fall back to air-gapped local extraction."
          : step === "processing"
          ? "NERRA is segmenting chapters, extracting character rosters, indexing temporal anchors, and checking continuity."
          : step === "completed"
          ? "All chapters have been indexed, entities recognized, and graph chronology synchronized."
          : "Upload your novel manuscript (.txt, .md, .docx, .pdf). NERRA will automatically extract characters, locations, temporal anchors, and audit continuity."
      }
    >
      <div className="space-y-5 mt-2">
        {/* STEP 1: FILE SELECT & DRAG DROP */}
        {step === "select" && (
          <>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 ${
                isDragOver
                  ? "border-wine-accent bg-wine-accent/10"
                  : selectedFile
                  ? "border-pine-accent bg-pine-accent/10"
                  : "border-border-subtle hover:border-border-prominent bg-surface-subtle"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.pdf,.docx"
                onChange={handleFileChange}
                className="hidden"
              />

              {selectedFile ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-pine-accent/20 border border-pine-accent/40 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-pine-moss" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-ink-parchment">{selectedFile.name}</p>
                    <p className="text-[11px] text-ink-ash mt-0.5">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Ready for extraction
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-surface-card border border-border-quiet flex items-center justify-center">
                    <UploadCloud className="w-6 h-6 text-wine-crimson" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-ink-parchment">
                      Click to select or drag and drop manuscript
                    </p>
                    <p className="text-[11px] text-ink-ash mt-1">
                      Supports .txt, .md, .docx, and .pdf files up to 50,000+ words
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleUpload}
                isLoading={isUploading}
                disabled={!selectedFile}
                className="gap-2"
              >
                <FileText className="w-4 h-4" />
                <span>Start Extraction Pass</span>
              </Button>
            </div>
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
                  All {statusData?.chapters_total || 4} chapters were parsed and canon-verified. Characters, locations, and timelines are ready.
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

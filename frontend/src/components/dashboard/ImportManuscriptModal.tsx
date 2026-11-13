"use client";

import React, { useState, useRef } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { Project } from "@/lib/types";
import { UploadCloud, FileText, CheckCircle2 } from "lucide-react";

interface ImportManuscriptModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export function ImportManuscriptModal({
  project,
  isOpen,
  onClose,
  onImportComplete,
}: ImportManuscriptModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    try {
      await api.projects.importManuscript(project.id, selectedFile);
      toast.success(
        `Manuscript "${selectedFile.name}" uploaded to ${project.title}. Background extraction started.`
      );
      setSelectedFile(null);
      onClose();
      onImportComplete();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload manuscript draft");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Import Draft to "${project.title}"`}
      description="Upload your novel manuscript (.txt, .md, .docx, .pdf). NERRA will automatically extract characters, locations, temporal anchors, and audit continuity."
    >
      <div className="space-y-4 mt-2">
        {/* Drag and Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-[4px] p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 ${
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

        {/* Action Controls */}
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
          >
            <FileText className="w-4 h-4" />
            <span>Start Extraction Pass</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}

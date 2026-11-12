"use client";

import React, { useState, useRef } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { Project } from "@/lib/types";
import { UploadCloud, FileText, CheckCircle2, AlertCircle } from "lucide-react";

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
      description="Upload your manuscript file (.txt, .md, .pdf). NERRA will automatically detect chapters, extract story entities, and audit consistency."
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
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 ${
            isDragOver
              ? "border-[#C5A059] bg-[#C5A059]/10"
              : selectedFile
              ? "border-[#1B8A5A] bg-[#1B8A5A]/10"
              : "border-white/10 hover:border-white/20 bg-white/[0.02]"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          {selectedFile ? (
            <>
              <div className="w-12 h-12 rounded-full bg-[#1B8A5A]/20 border border-[#1B8A5A]/40 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-[#34D399]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#EDE6D6]">{selectedFile.name}</p>
                <p className="text-xs text-[#7D756C] mt-0.5">
                  {(selectedFile.size / 1024).toFixed(1)} KB • Ready for extraction
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center">
                <UploadCloud className="w-6 h-6 text-[#C5A059]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#EDE6D6]">
                  Click to select or drag and drop manuscript
                </p>
                <p className="text-xs text-[#7D756C] mt-1">
                  Supports .txt, .md, and .pdf files up to 50,000+ words
                </p>
              </div>
            </>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            variant="wine"
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

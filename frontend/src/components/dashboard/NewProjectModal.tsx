"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { BookPlus } from "lucide-react";

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: () => void;
}

export function NewProjectModal({
  isOpen,
  onClose,
  onProjectCreated,
}: NewProjectModalProps) {
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please provide a manuscript title");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await api.projects.create(title.trim(), genre.trim() || undefined);
      toast.success(`Manuscript "${title}" created successfully`);
      setTitle("");
      setGenre("");
      onClose();
      onProjectCreated();
    } catch (err: any) {
      setError(err.message || "Failed to create project");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Manuscript"
      description="Initialize a new story universe. NERRA will track characters, locations, timelines, and claims as you draft."
    >
      <form onSubmit={handleSubmit} className="space-y-4 mt-2">
        <Input
          id="manuscript-title"
          label="Novel / Manuscript Title"
          placeholder="e.g. The Obsidian Archive of Aethelgard"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (error) setError("");
          }}
          error={error}
          autoFocus
        />

        <Input
          id="manuscript-genre"
          label="Genre / Literary Tone (Optional)"
          placeholder="e.g. Gothic Fantasy Thriller, Hard Sci-Fi, Historical Noir"
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
        />

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isLoading}
            className="gap-2"
          >
            <BookPlus className="w-4 h-4" />
            <span>Create Manuscript</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}

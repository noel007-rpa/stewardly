/**
 * Scheduled Transaction Templates Store
 * Manages localStorage persistence of recurring transaction templates.
 */

import type { ScheduledTransactionTemplate } from "../types/scheduled";

const STORAGE_KEY = "stewardly_scheduled_templates";

let listeners: Set<() => void> = new Set();

/**
 * Generate a simple unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get all scheduled templates from localStorage
 */
function getAllTemplates(): ScheduledTransactionTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Save all templates to localStorage and notify listeners
 */
function saveTemplates(templates: ScheduledTransactionTemplate[]): void {
  try {
    const serialized = JSON.stringify(templates);
    localStorage.setItem(STORAGE_KEY, serialized);
    notifyListeners();
  } catch (err) {
    console.error("[scheduledTemplatesStore] Error saving templates:", err);
  }
}

/**
 * Notify all listeners of changes
 */
function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}

/**
 * Validate a scheduled transaction template
 * @returns null if valid, or error message if invalid
 */
function validateTemplate(
  template: Partial<ScheduledTransactionTemplate>
): string | null {
  // name required
  if (!template.name || typeof template.name !== "string" || !template.name.trim()) {
    return "Name is required";
  }

  // amount > 0
  if (typeof template.amount !== "number" || template.amount <= 0) {
    return "Amount must be greater than 0";
  }

  // if rule === "dayOfMonth" ensure 1..31
  if (template.rule === "dayOfMonth") {
    if (typeof template.day !== "number" || template.day < 1 || template.day > 31) {
      return "Day of month must be between 1 and 31";
    }
  }

  // if matchMode includes keyword, require matchKeyword non-empty
  if (
    template.matchMode === "keyword" ||
    template.matchMode === "both"
  ) {
    if (
      !template.matchKeyword ||
      typeof template.matchKeyword !== "string" ||
      !template.matchKeyword.trim()
    ) {
      return "Match keyword is required for keyword matching";
    }
  }

  return null;
}

/**
 * List all scheduled transaction templates
 */
export function listScheduledTemplates(): ScheduledTransactionTemplate[] {
  return getAllTemplates();
}

/**
 * Add a new scheduled transaction template
 */
export function addScheduledTemplate(
  input: Omit<ScheduledTransactionTemplate, "id">
): { ok: true } | { ok: false; reason: string } {
  // Validate input
  const validationError = validateTemplate(input);
  if (validationError) {
    return { ok: false, reason: validationError };
  }

  // Create new template with generated ID
  const template: ScheduledTransactionTemplate = {
    ...input,
    id: generateId(),
  };

  // Add to list and save
  const templates = getAllTemplates();
  templates.push(template);
  saveTemplates(templates);

  return { ok: true };
}

/**
 * Update a scheduled transaction template
 */
export function updateScheduledTemplate(
  id: string,
  patch: Partial<Omit<ScheduledTransactionTemplate, "id">>
): { ok: true } | { ok: false; reason: string } {
  const templates = getAllTemplates();
  const index = templates.findIndex((t) => t.id === id);

  if (index === -1) {
    return { ok: false, reason: "Template not found" };
  }

  const existing = templates[index];
  const updated = { ...existing, ...patch };

  // Validate updated template
  const validationError = validateTemplate(updated);
  if (validationError) {
    return { ok: false, reason: validationError };
  }

  templates[index] = updated;
  saveTemplates(templates);

  return { ok: true };
}

/**
 * Delete a scheduled transaction template
 */
export function deleteScheduledTemplate(
  id: string
): { ok: true } | { ok: false; reason: string } {
  const templates = getAllTemplates();
  const index = templates.findIndex((t) => t.id === id);

  if (index === -1) {
    return { ok: false, reason: "Template not found" };
  }

  templates.splice(index, 1);
  saveTemplates(templates);

  return { ok: true };
}

/**
 * Subscribe to scheduled templates changes
 * @param listener - Callback invoked when templates change
 * @returns Unsubscribe function
 */
export function subscribeScheduledTemplates(
  listener: () => void
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

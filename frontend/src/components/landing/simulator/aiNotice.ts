export type AiAction = "reread" | "audit" | "ask" | "import" | "new_story";

export const SARCASTIC_SHORT_MESSAGES: Record<AiAction, string> = {
  reread: "Unpaid guests don't get AI.",
  audit: "Nice try. Sign up first.",
  ask: "Pay my GPU bill, buddy.",
  import: "No free lunch. Sign in.",
  new_story: "Study locked. Create an account.",
};

export function triggerAiPaywall(action: AiAction = "ask", onTrigger?: () => void) {
  if (typeof window !== "undefined") {
    const msg = SARCASTIC_SHORT_MESSAGES[action] || "Action requires an account.";
    window.dispatchEvent(new CustomEvent("nerra:paywall", { detail: { action, message: msg } }));
  }
  if (onTrigger) onTrigger();
}

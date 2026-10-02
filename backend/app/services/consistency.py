"""The consistency engine — Task 05 (the five detect functions are yours).

This is NERRA's killer feature, and the beautiful part: it's PURE PYTHON.
No LLM here — the extraction (Task 03) already produced structured data;
these functions just cross-reference it deterministically. That makes the
rules fast, free, and perfectly unit-testable.

The rules (mvp_blueprint.md §5.5):

  1. Contradiction      same subject + attribute, different values, e.g.
                        "Sarah eye_color green" (ch.1) vs "blue" (ch.3)
  2. Knowledge violation  a claim says "X knows_about Y" at chapter M, but
                        X only LEARNED Y at chapter N > M
  3. Dangling object    an object mentioned in exactly one chapter —
                        possibly an unresolved plot thread
  4. Continuity note    the same fact stated identically across several
                        chapters — informational: shows the author which
                        facts the story keeps reasserting (never a defect)

Inputs are lists of model rows (see models.py): Claim, KnowledgeUpdate,
StoryObject. Output is a list of IssueDraft records for run_consistency_pass
to persist as Issue rows.
"""

from dataclasses import dataclass, field

# ---------------------------------------------------------------------------
# IssueDraft — the record detectors return; run_consistency_pass persists it.
# ---------------------------------------------------------------------------


@dataclass
class IssueDraft:
    type: str            # contradiction | knowledge_violation | unresolved_thread | continuity_note
    severity: str        # red | yellow | green | blue
    description: str
    evidence: list[dict] = field(default_factory=list)  # [{"chapter": 1, "quote": "..."}]
    claim_a_id: str | None = None
    claim_b_id: str | None = None


# ---------------------------------------------------------------------------
# String helpers — built for you (fuzzy matching plumbing, not logic).
# ---------------------------------------------------------------------------


def _norm(value: str) -> str:
    return (value or "").strip().lower()


def _tokens(value: str) -> set[str]:
    import re

    return set(re.findall(r"[a-z0-9]+", _norm(value)))


def _same_entity(a: str, b: str) -> bool:
    """Loose entity match: 'sarah' == 'sarah', 'the murder' ~= 'murder'."""
    ta, tb = _tokens(a), _tokens(b)
    if not ta or not tb:
        return False
    return ta == tb or bool(ta & tb)


def _facts_match(a: str, b: str) -> bool:
    """Fuzzy fact match: True if the two phrases share enough meaning."""
    ta, tb = _tokens(a), _tokens(b)
    if not ta or not tb:
        return False
    overlap = len(ta & tb) / min(len(ta), len(tb))
    return overlap >= 0.6


# ---------------------------------------------------------------------------
# YOUR FIVE FUNCTIONS (Task 05) — docs/tasks/05-consistency-checker.md
# walks through each one with worked examples.
# ---------------------------------------------------------------------------


def detect_contradictions(claims: list) -> list[IssueDraft]:
    """Find contradicting claim pairs.

    Algorithm:
      1. Group claims by the key (_norm(subject), _norm(attribute)).
      2. Inside a group, collect distinct normalized values (first occurrence
         wins: keep value -> claim with the lowest chapter).
      3. Every pair of distinct values -> one IssueDraft:
         type='contradiction', severity='red',
         description like: 'Sarah has "green" (chapter 1) but also "blue"
         (chapter 3) for eye_color',
         evidence = both claims' {chapter, quote},
         claim_a_id / claim_b_id = str(claim.id) of each side.

    Claims arriving as a group of one can't contradict anything — skip them.
    """
    # ========== YOUR CODE HERE (Task 05) ==========
    raise NotImplementedError(
        "Task 05 — implement detect_contradictions. See docs/tasks/05-consistency-checker.md"
    )


def detect_knowledge_violations(claims: list, knowledge_updates: list) -> list[IssueDraft]:
    """Find characters acting on facts before they learned them.

    Algorithm:
      For every claim whose _norm(attribute) == 'knows_about':
        For every knowledge_update k:
          - _same_entity(claim.subject, k.character) AND
          - _facts_match(claim.value, k.fact) AND
          - k.chapter > claim.chapter        <- learned AFTER referencing!
          -> IssueDraft(type='knowledge_violation', severity='blue',
             description like: 'Park references "the murder" in chapter 2,
             but only learns it in chapter 3',
             evidence = the claim's quote + the knowledge update,
             claim_a_id = str(claim.id)).
    """
    # ========== YOUR CODE HERE (Task 05) ==========
    raise NotImplementedError(
        "Task 05 — implement detect_knowledge_violations. See docs/tasks/05-consistency-checker.md"
    )


def detect_dangling_objects(objects: list) -> list[IssueDraft]:
    """Flag objects mentioned in exactly one chapter (possible loose threads).

    StoryObject.mention_chapters is a list of chapter numbers. An object
    mentioned in exactly 1 distinct chapter -> IssueDraft(type=
    'unresolved_thread', severity='green', description like: 'The brass
    compass appears in chapter 1 and is never mentioned again —
    intentional?'). Objects with zero recorded mentions are skipped (data
    anomaly, not a story signal).
    """
    # ========== YOUR CODE HERE (Task 05) ==========
    raise NotImplementedError(
        "Task 05 — implement detect_dangling_objects. See docs/tasks/05-consistency-checker.md"
    )


def detect_continuity_notes(claims: list) -> list[IssueDraft]:
    """The informational rule: the same fact, stated identically, repeatedly.

    Algorithm:
      1. Group claims by (_norm(subject), _norm(attribute)) — same shape as
         detect_contradictions.
      2. Inside each group, collect per VALUE the DISTINCT chapters where it
         appears (first claim per chapter, lowest first).
      3. Any value present in >= 2 distinct chapters -> ONE IssueDraft:
         type='continuity_note', severity='blue',
         description like: 'Sarah: eye_color "green" is stated consistently
         in chapters 1, 4',
         evidence = one {chapter, quote} per chapter,
         claim_a_id = str(first claim's id).

    Notes:
    - Groups whose values DIFFER across chapters produce no note here —
      detect_contradictions owns those.
    - Repeats within the SAME chapter don't count (distinct chapters only).
    - Continuity notes are informational, never 'red' — they show the author
      which facts are load-bearing (very useful while revising).
    """
    # ========== YOUR CODE HERE (Task 05) ==========
    raise NotImplementedError(
        "Task 05 — implement detect_continuity_notes. See docs/tasks/05-consistency-checker.md"
    )


def run_consistency_pass(db, project_id) -> int:
    """Load this project's story data, run all detectors, persist issues.

    Steps:
      1. claims = db.query(Claim).filter_by(project_id=..., status='active').all()
         knowledge = db.query(KnowledgeUpdate).filter_by(project_id=...).all()
         objects = db.query(StoryObject).filter_by(project_id=...).all()
      2. drafts = contradictions + knowledge violations + dangling objects
             + continuity notes
      3. De-duplicate against Issue rows already in status='open':
         skip a draft if an open issue with the SAME type AND description
         exists (descriptions are deterministic, so this is reliable enough).
      4. Insert the rest as Issue rows, commit, return how many were created.

    Returns:
        Number of NEW issues created (this is what the pipeline logs).
    """
    # ========== YOUR CODE HERE (Task 05) ==========
    raise NotImplementedError(
        "Task 05 — implement run_consistency_pass. See docs/tasks/05-consistency-checker.md"
    )

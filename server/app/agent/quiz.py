"""Post-experiment quiz selection.

The questions and their answers come from the authored quiz bank, never from a
model. That is the point: a generated question can be subtly wrong, and a
student who is told their correct answer is wrong loses trust in the whole
assistant. Selection is adaptive; content is not.
"""

from __future__ import annotations

import random

from ..db import Session as SessionRow
from ..kb import ExperimentKB
from ..schemas import QuizQuestion


def build_quiz(kb: ExperimentKB, row: SessionRow, count: int = 3) -> list[QuizQuestion]:
    """Pick `count` questions, weighted toward where this student struggled.

    A student who tripped the "filter before choosing an image" error should be
    asked about that, not about a step they sailed through.
    """
    bank = list(kb.quiz_bank)
    if not bank:
        return []

    struggled: set[str] = set()
    for err in kb.errors:
        if err.id in set(row.shown_errors or []) and err.correction_step:
            step = kb.step(err.correction_step)
            if step and step.concept_ref:
                struggled.add(step.concept_ref)
    for step_id, level in (row.hint_levels or {}).items():
        if step_id == "__counts__" or not isinstance(level, int) or level < 2:
            continue
        step = kb.step(step_id)
        if step and step.concept_ref:
            struggled.add(step.concept_ref)

    def weight(q: dict) -> tuple[int, int]:
        targeted = 0 if q.get("concept_ref") in struggled else 1
        difficulty = {"beginner": 0, "intermediate": 1, "advanced": 2}.get(
            q.get("difficulty", "beginner"), 0
        )
        return (targeted, difficulty)

    ordered = sorted(bank, key=weight)

    # Take the targeted questions first, then fill from the rest with a stable
    # per-session shuffle so a retake is not identical but a refresh is.
    chosen = ordered[:count]
    if len(chosen) < count:
        rng = random.Random(row.id)
        remainder = [q for q in ordered if q not in chosen]
        rng.shuffle(remainder)
        chosen += remainder[: count - len(chosen)]

    return [
        QuizQuestion(
            id=q["id"],
            question=q["question"],
            options=q["options"],
            answer_index=q["answer_index"],
            explanation=q["explanation"],
            concept_ref=q.get("concept_ref"),
        )
        for q in chosen[:count]
    ]


def grade(quiz: list[dict], answers: dict[str, int]) -> tuple[int, dict[str, bool], dict[str, str]]:
    per_question: dict[str, bool] = {}
    feedback: dict[str, str] = {}
    score = 0
    for q in quiz:
        qid = q["id"]
        given = answers.get(qid)
        correct = given == q["answer_index"]
        per_question[qid] = correct
        if correct:
            score += 1
            feedback[qid] = f"Correct. {q['explanation']}"
        else:
            right = q["options"][q["answer_index"]]
            # Bold, not single-asterisk italics: the widget renders a small
            # Markdown subset and single asterisks would show up literally.
            feedback[qid] = f"Not quite — the answer is **{right}**. {q['explanation']}"
    return score, per_question, feedback

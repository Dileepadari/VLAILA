"""Experiment Knowledge Base loader and index.

The KB is the agent's ground truth. Two rules govern this module:

1. Entries are loaded once and cached. A student session touches the KB on
   every observed interaction, so it has to be an in-memory dict lookup.
2. An experiment is only ever resolved to a single entry. Retrieval and rules
   both operate on one entry at a time, which makes cross-experiment leakage
   structurally impossible rather than something a prompt has to prevent.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from .config import get_settings

log = logging.getLogger(__name__)


@dataclass(slots=True)
class Step:
    id: str
    order: int
    task: str
    title: str
    description: str | None = None
    requires: list[str] = field(default_factory=list)
    optional: bool = False
    milestone: bool = False
    detect: dict[str, Any] | None = None
    expected_dwell_seconds: int | None = None
    stuck_after_seconds: int = 45
    hints: dict[str, Any] = field(default_factory=dict)
    concept: str | None = None
    concept_ref: str | None = None

    def hint_for_level(self, level: int) -> tuple[str, dict[str, Any] | None]:
        """Escalation: 1 asks, 2 tells, 3 shows.

        Level 3 falls back to level 2's text when the author did not supply an
        interactive highlight, so an escalating student never hits a dead end.
        """
        if level <= 1:
            return self.hints.get("nudge", ""), None
        if level == 2:
            return self.hints.get("specific", self.hints.get("nudge", "")), None
        interactive = self.hints.get("interactive")
        if interactive:
            return interactive["text"], interactive
        return self.hints.get("specific", self.hints.get("nudge", "")), None


@dataclass(slots=True)
class ErrorPattern:
    id: str
    severity: str
    when: dict[str, Any]
    message: str
    correction_step: str | None = None
    concept: str | None = None
    confidence: float = 1.0


@dataclass(slots=True)
class TheoryChunk:
    id: str
    heading: str
    text: str
    tags: list[str] = field(default_factory=list)
    source: str | None = None


@dataclass(slots=True)
class ExperimentKB:
    raw: dict[str, Any]
    experiment_id: str
    lab_id: str
    title: str
    origin: str
    discipline: str
    institute: str
    aim: str
    tasks: list[str]
    steps: list[Step]
    errors: list[ErrorPattern]
    theory_chunks: list[TheoryChunk]
    quiz_bank: list[dict[str, Any]]
    concepts: dict[str, dict[str, str]]
    prerequisites: list[dict[str, str]]
    misconceptions: list[dict[str, str]]
    kb_version: str
    estimated_minutes: int = 30
    _by_id: dict[str, Step] = field(default_factory=dict, init=False, repr=False)

    def step(self, step_id: str) -> Step | None:
        return self._by_id.get(step_id)

    def steps_for_task(self, task: str) -> list[Step]:
        return [s for s in self.steps if s.task == task]

    @property
    def required_step_ids(self) -> list[str]:
        return [s.id for s in self.steps if not s.optional]

    def __post_init__(self) -> None:
        self._by_id = {s.id: s for s in self.steps}

    def client_rules(self) -> dict[str, Any]:
        """The subset the browser needs to run Tier 1 with no network.

        Deliberately excludes theory chunks and the quiz bank: those are large,
        and shipping the quiz answers to the client would let a student read
        them out of the network tab.
        """
        return {
            "experiment_id": self.experiment_id,
            "kb_version": self.kb_version,
            "title": self.title,
            "tasks": self.tasks,
            "steps": [
                {
                    "id": s.id,
                    "order": s.order,
                    "task": s.task,
                    "title": s.title,
                    "requires": s.requires,
                    "optional": s.optional,
                    "milestone": s.milestone,
                    "detect": s.detect,
                    "stuck_after_seconds": s.stuck_after_seconds,
                    "hints": s.hints,
                }
                for s in self.steps
            ],
            "errors": [
                {
                    "id": e.id,
                    "severity": e.severity,
                    "when": e.when,
                    "message": e.message,
                    "correction_step": e.correction_step,
                    "confidence": e.confidence,
                }
                for e in self.errors
            ],
        }


def _build(raw: dict[str, Any]) -> ExperimentKB:
    default_tasks = [
        "Aim",
        "Theory",
        "Pretest",
        "Procedure",
        "Simulation",
        "Posttest",
        "References",
        "Feedback",
    ]
    return ExperimentKB(
        raw=raw,
        experiment_id=raw["experiment_id"],
        lab_id=raw["lab_id"],
        title=raw["title"],
        origin=raw["origin"],
        discipline=raw["discipline"],
        institute=raw["institute"],
        aim=raw["aim"],
        tasks=raw.get("tasks", default_tasks),
        kb_version=raw.get("kb_version", "1.0"),
        estimated_minutes=raw.get("estimated_minutes", 30),
        steps=[
            Step(
                id=s["id"],
                order=s["order"],
                task=s["task"],
                title=s["title"],
                description=s.get("description"),
                requires=s.get("requires", []),
                optional=s.get("optional", False),
                milestone=s.get("milestone", False),
                detect=s.get("detect"),
                expected_dwell_seconds=s.get("expected_dwell_seconds"),
                stuck_after_seconds=s.get("stuck_after_seconds", 45),
                hints=s.get("hints", {}),
                concept=s.get("concept"),
                concept_ref=s.get("concept_ref"),
            )
            for s in sorted(raw.get("steps", []), key=lambda s: s["order"])
        ],
        errors=[
            ErrorPattern(
                id=e["id"],
                severity=e["severity"],
                when=e.get("when", {}),
                message=e["message"],
                correction_step=e.get("correction_step"),
                concept=e.get("concept"),
                confidence=e.get("confidence", 1.0),
            )
            for e in raw.get("errors", [])
        ],
        theory_chunks=[
            TheoryChunk(
                id=c["id"],
                heading=c["heading"],
                text=c["text"],
                tags=c.get("tags", []),
                source=c.get("source"),
            )
            for c in raw.get("theory_chunks", [])
        ],
        quiz_bank=raw.get("quiz_bank", []),
        concepts={c["id"]: c for c in raw.get("concepts", [])},
        prerequisites=raw.get("prerequisites", []),
        misconceptions=raw.get("common_misconceptions", []),
    )


class KnowledgeBase:
    """In-memory index over kb/experiments/*.json."""

    def __init__(self, directory: Path | None = None) -> None:
        self.directory = directory or get_settings().kb_dir
        self._by_experiment: dict[str, ExperimentKB] = {}
        self._by_host: dict[str, dict[str, ExperimentKB]] = {}
        self.load()

    def load(self) -> None:
        self._by_experiment.clear()
        self._by_host.clear()
        if not self.directory.exists():
            log.warning("Knowledge base directory %s does not exist", self.directory)
            return
        for path in sorted(self.directory.glob("*.json")):
            try:
                entry = _build(json.loads(path.read_text()))
            except Exception:  # a malformed entry must not take down the API
                log.exception("Failed to load knowledge base entry %s", path)
                continue
            self._by_experiment[entry.experiment_id] = entry
            host = urlparse(entry.origin).netloc
            self._by_host.setdefault(host, {})[entry.experiment_id] = entry
        log.info("Loaded %d knowledge base entries", len(self._by_experiment))

    def resolve(self, experiment_id: str, origin: str | None = None) -> ExperimentKB | None:
        """Find the entry for an experiment.

        Origin is checked first because experiment slugs are only unique within
        a lab: two labs can both ship an `index`-style slug, and the subdomain
        is what disambiguates them.
        """
        if origin:
            host = urlparse(origin).netloc or origin
            scoped = self._by_host.get(host)
            if scoped and experiment_id in scoped:
                return scoped[experiment_id]
        return self._by_experiment.get(experiment_id)

    def all(self) -> list[ExperimentKB]:
        return list(self._by_experiment.values())

    @property
    def count(self) -> int:
        return len(self._by_experiment)


_kb: KnowledgeBase | None = None


def get_kb() -> KnowledgeBase:
    global _kb
    if _kb is None:
        _kb = KnowledgeBase()
    return _kb

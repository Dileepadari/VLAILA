#!/usr/bin/env python3
"""Validate every experiment knowledge base entry.

Two layers of checking:

1. JSON Schema  - structural conformance to kb/schema/experiment.schema.json.
                  Skipped with a warning if `jsonschema` is not installed.
2. Referential  - the checks a schema cannot express: that step ids are unique,
                  that `requires` and `correction_step` point at real steps,
                  that every `concept_ref` resolves, that quiz answers are in
                  range, and that each step's task appears in `tasks`.

Layer 2 is where the real bugs live. A KB entry that passes the schema but
points `correction_step` at a step that was renamed will send a student to a
hint that does not exist, and only this layer catches it.

Usage:
    python3 kb/validate.py            # validate all entries
    python3 kb/validate.py a.json ... # validate specific files
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

KB_DIR = Path(__file__).parent
SCHEMA_PATH = KB_DIR / "schema" / "experiment.schema.json"
EXPERIMENTS_DIR = KB_DIR / "experiments"

GREEN, RED, YELLOW, DIM, RESET = "\033[32m", "\033[31m", "\033[33m", "\033[2m", "\033[0m"


def check_references(kb: dict) -> list[str]:
    """Referential integrity checks that JSON Schema cannot express."""
    errors: list[str] = []

    steps = kb.get("steps", [])
    step_ids = [s["id"] for s in steps]
    step_id_set = set(step_ids)
    concept_ids = {c["id"] for c in kb.get("concepts", [])}
    tasks = set(kb.get("tasks", []))

    # Unique step ids
    if len(step_ids) != len(step_id_set):
        dupes = {i for i in step_ids if step_ids.count(i) > 1}
        errors.append(f"duplicate step ids: {sorted(dupes)}")

    # Unique, gapless-enough ordering
    orders = [s["order"] for s in steps]
    if len(orders) != len(set(orders)):
        errors.append("duplicate step `order` values")
    if orders != sorted(orders):
        errors.append("steps are not listed in ascending `order`")

    for step in steps:
        sid = step["id"]

        for req in step.get("requires", []):
            if req not in step_id_set:
                errors.append(f"step '{sid}': requires unknown step '{req}'")
            elif next(s for s in steps if s["id"] == req)["order"] >= step["order"]:
                errors.append(
                    f"step '{sid}': requires '{req}' which comes later in the order "
                    f"- a prerequisite cannot follow its dependent"
                )

        if tasks and step["task"] not in tasks:
            errors.append(f"step '{sid}': task '{step['task']}' is not in tasks[]")

        ref = step.get("concept_ref")
        if ref and ref not in concept_ids:
            errors.append(f"step '{sid}': concept_ref '{ref}' has no matching concept")

        # A step with no detector can never be marked complete by the observer,
        # which silently breaks every `requires` that points at it.
        if "detect" not in step and not step.get("optional"):
            errors.append(
                f"step '{sid}': non-optional step has no `detect` block, so it can "
                f"never be completed and will block everything that requires it"
            )

    error_ids = [e["id"] for e in kb.get("errors", [])]
    if len(error_ids) != len(set(error_ids)):
        errors.append("duplicate error ids")

    for err in kb.get("errors", []):
        eid = err["id"]
        corr = err.get("correction_step")
        if corr and corr not in step_id_set:
            errors.append(f"error '{eid}': correction_step '{corr}' is not a known step")

        when = err.get("when", {})
        if not when:
            errors.append(f"error '{eid}': empty `when` would match every event")
        for key in ("unless_completed", "after_completed"):
            for ref_id in when.get(key, []):
                if ref_id not in step_id_set:
                    errors.append(f"error '{eid}': {key} references unknown step '{ref_id}'")
        if tasks and when.get("on_task") and when["on_task"] not in tasks:
            errors.append(f"error '{eid}': on_task '{when['on_task']}' is not in tasks[]")

    quiz_ids = [q["id"] for q in kb.get("quiz_bank", [])]
    if len(quiz_ids) != len(set(quiz_ids)):
        errors.append("duplicate quiz ids")

    for q in kb.get("quiz_bank", []):
        if not 0 <= q["answer_index"] < len(q["options"]):
            errors.append(
                f"quiz '{q['id']}': answer_index {q['answer_index']} is out of range "
                f"for {len(q['options'])} options"
            )
        ref = q.get("concept_ref")
        if ref and ref not in concept_ids:
            errors.append(f"quiz '{q['id']}': concept_ref '{ref}' has no matching concept")

    if len(kb.get("quiz_bank", [])) < 3:
        errors.append("quiz_bank needs at least 3 questions to generate a 3-question quiz")

    chunk_ids = [c["id"] for c in kb.get("theory_chunks", [])]
    if len(chunk_ids) != len(set(chunk_ids)):
        errors.append("duplicate theory_chunk ids")

    if kb.get("experiment_id") and kb.get("origin"):
        if not kb["origin"].startswith("http"):
            errors.append("origin must be an absolute URL")

    return errors


def validate_file(path: Path, schema: dict | None) -> tuple[bool, list[str]]:
    try:
        kb = json.loads(path.read_text())
    except json.JSONDecodeError as exc:
        return False, [f"invalid JSON: {exc}"]

    errors: list[str] = []

    if schema is not None:
        import jsonschema

        validator = jsonschema.Draft7Validator(schema)
        for err in sorted(validator.iter_errors(kb), key=lambda e: list(e.path)):
            loc = "/".join(str(p) for p in err.path) or "<root>"
            errors.append(f"schema [{loc}]: {err.message}")

    errors.extend(check_references(kb))
    return not errors, errors


def main() -> int:
    schema = None
    try:
        import jsonschema  # noqa: F401

        schema = json.loads(SCHEMA_PATH.read_text())
    except ImportError:
        print(
            f"{YELLOW}! jsonschema not installed - running referential checks only.{RESET}\n"
            f"{DIM}  pip install jsonschema  for full structural validation.{RESET}\n"
        )

    if len(sys.argv) > 1:
        paths = [Path(a) for a in sys.argv[1:]]
    else:
        paths = sorted(EXPERIMENTS_DIR.glob("*.json"))

    if not paths:
        print(f"{RED}No knowledge base entries found in {EXPERIMENTS_DIR}{RESET}")
        return 1

    failures = 0
    for path in paths:
        ok, errors = validate_file(path, schema)
        if ok:
            kb = json.loads(path.read_text())
            print(
                f"{GREEN}PASS{RESET} {path.name:<28} "
                f"{DIM}{len(kb['steps'])} steps, {len(kb['errors'])} error patterns, "
                f"{len(kb['theory_chunks'])} chunks, {len(kb['quiz_bank'])} quiz{RESET}"
            )
        else:
            failures += 1
            print(f"{RED}FAIL{RESET} {path.name}")
            for err in errors:
                print(f"       {RED}-{RESET} {err}")

    print()
    total = len(paths)
    if failures:
        print(f"{RED}{failures}/{total} entries failed validation.{RESET}")
        return 1
    print(f"{GREEN}All {total} knowledge base entries valid.{RESET}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

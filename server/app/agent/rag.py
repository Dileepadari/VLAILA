"""Experiment-scoped retrieval.

BM25 over one experiment's theory chunks. The scoping is structural: the
candidate set is built from a single knowledge base entry, so a chunk belonging
to another experiment is not merely down-ranked, it is not present. That is a
stronger guarantee than instructing a model not to mix experiments, and it is
what lets us claim answers are never hallucinated from general training data
for lab-specific questions.

BM25 rather than embeddings is a considered choice: no model to host, no index
to keep in sync, sub-millisecond queries, and on a corpus of five to ten
paragraphs per experiment the ranking quality difference is not measurable.
"""

from __future__ import annotations

import math
import re
from collections import Counter
from dataclasses import dataclass

from ..kb import ExperimentKB, TheoryChunk

_TOKEN = re.compile(r"[a-z0-9']+")

# Words that carry no discriminating signal inside a single experiment's corpus.
_STOP = {
    "a", "about", "an", "and", "any", "are", "as", "at", "be", "but", "by",
    "can", "did", "do", "does", "for", "from", "get", "got", "has", "have",
    "how", "i", "if", "in", "into", "is", "it", "its", "many", "me", "much",
    "my", "not", "of", "on", "or", "should", "so", "than", "that", "the",
    "then", "there", "these", "this", "to", "was", "were", "what", "when",
    "where", "which", "who", "why", "will", "with", "would", "you", "your",
}

K1 = 1.5
B = 0.75


def tokenize(text: str) -> list[str]:
    return [t for t in _TOKEN.findall(text.lower()) if t not in _STOP and len(t) > 1]


@dataclass
class Retrieved:
    chunk: TheoryChunk
    score: float


class ExperimentIndex:
    """BM25 index over exactly one experiment."""

    def __init__(self, kb: ExperimentKB) -> None:
        self.kb = kb
        self.docs: list[TheoryChunk] = list(kb.theory_chunks)

        # Concepts and misconceptions are short but high-value answers to
        # "why" questions, so they join the corpus as synthetic chunks rather
        # than being unreachable.
        for concept in kb.concepts.values():
            self.docs.append(
                TheoryChunk(
                    id=f"concept:{concept['id']}",
                    heading=concept["name"],
                    text=concept["summary"],
                    tags=["concept"],
                )
            )
        for i, mis in enumerate(kb.misconceptions):
            self.docs.append(
                TheoryChunk(
                    id=f"misconception:{i}",
                    heading="Common misconception",
                    text=f"Students often think: {mis['belief']} In fact: {mis['correction']}",
                    tags=["misconception"],
                )
            )
        for step in kb.steps:
            if step.concept:
                self.docs.append(
                    TheoryChunk(
                        id=f"step:{step.id}",
                        heading=step.title,
                        text=step.concept,
                        tags=["step"],
                    )
                )

        self._tokens = [tokenize(f"{d.heading} {d.text} {' '.join(d.tags)}") for d in self.docs]
        self._lengths = [len(t) for t in self._tokens]
        self._avg_len = (sum(self._lengths) / len(self._lengths)) if self._lengths else 0.0
        self._freqs = [Counter(t) for t in self._tokens]

        df: Counter[str] = Counter()
        for tokens in self._tokens:
            df.update(set(tokens))
        n = len(self.docs)
        self._idf = {
            term: math.log(1 + (n - count + 0.5) / (count + 0.5)) for term, count in df.items()
        }

    def search(self, query: str, k: int = 4) -> list[Retrieved]:
        terms = tokenize(query)
        if not terms or not self.docs:
            return []
        scored: list[Retrieved] = []
        for i, doc in enumerate(self.docs):
            freqs = self._freqs[i]
            length = self._lengths[i] or 1
            score = 0.0
            for term in terms:
                tf = freqs.get(term, 0)
                if not tf:
                    continue
                idf = self._idf.get(term, 0.0)
                denom = tf + K1 * (1 - B + B * length / (self._avg_len or 1))
                score += idf * (tf * (K1 + 1)) / denom
            if score > 0:
                scored.append(Retrieved(chunk=doc, score=score))
        scored.sort(key=lambda r: r.score, reverse=True)
        return scored[:k]

    def is_on_topic(self, query: str, min_coverage: float = 0.34) -> bool:
        """Cheap relevance gate before spending a model call.

        Scored on term *coverage*, not on BM25 score. A raw score is easy to
        fool: "who won the cricket world cup" outscores "explain protanopia"
        purely because "world" happens to appear in one chunk, and a threshold
        that rejects the first also rejects the second. Coverage asks a
        different question -- how much of what the student said does this
        experiment's vocabulary actually account for -- and separates them
        cleanly at 1 matched term in 4 versus 1 in 2.

        The bar stays deliberately low. A clumsily-worded but genuine question
        should be answered; only something largely foreign gets redirected.
        """
        terms = tokenize(query)
        if not terms:
            return False
        matched = [t for t in terms if t in self._idf]
        if not matched:
            return False
        if len(matched) / len(terms) < min_coverage:
            return False
        hits = self.search(query, k=1)
        return bool(hits) and hits[0].score >= 0.5


_indexes: dict[str, ExperimentIndex] = {}


def get_index(kb: ExperimentKB) -> ExperimentIndex:
    key = f"{kb.experiment_id}@{kb.kb_version}"
    if key not in _indexes:
        _indexes[key] = ExperimentIndex(kb)
    return _indexes[key]

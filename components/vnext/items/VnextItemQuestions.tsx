"use client";

import { useId, useState, type FormEvent } from "react";
import { QUESTION_SEND_ERROR } from "@/lib/vnext/items/item-language";
import { prepareQuestionBody, questionValidationMessage } from "@/lib/vnext/items/question-body";
import type { VnextItemQuestion } from "@/lib/vnext/items/item-types";

type Props = {
  initial: VnextItemQuestion[];
  /** Null keeps the question on this page only (visual fixtures). */
  endpoint: string | null;
};

export function VnextItemQuestions({ initial, endpoint }: Props) {
  const fieldId = useId();
  const [questions, setQuestions] = useState(initial);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prepared = prepareQuestionBody(draft);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prepared.ok) {
      setError(questionValidationMessage(prepared.reason));
      return;
    }
    setPending(true);
    setError(null);
    try {
      if (!endpoint) {
        setQuestions((current) => [
          ...current,
          {
            id: `local-${current.length + 1}`,
            body: prepared.body,
            createdAt: new Date().toISOString(),
            dateLabel: "Just now",
            authorLabel: "You",
          },
        ]);
        setDraft("");
        return;
      }
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: prepared.body }),
      });
      const payload = (await response.json().catch(() => null)) as { question?: VnextItemQuestion } | null;
      if (!response.ok || !payload?.question) {
        setError(QUESTION_SEND_ERROR);
        return;
      }
      setQuestions((current) => [...current, payload.question as VnextItemQuestion]);
      setDraft("");
    } catch {
      setError(QUESTION_SEND_ERROR);
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-label="Questions" data-vnext-questions="true">
      <h2 className="m-0 text-[length:var(--vnext-body)] font-semibold text-[var(--vnext-ink)]">Questions</h2>
      {questions.length === 0 ? (
        <p className="m-0 mt-3 text-[length:var(--vnext-body)] text-[var(--vnext-ink-secondary)]">No questions yet.</p>
      ) : (
        <ol className="m-0 mt-3 list-none divide-y divide-[var(--vnext-line)] p-0">
          {questions.map((question) => (
            <li key={question.id} className="py-3">
              <p className="m-0 whitespace-pre-wrap text-[length:var(--vnext-body)] text-[var(--vnext-ink)]">{question.body}</p>
              <p className="m-0 mt-1 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]">
                Asked by {question.authorLabel}
                {question.dateLabel ? ` · ${question.dateLabel}` : ""}
              </p>
            </li>
          ))}
        </ol>
      )}
      <form onSubmit={onSubmit} className="mt-4 flex flex-col items-start gap-2">
        <label htmlFor={fieldId} className="text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]">
          Ask a question
        </label>
        <textarea
          id={fieldId}
          name="question"
          rows={3}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={pending}
          className="min-h-24 w-full border border-[var(--vnext-line)] bg-[var(--vnext-surface)] p-3 text-base text-[var(--vnext-ink)]"
        />
        {error ? (
          <p role="alert" className="m-0 text-[length:var(--vnext-meta)] text-[var(--vnext-danger)]">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending || !prepared.ok}
          className="inline-flex min-h-[var(--vnext-touch)] items-center bg-[var(--vnext-accent)] px-5 text-[length:var(--vnext-body)] font-medium text-white disabled:opacity-40"
        >
          {pending ? "Sending…" : "Send"}
        </button>
      </form>
    </section>
  );
}

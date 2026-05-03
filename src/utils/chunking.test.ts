import test from "node:test";
import assert from "node:assert/strict";
import { encode } from "gpt-3-encoder";
import { splitIntoChunksByTokens } from "./chunking";

test("splitIntoChunksByTokens keeps chunk sizes within the requested token limit", () => {
  const text = Array.from({ length: 80 }, (_, index) => `Sentence ${index + 1}.`).join(
    " "
  );

  const chunks = splitIntoChunksByTokens(text, {
    maxTokens: 30,
    overlapTokens: 5,
    mode: "sentence",
  });

  assert.ok(chunks.length > 1);
  for (const chunk of chunks) {
    assert.ok(encode(chunk).length <= 30, `Chunk exceeded token limit: ${chunk}`);
  }
});

test("splitIntoChunksByTokens supports paragraph-aware chunking", () => {
  const text = [
    "Paragraph one contains a short introduction.",
    "Paragraph two contains the next idea and should remain grouped.",
    "Paragraph three closes the example.",
  ].join("\n\n");

  const chunks = splitIntoChunksByTokens(text, {
    maxTokens: 20,
    overlapTokens: 0,
    mode: "paragraph",
  });

  assert.ok(chunks.length >= 2);
  assert.ok(chunks.some((chunk) => chunk.includes("Paragraph one")));
  assert.ok(chunks.some((chunk) => chunk.includes("Paragraph three")));
});

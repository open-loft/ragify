import { encode, decode } from "gpt-3-encoder";

type ChunkingMode = "sentence" | "paragraph";

type ChunkingOptions = {
  maxTokens?: number;
  overlapTokens?: number;
  mode?: ChunkingMode;
};

// Token-based chunking
const splitIntoChunksByTokens = (text: string, options: ChunkingOptions = {}) => {
  const maxTokens = options.maxTokens ?? 2000;
  const overlapTokens = Math.max(0, options.overlapTokens ?? 200);
  const mode: ChunkingMode = options.mode ?? "sentence";
  const pieces =
    mode === "paragraph" ? text.split(/\n\s*\n+/) : text.split(/(?<=[.?!])\s+/);

  const chunks: string[] = [];
  let window = "";

  for (const piece of pieces.map((p) => p.trim()).filter(Boolean)) {
    const s = piece;
    const candidate = (window + " " + s).trim();
    const candidateTokens = encode(candidate).length;

    if (candidateTokens > maxTokens) {
      if (!window.trim()) {
        const tokens = encode(s);
        for (let i = 0; i < tokens.length; i += Math.max(1, maxTokens - overlapTokens)) {
          const slice = tokens.slice(i, i + maxTokens);
          const decoded = decode(slice).trim();
          if (decoded) chunks.push(decoded);
        }
        window = "";
        continue;
      }

      chunks.push(window.trim());
      const overlap = overlapTokens > 0 ? encode(window).slice(-overlapTokens) : [];
      window = `${decode(overlap)} ${s}`.trim();
    } else {
      window = candidate;
    }
  }

  if (window.trim()) chunks.push(window.trim());
  return chunks;
};

export { splitIntoChunksByTokens };

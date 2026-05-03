const ROUTES = {
  HEALTH: "/",
  CHAT: {
    BASE: "/api/v1/chat",
    MESSAGE: "/message",
  },
  UPLOAD: {
    BASE: "/api/v1/upload",
    UPLOAD: "/upload",
  },
  LOG: {
    BASE: "/api/v1/logs",
    GET: "/logs",
  },
  OPENAI: {
    CHAT_COMPLETIONS: "https://api.openai.com/v1/chat/completions",
    EMBEDDINGS: "https://api.openai.com/v1/embeddings",
  },
  RAG: {
    BASE: "/api/v1/rag",
    GET: "/rag",
  },
};

export default ROUTES;

// single source of truth for the backend url
// falls back to localhost in development, Render url in production
// trailing slash removed so urls never get a double slash
export const API = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/$/, "");
// Vitest-only stub. Next.js provides this module implicitly in its own
// webpack pipeline (the real "server-only" package is a client/server-side
// import guard); vitest runs outside that pipeline and needs an explicit
// resolvable module to import "server-only" from files under test.
export {};

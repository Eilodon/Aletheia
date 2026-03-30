console.error(
  [
    "[db:push] Disabled in this repo.",
    "Aletheia currently runs with local/native persistence and an in-memory server user store.",
    "There is no Drizzle schema or migration flow wired into the active release path.",
    "See server/db.ts for the current runtime behavior.",
  ].join("\n"),
);
process.exit(1);

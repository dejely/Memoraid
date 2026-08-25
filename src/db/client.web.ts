/**
 * The web build uses Supabase as its online source of truth, so there is no
 * browser-side SQLite database to initialize.
 */
export async function initializeDatabase(): Promise<void> {}


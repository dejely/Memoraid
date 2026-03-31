import { Pool } from "pg";

import { appConfig } from "../config.js";

export const pool = new Pool({
  connectionString: appConfig.databaseUrl,
});

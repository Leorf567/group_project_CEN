import { config } from "dotenv";

// same order Next uses: .env.local wins over .env
config({ path: ".env.local" });
config({ path: ".env" });

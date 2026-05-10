import "dotenv/config";
import { createApp } from "./app";
import { connectDatabase } from "./config/db";

async function start() {
  const port = Number(process.env.PORT ?? 4000);
  const mongoUri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/monthly-expenses";

  await connectDatabase(mongoUri);

  const app = createApp();
  app.listen(port, () => {
    console.log(`Backend running on http://localhost:${port}`);
  });
}

void start().catch((error) => {
  console.error("Failed to start backend", error);
  process.exit(1);
});

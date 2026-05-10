import mongoose from "mongoose";

async function main() {
  // Set DNS servers inside async function (avoids top-level await issues).
  try {
    const dns = await import("dns");
    const env = process.env.MONGOOSE_DNS_SERVERS;
    if (env && env.trim()) {
      const servers = env.split(",").map((s) => s.trim()).filter(Boolean);
      if (servers.length) dns.setServers(servers as any);
    } else {
      dns.setServers(["8.8.8.8", "8.8.4.4"] as any);
    }
  } catch (e) {
    // ignore if dns isn't available
  }
  const uri = process.env.MONGODB_URI || process.argv[2];
  if (!uri) {
    console.error("Usage: set MONGODB_URI or pass the URI as the first arg");
    process.exit(2);
  }

  const opts = {
    serverSelectionTimeoutMS: Number(process.env.MONGOOSE_SERVER_SELECTION_TIMEOUT_MS ?? 60000),
    connectTimeoutMS: Number(process.env.MONGOOSE_CONNECT_TIMEOUT_MS ?? 60000),
  } as const;

  mongoose.connection.on("connecting", () => console.log("mongoose: connecting..."));
  mongoose.connection.on("connected", () => console.log("mongoose: connected"));
  mongoose.connection.on("open", () => console.log("mongoose: open"));
  mongoose.connection.on("error", (err) => console.error("mongoose: error", err && err.message));
  mongoose.connection.on("disconnected", () => console.log("mongoose: disconnected"));

  try {
    console.log(`Attempting mongoose.connect(uri, serverSelectionTimeoutMS=${opts.serverSelectionTimeoutMS})`);
    await mongoose.connect(uri, opts as any);
    console.log("Connection succeeded");
  } catch (err) {
    console.error("Connection failed:", err);
    process.exitCode = 1;
  } finally {
    try {
      await mongoose.disconnect();
      console.log("Disconnected");
    } catch (e) {
      // ignore
    }
  }
}

main();

export async function connectDatabase(uri: string) {
  const mongoose = await import("mongoose");
  // Ensure Node uses a working DNS server for SRV lookups. If the host's
  // DNS resolver is blocking queries from Node, setting DNS servers here
  // avoids `querySrv ECONNREFUSED` errors. You can override via
  // MONGOOSE_DNS_SERVERS (comma-separated list).
  try {
    const dns = await import("dns");
    const env = process.env.MONGOOSE_DNS_SERVERS;
    if (env && env.trim()) {
      const servers = env.split(",").map((s) => s.trim()).filter(Boolean);
      if (servers.length) {
        dns.setServers(servers as any);
        console.log("Using DNS servers from MONGOOSE_DNS_SERVERS:", servers);
      }
    } else {
      // Default to Google DNS which reliably answers SRV queries.
      dns.setServers(["8.8.8.8", "8.8.4.4"] as any);
      console.log("Using default DNS servers: 8.8.8.8,8.8.4.4 for SRV lookups");
    }
  } catch (err) {
    // If dns cannot be imported or set, continue and rely on system resolver.
    console.warn("Could not set DNS servers for SRV lookups:", err instanceof Error ? err.message : err);
  }

  mongoose.default.set("strictQuery", true);

  // Helpful options for diagnosing slow connections or DNS/SRV issues.
  const connectOptions = {
    // Increase server selection timeout so Atlas has more time to respond
    serverSelectionTimeoutMS: Number(process.env.MONGOOSE_SERVER_SELECTION_TIMEOUT_MS ?? 30000),
    // Increase connect timeout
    connectTimeoutMS: Number(process.env.MONGOOSE_CONNECT_TIMEOUT_MS ?? 30000),
    // Use unified topology (default in modern mongoose)
    // other options can go here if needed
  } as const;

  try {
    console.log(`Attempting MongoDB connect to ${uri} (serverSelectionTimeoutMS=${connectOptions.serverSelectionTimeoutMS})`);
    await mongoose.default.connect(uri, connectOptions as any);
    console.log("MongoDB connected");
    return { mode: "mongodb" as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to connect to MongoDB";
    console.error("MongoDB connection error:", message);
    throw new Error(
      `Failed to connect to MongoDB at ${uri}. Start a local MongoDB server, connect Compass to the same URI, or set MONGODB_URI to a MongoDB Atlas connection string. Original error: ${message}`
    );
  }
}

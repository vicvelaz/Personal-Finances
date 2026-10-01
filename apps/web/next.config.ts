import { existsSync } from "node:fs";
import type { NextConfig } from "next";

// Single env file at the monorepo root; Next only auto-loads apps/web/.env*.
if (existsSync("../../.env")) process.loadEnvFile("../../.env");

const nextConfig: NextConfig = {
  transpilePackages: ["@fin/shared"],
};

export default nextConfig;

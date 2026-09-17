import type { NextConfig } from "next";

function normalizeBasePath(value: string | undefined): string {
  const basePath = value?.trim() ?? "";
  if (!basePath) return "";
  if (!basePath.startsWith("/") || basePath.endsWith("/")) {
    throw new Error(
      "FOOD_BASE_PATH must start with '/' and must not end with '/'.",
    );
  }
  return basePath;
}

const basePath = normalizeBasePath(process.env.FOOD_BASE_PATH);

const nextConfig: NextConfig = {
  basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  reactStrictMode: true,
};

export default nextConfig;

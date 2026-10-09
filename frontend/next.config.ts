import type { NextConfig } from "next";

// cacheComponents is off on purpose (D-32): every screen is rendered in the browser from
// data the client fetches itself, so server-side caching has nothing to cache.
const nextConfig: NextConfig = {};

export default nextConfig;

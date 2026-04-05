import { createClient } from "next-sanity";

import { apiVersion, dataset, projectId } from "../env";

const useCdnEnv = process.env.NEXT_PUBLIC_SANITY_USE_CDN;
const useCdn =
  useCdnEnv !== undefined ? useCdnEnv !== "false" : process.env.NODE_ENV === "production";

const timeoutEnv =
  process.env.SANITY_REQUEST_TIMEOUT_MS ||
  process.env.NEXT_PUBLIC_SANITY_REQUEST_TIMEOUT_MS;
const requestTimeout = Number(timeoutEnv) || 5000;

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn,
  requestTimeout,
  stega: {
    studioUrl: process.env.NEXT_PUBLIC_SANITY_STUDIO_URL,
  },
});

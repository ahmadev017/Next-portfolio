import { createClient } from "next-sanity";

import { apiVersion, dataset, projectId } from "../env";

const useCdnEnv = process.env.NEXT_PUBLIC_SANITY_USE_CDN;
const useCdn =
  useCdnEnv !== undefined ? useCdnEnv !== "false" : process.env.NODE_ENV === "production";

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn,
  stega: {
    studioUrl: process.env.NEXT_PUBLIC_SANITY_STUDIO_URL,
  },
});

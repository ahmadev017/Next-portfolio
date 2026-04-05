// Querying with "sanityFetch" will keep content automatically updated
// Before using it, import and render "<SanityLive />" in your layout, see
// https://github.com/sanity-io/next-sanity#live-content-api for more information.
import { defineLive } from "next-sanity/live";
import { client } from "./client";

const live = defineLive({
  client,
  // Silence warnings when tokens are intentionally not provided
  serverToken: process.env.SANITY_API_TOKEN || false,
  browserToken: process.env.NEXT_PUBLIC_SANITY_API_TOKEN || false,
});

export const SanityLive = live.SanityLive;

export const sanityFetch: typeof live.sanityFetch = async (...args) => {
  const disableFetch =
    process.env.NEXT_PUBLIC_SANITY_DISABLE_FETCH === "true" ||
    process.env.SANITY_DISABLE_FETCH === "true";

  if (disableFetch) {
    return {
      data: null,
      sourceMap: null,
      tags: [],
    } as Awaited<ReturnType<typeof live.sanityFetch>>;
  }

  try {
    return await live.sanityFetch(...args);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[sanityFetch] Request failed. Returning empty data to keep the page rendering.",
        error,
      );
    }
    return {
      data: null,
      sourceMap: null,
      tags: [],
    } as Awaited<ReturnType<typeof live.sanityFetch>>;
  }
};

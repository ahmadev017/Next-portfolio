import { ImageResponse } from "next/og";
import { serverClient } from "@/sanity/lib/serverClient";
import { urlFor } from "@/sanity/lib/image";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  const query = `*[_type=="siteSettings" && _id=="singleton-siteSettings"][0]{favicon}`;
  const settings =
    (await serverClient.fetch(query)) ?? ({} as Record<string, any>);

  const faviconUrl = settings.favicon
    ? urlFor(settings.favicon).width(32).height(32).url()
    : null;

  if (faviconUrl) {
    const res = await fetch(faviconUrl);
    const arrayBuffer = await res.arrayBuffer();
    return new ImageResponse(
      (
        <img
          src={faviconUrl}
          width={32}
          height={32}
          alt="Favicon"
          style={{ borderRadius: "20%" }}
        />
      ),
      { ...size },
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          background: "#18181b",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          borderRadius: "20%",
          border: "1px solid #3b82f6",
        }}
      >
        AR
      </div>
    ),
    { ...size },
  );
}

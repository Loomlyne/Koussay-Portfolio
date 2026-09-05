import { ogImageResponse, OG_SIZE, OG_TYPE } from "@/lib/og-image";
import { SITE_MARK_ALT } from "@/lib/site";

export const runtime = "nodejs";
export const revalidate = 3600;
export const alt = SITE_MARK_ALT;
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export default function Image() {
  return ogImageResponse();
}

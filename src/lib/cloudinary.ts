export const ALLOWED_IMAGE_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export type CloudinaryUrlOptions = {
  width?: number;
  height?: number;
  quality?: "auto" | string | number;
  format?: "auto" | string;
};

const CLOUDINARY_HOST = /res\.cloudinary\.com/i;

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_MIME.includes(file.type as (typeof ALLOWED_IMAGE_MIME)[number])) {
    return "Chỉ chấp nhận ảnh JPEG, PNG, WebP hoặc GIF";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "Ảnh không được vượt quá 10MB";
  }
  if (file.size <= 0) {
    return "File ảnh không hợp lệ";
  }
  return null;
}

/** True when URL looks like a Cloudinary delivery URL. */
export function isCloudinaryUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return CLOUDINARY_HOST.test(u.hostname) && u.pathname.includes("/upload/");
  } catch {
    return false;
  }
}

/**
 * Extract public_id from a Cloudinary delivery URL (without extension).
 * Returns null for non-Cloudinary / unparseable URLs.
 */
export function extractCloudinaryPublicId(url: string): string | null {
  if (!isCloudinaryUrl(url)) return null;
  try {
    const { pathname } = new URL(url);
    const marker = "/upload/";
    const idx = pathname.indexOf(marker);
    if (idx < 0) return null;
    let rest = pathname.slice(idx + marker.length);
    // Drop version segment v1234567890/
    rest = rest.replace(/^v\d+\//, "");
    // Drop transformation segments (contain , or start with known transforms)
    while (rest && /^(?:[^/]+[,_:][^/]+)\//.test(rest)) {
      rest = rest.replace(/^[^/]+\//, "");
    }
    // Remove file extension
    const withoutExt = rest.replace(/\.[a-z0-9]+$/i, "");
    return withoutExt ? decodeURIComponent(withoutExt) : null;
  } catch {
    return null;
  }
}

/**
 * Build a display URL with f_auto,q_auto (+ optional size).
 * Local / external URLs are returned unchanged (backward compatible).
 */
export function getCloudinaryImageUrl(
  urlOrPublicId: string,
  options: CloudinaryUrlOptions = {},
): string {
  const raw = urlOrPublicId.trim();
  if (!raw) return raw;

  const quality = options.quality ?? "auto";
  const format = options.format ?? "auto";
  const transforms = [
    `f_${format}`,
    `q_${quality}`,
    options.width != null ? `w_${options.width}` : null,
    options.height != null ? `h_${options.height}` : null,
    options.width != null || options.height != null ? "c_limit" : null,
  ]
    .filter(Boolean)
    .join(",");

  if (isCloudinaryUrl(raw)) {
    try {
      const u = new URL(raw);
      const marker = "/upload/";
      const idx = u.pathname.indexOf(marker);
      if (idx < 0) return raw;
      const before = u.pathname.slice(0, idx + marker.length);
      let after = u.pathname.slice(idx + marker.length);
      // Strip existing transform chain before version or public_id
      if (/^[^/]+[,_:][^/]+\//.test(after) || /^(?:f_|q_|w_|h_|c_)/.test(after)) {
        after = after.replace(/^[^/]+\//, "");
      }
      u.pathname = `${before}${transforms}/${after}`;
      return u.toString();
    } catch {
      return raw;
    }
  }

  // Bare public_id without full URL — cannot build without cloud name; return as-is
  if (!raw.startsWith("http") && !raw.startsWith("/")) {
    return raw;
  }

  return raw;
}

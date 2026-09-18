/**
 * Brand & contact config for the public ride site.
 * Leave contact fields empty until real info is confirmed — UI hides empty CTAs.
 */
export const rideBrand = {
  name: "SiTha Trip",
  shortName: "SiTha Trip",
  /** One-line subtitle under the logo / header */
  subtitle: "Xe có tài xế An Giang",
  tagline:
    "Đặt xe riêng có tài xế tại An Giang — đón tận nơi, uy tín, đúng giờ",
  /** Display labels for hotlines */
  hotlines: ["035 5511034"] as string[],
  zaloUrl: "",
  facebookUrl: "",
};

/** Primary hotline display (first number), for single-slot UI. */
export const rideBrandHotline = rideBrand.hotlines[0] ?? "";

export function hasHotline(): boolean {
  return rideBrand.hotlines.some((n) => n.trim().length > 0);
}

export function hasZalo(): boolean {
  return rideBrand.zaloUrl.trim().length > 0;
}

export function hasFacebook(): boolean {
  return rideBrand.facebookUrl.trim().length > 0;
}

export function phoneTelHref(display: string): string | null {
  const digits = display.replace(/\D/g, "");
  return digits ? `tel:${digits}` : null;
}

/** Primary tel: link — first configured hotline. */
export function hotlineTelHref(): string | null {
  const first = rideBrand.hotlines.find((n) => n.trim().length > 0);
  return first ? phoneTelHref(first) : null;
}

export function getHotlines(): { display: string; href: string }[] {
  const result: { display: string; href: string }[] = [];
  for (const display of rideBrand.hotlines) {
    const href = phoneTelHref(display);
    if (href) result.push({ display, href });
  }
  return result;
}

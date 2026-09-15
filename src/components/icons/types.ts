import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

export const ICON_SIZE = 16;

export type IconProps = SVGProps<SVGSVGElement> & {
  /** Pixel size; default 16 to match design guideline. */
  size?: number;
};

export function iconProps({
  size = ICON_SIZE,
  className,
  ...rest
}: IconProps): SVGProps<SVGSVGElement> {
  return {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true,
    focusable: false,
    className: cn("shrink-0", className),
    ...rest,
  };
}

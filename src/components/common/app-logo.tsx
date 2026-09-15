import { APP_LOGO_SRC, APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

type AppLogoSize = "sm" | "md" | "lg" | "xl";

const SIZE_CLASS: Record<AppLogoSize, string> = {
  sm: "size-8",
  md: "size-10",
  lg: "size-12",
  xl: "size-16",
};

export function AppLogo({
  size = "md",
  className,
  alt = APP_NAME,
}: {
  size?: AppLogoSize;
  className?: string;
  alt?: string;
}) {
  return (
    <img
      src={APP_LOGO_SRC}
      alt={alt}
      className={cn(
        "shrink-0 rounded-xl object-cover shadow-sm ring-1 ring-black/10",
        SIZE_CLASS[size],
        className,
      )}
      decoding="async"
    />
  );
}

import {
  Briefcase,
  Cross,
  Landmark,
  MapPinned,
  Plane,
  Trees,
} from "lucide-react";
import type { RideServiceDef } from "@/features/ride/data/mock-services";

const ICON_MAP = {
  travel: Trees,
  medical: Cross,
  pilgrimage: Landmark,
  airport: Plane,
  business: Briefcase,
  custom: MapPinned,
} as const;

export function ServiceIcon({
  icon,
  className,
}: {
  icon: RideServiceDef["icon"];
  className?: string;
}) {
  const Icon = ICON_MAP[icon];
  return <Icon className={className} aria-hidden />;
}

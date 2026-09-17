import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type BreadcrumbItem = {
  name: string;
  path?: string;
};

export function RideBreadcrumbs({
  items,
  className,
}: {
  items: BreadcrumbItem[];
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={cn("text-sm", className)}>
      <ol className="flex flex-wrap items-center gap-1 text-muted-foreground">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.name}-${i}`} className="inline-flex items-center gap-1">
              {i > 0 ? (
                <ChevronRight className="size-3.5 shrink-0 opacity-60" aria-hidden />
              ) : null}
              {last || !item.path ? (
                <span
                  className={cn(last && "font-medium text-foreground")}
                  aria-current={last ? "page" : undefined}
                >
                  {item.name}
                </span>
              ) : (
                <Link
                  to={item.path}
                  className="hover:text-foreground underline-offset-2 hover:underline"
                >
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

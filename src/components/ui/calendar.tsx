import * as React from "react";
import { DayPicker } from "react-day-picker";
import { vi } from "react-day-picker/locale";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const isDropdown =
    props.captionLayout === "dropdown" ||
    props.captionLayout === "dropdown-months" ||
    props.captionLayout === "dropdown-years";

  return (
    <DayPicker
      locale={vi}
      weekStartsOn={1}
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        root: "w-fit",
        months: "relative flex flex-col",
        month: "space-y-3",
        month_caption: cn(
          "relative flex h-9 items-center justify-center",
          isDropdown ? "px-1" : "px-8",
        ),
        // Visible label for dropdown mode (select itself is invisible overlay).
        // Hidden for label mode — nav caption uses a separate label in caption.
        caption_label: cn(
          "text-sm font-medium capitalize",
          isDropdown && "flex items-center gap-1",
        ),
        nav: "absolute inset-x-0 top-0 flex items-center justify-between px-1",
        button_previous: cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "size-8 bg-transparent p-0 opacity-70 hover:opacity-100",
        ),
        button_next: cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "size-8 bg-transparent p-0 opacity-70 hover:opacity-100",
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "w-9 text-[0.7rem] font-medium text-muted-foreground capitalize",
        week: "mt-1 flex w-full",
        day: "relative p-0 text-center text-sm",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "size-9 p-0 font-normal aria-selected:opacity-100",
        ),
        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground",
        today: "[&>button]:bg-accent [&>button]:text-accent-foreground",
        outside: "text-muted-foreground opacity-45",
        disabled: "text-muted-foreground opacity-40",
        hidden: "invisible",
        dropdowns: "flex items-center justify-center gap-2",
        dropdown_root: "relative inline-flex items-center",
        // Native <select> overlays the visible caption label — do not show both.
        dropdown:
          "absolute inset-0 z-10 cursor-pointer opacity-0 disabled:cursor-not-allowed",
        months_dropdown: "",
        years_dropdown: "",
        chevron: "size-3.5 opacity-60",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClassName, ...chevronProps }) => {
          const Icon =
            orientation === "left"
              ? ChevronLeft
              : orientation === "right"
                ? ChevronRight
                : ChevronDown;
          return (
            <Icon
              className={cn("size-4", chevronClassName)}
              {...chevronProps}
            />
          );
        },
      }}
      {...props}
    />
  );
}

export { Calendar };

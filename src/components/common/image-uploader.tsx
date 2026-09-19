import { useId, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getCloudinaryImageUrl, validateImageFile } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";
import {
  deleteUploadedImage,
  requestUploadSignature,
  uploadFileToCloudinary,
} from "@/lib/upload-api";

const UPLOAD_CONCURRENCY = 3;

type ImageUploaderProps = {
  value?: string | string[];
  onChange: (value: string | string[]) => void;
  folder?: string;
  multiple?: boolean;
  publicIds?: string | string[];
  onPublicIdsChange?: (value: string | string[]) => void;
  className?: string;
  disabled?: boolean;
};

function toArray(value: string | string[] | undefined): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

function emitValue(
  urls: string[],
  multiple: boolean,
  onChange: (value: string | string[]) => void,
) {
  onChange(multiple ? urls : (urls[0] ?? ""));
}

function emitPublicIds(
  ids: string[],
  multiple: boolean,
  onPublicIdsChange?: (value: string | string[]) => void,
) {
  onPublicIdsChange?.(multiple ? ids : (ids[0] ?? ""));
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function run(): Promise<void> {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index]!, index);
    }
  }

  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    () => run(),
  );
  await Promise.all(runners);
  return results;
}

export function ImageUploader({
  value,
  onChange,
  folder = "sitha-trip",
  multiple = false,
  publicIds,
  onPublicIdsChange,
  className,
  disabled = false,
}: ImageUploaderProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [removingKey, setRemovingKey] = useState<string | null>(null);

  const urls = toArray(value);
  const ids = toArray(publicIds);

  async function handleFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const selected = multiple ? files : files.slice(0, 1);
    setError(null);

    for (const file of selected) {
      const validationError = validateImageFile(file);
      if (validationError) {
        setError(validationError);
        toast.error(validationError);
        return;
      }
    }

    setUploading(true);
    try {
      const signed = await requestUploadSignature(folder);
      const uploaded = await mapWithConcurrency(
        selected,
        UPLOAD_CONCURRENCY,
        async (file) => {
          const key = `${file.name}-${file.size}-${file.lastModified}`;
          setProgressMap((prev) => ({ ...prev, [key]: 0 }));
          const result = await uploadFileToCloudinary(file, signed, (pct) => {
            setProgressMap((prev) => ({ ...prev, [key]: pct }));
          });
          setProgressMap((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
          return result;
        },
      );

      const newUrls = uploaded.map((u) => u.secureUrl);
      const newIds = uploaded.map((u) => u.publicId);

      if (multiple) {
        const nextUrls = [...urls, ...newUrls];
        const nextIds = [...ids, ...newIds];
        emitValue(nextUrls, true, onChange);
        emitPublicIds(nextIds, true, onPublicIdsChange);
      } else {
        // Replace previous; best-effort delete old Cloudinary asset
        const prevId = ids[0];
        if (prevId) {
          void deleteUploadedImage(prevId).catch(() => undefined);
        }
        emitValue(newUrls, false, onChange);
        emitPublicIds(newIds, false, onPublicIdsChange);
      }
      toast.success(multiple ? "Đã tải ảnh lên" : "Đã cập nhật ảnh");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Upload image failed";
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
      setProgressMap({});
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove(index: number) {
    const publicId = ids[index];
    const key = `${index}-${urls[index] ?? ""}`;
    setRemovingKey(key);
    setError(null);
    try {
      if (publicId) {
        await deleteUploadedImage(publicId);
      }
      const nextUrls = urls.filter((_, i) => i !== index);
      const nextIds = ids.filter((_, i) => i !== index);
      emitValue(nextUrls, multiple, onChange);
      emitPublicIds(nextIds, multiple, onPublicIdsChange);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Xóa ảnh thất bại";
      setError(message);
      toast.error(message);
    } finally {
      setRemovingKey(null);
    }
  }

  const progressValues = Object.values(progressMap);
  const overallProgress =
    progressValues.length > 0
      ? Math.round(
          progressValues.reduce((a, b) => a + b, 0) / progressValues.length,
        )
      : uploading
        ? 0
        : null;

  const busy = disabled || uploading || removingKey != null;

  return (
    <div className={cn("space-y-3", className)}>
      <div
        role="button"
        tabIndex={busy ? -1 : 0}
        aria-disabled={busy}
        onKeyDown={(e) => {
          if (busy) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onClick={() => {
          if (!busy) inputRef.current?.click();
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!busy) setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragging(false);
          if (busy) return;
          void handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-8 text-center transition-colors",
          dragging && "border-primary bg-primary/5",
          busy && "pointer-events-none opacity-60",
        )}
      >
        {uploading ? (
          <>
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Đang tải lên
              {overallProgress != null ? `… ${overallProgress}%` : "…"}
            </p>
            {overallProgress != null ? (
              <div className="mt-1 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            ) : null}
          </>
        ) : (
          <>
            <ImagePlus className="size-6 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              Kéo thả ảnh vào đây hoặc bấm để chọn
            </p>
            <p className="text-xs text-muted-foreground">
              JPEG, PNG, WebP, GIF — tối đa 10MB
              {multiple ? " · nhiều ảnh" : ""}
            </p>
          </>
        )}
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple={multiple}
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            const list = e.target.files;
            if (list) void handleFiles(list);
          }}
        />
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {urls.length > 0 ? (
        <ul
          className={cn(
            "grid gap-3",
            multiple ? "sm:grid-cols-2" : "grid-cols-1",
          )}
        >
          {urls.map((url, index) => {
            const key = `${index}-${url}`;
            const removing = removingKey === key;
            return (
              <li
                key={key}
                className="relative overflow-hidden rounded-xl border border-border bg-muted"
              >
                <img
                  src={getCloudinaryImageUrl(url, { width: 800 })}
                  alt={`Ảnh ${index + 1}`}
                  className="aspect-video w-full object-cover"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute top-2 right-2 size-8 shadow-sm"
                  disabled={busy}
                  aria-label="Xóa ảnh"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleRemove(index);
                  }}
                >
                  {removing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <X className="size-4" />
                  )}
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

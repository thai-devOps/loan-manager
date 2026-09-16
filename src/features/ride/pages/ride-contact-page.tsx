import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getHotlines,
  hasFacebook,
  hasZalo,
  rideBrand,
} from "@/features/ride/config/ride-brand";
import { useRidePageMeta } from "@/features/ride/lib/use-ride-page-meta";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Vui lòng nhập họ tên"),
  phone: z
    .string()
    .trim()
    .min(9, "Số điện thoại không hợp lệ")
    .regex(/^[0-9+\s()-]+$/, "Số điện thoại không hợp lệ"),
  message: z.string().trim().min(1, "Vui lòng nhập nội dung"),
});

type ContactFormValues = z.infer<typeof contactSchema>;

export function RideContactPage() {
  useRidePageMeta(
    "Liên hệ",
    "Liên hệ tư vấn đặt chuyến xe riêng có tài xế.",
  );

  const [sent, setSent] = useState(false);
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", phone: "", message: "" },
  });

  const hotlines = getHotlines();

  function onSubmit(_values: ContactFormValues) {
    // MVP: no backend contact API — acknowledge locally.
    setSent(true);
    form.reset();
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Liên hệ</h1>
      <p className="mt-2 text-muted-foreground">
        Để lại thông tin — chúng tôi sẽ liên hệ tư vấn đặt chuyến (xe riêng có
        tài xế).
      </p>

      <ul className="mt-6 space-y-2 text-sm">
        {hotlines.length > 0 ? (
          hotlines.map((phone) => (
            <li key={phone.href}>
              Hotline:{" "}
              <a className="font-medium underline" href={phone.href}>
                {phone.display}
              </a>
            </li>
          ))
        ) : (
          <li className="text-muted-foreground">Hotline: đang cập nhật</li>
        )}
        {hasZalo() ? (
          <li>
            Zalo:{" "}
            <a
              className="font-medium underline"
              href={rideBrand.zaloUrl}
              target="_blank"
              rel="noreferrer"
            >
              Chat Zalo
            </a>
          </li>
        ) : null}
        {hasFacebook() ? (
          <li>
            Facebook:{" "}
            <a
              className="font-medium underline"
              href={rideBrand.facebookUrl}
              target="_blank"
              rel="noreferrer"
            >
              Fanpage
            </a>
          </li>
        ) : null}
      </ul>

      {sent ? (
        <p className="mt-8 rounded-xl border border-border bg-muted/40 p-4 text-sm">
          Đã ghi nhận tin nhắn trên thiết bị của bạn. Khi kết nối hệ thống liên
          hệ, yêu cầu sẽ được chuyển tới nhân viên. Bạn cũng có thể{" "}
          <Link className="underline" to="/ride/booking">
            đặt chuyến trực tiếp
          </Link>
          .
        </p>
      ) : null}

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="mt-8 space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-6"
      >
        <div className="space-y-2">
          <Label htmlFor="name">Họ và tên</Label>
          <Input id="name" {...form.register("name")} />
          {form.formState.errors.name ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.name.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Số điện thoại</Label>
          <Input id="phone" type="tel" {...form.register("phone")} />
          {form.formState.errors.phone ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.phone.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="message">Nội dung</Label>
          <Textarea id="message" rows={4} {...form.register("message")} />
          {form.formState.errors.message ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.message.message}
            </p>
          ) : null}
        </div>
        <Button type="submit" className="w-full bg-teal-800 hover:bg-teal-700">
          Gửi liên hệ
        </Button>
      </form>
    </div>
  );
}

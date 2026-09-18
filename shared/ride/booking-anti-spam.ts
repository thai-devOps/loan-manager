export type AntiSpamCode =
  | "SPAM_DETECTED"
  | "RATE_LIMITED"
  | "PHONE_RATE_LIMITED"
  | "CLIENT_RATE_LIMITED"
  | "INVALID_IDEMPOTENCY_KEY";

export const ANTI_SPAM_MESSAGES: Record<AntiSpamCode, string> = {
  SPAM_DETECTED: "Không thể xử lý yêu cầu.",
  RATE_LIMITED:
    "Bạn đã gửi quá nhiều yêu cầu trong thời gian ngắn. Vui lòng thử lại sau.",
  PHONE_RATE_LIMITED:
    "Bạn đã gửi quá nhiều yêu cầu trong thời gian ngắn. Vui lòng thử lại sau.",
  CLIENT_RATE_LIMITED:
    "Bạn đã gửi quá nhiều yêu cầu trong thời gian ngắn. Vui lòng thử lại sau.",
  INVALID_IDEMPOTENCY_KEY: "Yêu cầu không hợp lệ. Vui lòng thử lại.",
};

// Contact details are shown to staff only in masked form: the system sends the
// alerts, so nobody at the centre needs a donor's full phone number or address.

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "••••";
  return `•• •• ${digits.slice(-3)}`;
}

export function maskEmail(email: string | null | undefined): string {
  if (!email) return "—";
  const [user = "", domain = ""] = email.split("@");
  return `${user.slice(0, 1)}•••@${domain}`;
}

/** Digits only, so "+216 20 100 400" and "21620100400" match. */
export const phoneKey = (s: string) => s.replace(/\D/g, "");
export const emailKey = (s: string) => s.trim().toLowerCase();

import type { TicketChannel } from "./queries";

/** Shared by server and client components. */
export const ticketRef = (id: number) => `T-${id}`;

export const CHANNEL_LABELS: Record<TicketChannel, string> = {
  phone: "Phone call",
  email: "Email",
  whatsapp: "WhatsApp",
  in_person: "In person",
};

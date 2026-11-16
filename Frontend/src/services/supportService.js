import api from "./api";

/**
 * Fetch support tickets created by the logged-in user.
 * GET /api/support/my-tickets/
 * Response: { tickets: [ { id, ticket_number, subject, priority, status, created_at, updated_at, ... } ] }
 */
export const getMyTickets = async () => {
  const response = await api.get("/support/my-tickets/");
  return response.data;
};

/**
 * Create a new support ticket for the logged-in user.
 * POST /api/support/create/
 * Request payload: { subject: string, priority: "low" | "medium" | "high" }
 * Response: { message: string, ticket: { id, ticket_number, subject, priority, status, created_at } }
 */
export const createTicket = async (ticketData) => {
  // Validate and sanitize priority
  const priority = (ticketData.priority || "medium").toLowerCase();
  const allowedPriorities = ["low", "medium", "high"];
  const sanitizedPriority = allowedPriorities.includes(priority) ? priority : "medium";

  // If a category or description is supplied, format it cleanly into the subject or payload
  let subject = ticketData.subject?.trim() || "";
  if (ticketData.category && !subject.startsWith(`[${ticketData.category}]`)) {
    subject = `[${ticketData.category}] ${subject}`;
  }

  const payload = {
    subject,
    priority: sanitizedPriority,
  };

  const response = await api.post("/support/create/", payload);
  return response.data;
};

import api from "./api";

/**
 * Fetch support tickets with optional query params (page, page_size, search, status, priority, paginate).
 * Returns tickets list and KPI stats (total_tickets, open_tickets, in_progress_tickets, resolved_tickets).
 */
export const getAdminTickets = async (params = {}) => {
  const response = await api.get("/support/admin/", { params });
  return response.data;
};

/**
 * Fetch a single support ticket by ID.
 */
export const getAdminTicketDetail = async (ticketId) => {
  const response = await api.get(`/support/admin/${ticketId}/`);
  return response.data;
};

/**
 * Update a support ticket status or priority.
 */
export const updateAdminTicket = async (ticketId, updateData) => {
  const response = await api.put(`/support/admin/${ticketId}/`, updateData);
  return response.data;
};

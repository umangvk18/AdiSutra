// Client-safe: combines a customer's first/last name for display.
// The WhatsApp greeting deliberately uses first_name alone instead of this
// -- see components/BillImageActions.tsx.
export function fullName(customer: { first_name: string; last_name: string }): string {
  return [customer.first_name, customer.last_name].filter(Boolean).join(" ");
}

// Shared types safe to import from both server and client code.
// (lib/google/* is guarded with "server-only" and cannot be imported from
// client components, so data shapes used by the UI live here instead.)

export type SareeStatus = "In Stock" | "Sold";

export type Saree = {
  saree_code: string;
  photo_url: string;
  region: string;
  vendor: string;
  material: string;
  design_type: string;
  color: string;
  cost_price: number;
  selling_price: number;
  date_received: string;
  status: SareeStatus;
  date_sold: string;
  bill_number: string;
};

export type AttributesByType = Record<string, string[]>;

export type Customer = {
  customer_id: string;
  name: string;
  phone: string;
};

export type PaymentStatus = "Paid" | "Partial" | "Credit";
export type BillStatus = "Active" | "Returned" | "Partially Returned";

export type Bill = {
  bill_number: string;
  customer_id: string;
  date: string;
  subtotal: number;
  discount: number;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  payment_status: PaymentStatus;
  bill_status: BillStatus;
};

export type BillItem = {
  bill_item_id: string;
  bill_number: string;
  saree_code: string;
  price_at_sale: number;
  item_status: "Sold" | "Returned";
};

export type BillDetailItem = BillItem & {
  material: string;
  design_type: string;
  photo_url: string;
};

export type BillDetail = {
  bill: Bill;
  customer: Customer | null;
  items: BillDetailItem[];
};

export type PendingBillSummary = {
  bill_number: string;
  customer_name: string;
  amount_due: number;
  days_pending: number;
};

export type HomeSummary = {
  todaySales: number;
  monthSales: number;
  totalPendingDues: number;
  pendingBills: PendingBillSummary[];
};

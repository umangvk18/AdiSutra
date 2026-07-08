import type { Bill, Customer } from "@/lib/types";

const SAGE = "#4F7C6C";
const SAGE_DARK = "#33473F";
const TERRACOTTA = "#D98B5F";
const GOLD = "#C9A15A";
const CREAM = "#F7F1E6";

export type BillImageItem = {
  saree_code: string;
  description: string;
  price: number;
};

type Props = {
  bill: Bill;
  customer: Customer;
  items: BillImageItem[];
};

function Row({
  label,
  value,
  bold,
  color,
}: {
  label: string;
  value: string;
  bold?: boolean;
  color?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "2px 0",
        fontWeight: bold ? 700 : 400,
        color: color ?? SAGE_DARK,
      }}
    >
      <span style={{ opacity: 0.7 }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

/** Rendered off-screen and captured to PNG via html-to-image for the WhatsApp share (Section 8.1). */
export function BillImageTemplate({ bill, customer, items }: Props) {
  const paidInFull = bill.amount_due <= 0;

  return (
    <div
      style={{
        width: 600,
        fontFamily: "Georgia, 'Playfair Display', serif",
        backgroundColor: CREAM,
        color: SAGE_DARK,
        padding: 32,
        boxSizing: "border-box",
      }}
    >
      <div style={{ textAlign: "center", paddingBottom: 8, borderBottom: `2px solid ${GOLD}` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-full.png" alt="AdiSutra" width={220} height={220} style={{ margin: "0 auto" }} />
      </div>

      <div style={{ padding: "16px 0", fontFamily: "Arial, sans-serif", fontSize: 14 }}>
        <Row label="Bill No" value={bill.bill_number} />
        <Row label="Date" value={bill.date} />
        <Row label="Customer" value={customer.name} />
        <Row label="Phone" value={customer.phone} />
      </div>

      <div
        style={{
          borderTop: `1px solid ${GOLD}`,
          borderBottom: `1px solid ${GOLD}`,
          padding: "12px 0",
          fontFamily: "Arial, sans-serif",
          fontSize: 14,
        }}
      >
        {items.map((item) => (
          <div
            key={item.saree_code}
            style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}
          >
            <span>
              {item.saree_code} - {item.description}
            </span>
            <span>₹{item.price}</span>
          </div>
        ))}
      </div>

      <div style={{ padding: "12px 0", fontFamily: "Arial, sans-serif", fontSize: 14 }}>
        <Row label="Subtotal" value={`₹${bill.subtotal}`} />
        {bill.discount > 0 && <Row label="Discount" value={`-₹${bill.discount}`} />}
        <Row label="Total" value={`₹${bill.total_amount}`} bold />
        <Row label="Paid" value={`₹${bill.amount_paid}`} />
        {bill.amount_due > 0 && <Row label="Due" value={`₹${bill.amount_due}`} bold color={TERRACOTTA} />}
      </div>

      <div
        style={{
          textAlign: "center",
          padding: "12px 0",
          borderTop: `1px solid ${GOLD}`,
          fontFamily: "Arial, sans-serif",
          fontSize: 13,
          fontWeight: 600,
          color: paidInFull ? SAGE : TERRACOTTA,
        }}
      >
        {paidInFull ? "PAID IN FULL" : bill.payment_status.toUpperCase()}
      </div>

      <div
        style={{
          textAlign: "center",
          paddingTop: 16,
          fontFamily: "Arial, sans-serif",
          fontSize: 13,
          color: SAGE_DARK,
          opacity: 0.8,
        }}
      >
        Thank you for shopping with AdiSutra! 🌸
      </div>
    </div>
  );
}

import { useState } from "react";
import { Download, Eye, FileText, Package, Printer, X } from "lucide-react";
import type { Order, Timestamp } from "@/lib/orderService";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/orderStatus";

function formatDate(timestamp?: Timestamp | null): string {
  if (!timestamp) return "—";
  return new Date(timestamp.seconds * 1000).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function money(value: number): string {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function addressLines(order: Order): string {
  const address = order.address;
  return [
    address.houseNumber,
    address.buildingName,
    address.street,
    address.area,
    address.landmark,
    address.city,
    address.state,
    address.pincode,
  ].filter(Boolean).join(", ");
}

export function getInvoiceMarkup(order: Order): string {
  const itemRows = order.items.map((item) => `
    <tr>
      <td>
        <div class="item-name">
          ${item.imageUrl ? `<img class="item-image" src="${escapeHtml(item.imageUrl)}" alt="" />` : ""}
          <span><strong>${escapeHtml(item.medicineName)}</strong>
          ${item.brandName ? `<small>${escapeHtml(item.brandName)}</small>` : ""}</span>
        </div>
      </td>
      <td class="number">${escapeHtml(item.quantity)}</td>
      <td class="number">${money(item.unitPrice)}</td>
      <td class="number">${money(item.totalPrice)}</td>
    </tr>
  `).join("");
  const paymentMethod = order.payment.method === "cod"
    ? "Cash on Delivery"
    : order.payment.method.toUpperCase();
  const paymentStatus = order.payment.status === "verification-pending"
    ? "Verification pending"
    : order.payment.status;
  const discount = order.pricing.discount > 0
    ? `<div class="summary-row discount"><span>Discount</span><strong>−${money(order.pricing.discount)}</strong></div>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Invoice ${escapeHtml(order.orderId)} · Ayush Medico</title>
    <style>
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      body { margin: 0; padding: 32px; background: #eef4f6; color: #172b3a; font: 14px/1.5 Arial, sans-serif; }
      .invoice { max-width: 820px; margin: 0 auto; background: #fff; padding: 42px; border-top: 5px solid #1d7293; box-shadow: 0 10px 34px rgba(31, 67, 83, .12); }
      .header, .meta, .summary-row, .total, .footer-row { display: flex; justify-content: space-between; gap: 24px; }
      .header { align-items: flex-start; padding-bottom: 28px; border-bottom: 1px solid #d9e5e9; }
      h1 { margin: 0; color: #155675; font-size: 25px; letter-spacing: -.02em; }
      h2 { margin: 0; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: #607681; }
      .brand { margin: 0 0 3px; font-size: 17px; font-weight: 700; color: #173a4b; }
      .subtle { color: #607681; }
      .right { text-align: right; }
      .meta { padding: 22px 0; }
      .meta p { margin: 4px 0 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th { padding: 11px 0; border-bottom: 2px solid #c8dce3; color: #607681; font-size: 11px; letter-spacing: .09em; text-align: left; text-transform: uppercase; }
      td { padding: 14px 0; border-bottom: 1px solid #e5edef; vertical-align: top; }
      td small { display: block; color: #607681; margin-top: 2px; }
      .item-name { display: flex; align-items: center; gap: 10px; }
      .item-image { width: 36px; height: 36px; border-radius: 6px; object-fit: cover; background: #eef4f6; }
      .number { text-align: right; white-space: nowrap; }
      .summary { width: min(100%, 310px); margin: 20px 0 0 auto; }
      .summary-row { padding: 5px 0; color: #607681; }
      .summary-row strong { color: #172b3a; }
      .summary-row.discount strong { color: #21815e; }
      .total { margin-top: 10px; padding-top: 13px; border-top: 2px solid #155675; color: #155675; font-size: 17px; }
      .footer-row { margin-top: 36px; padding-top: 18px; border-top: 1px solid #d9e5e9; color: #607681; font-size: 12px; }
      @media print { body { padding: 0; background: #fff; } .invoice { max-width: none; box-shadow: none; border-top: 0; } }
      @media (max-width: 620px) { body { padding: 14px; } .invoice { padding: 24px 18px; } .header, .meta { display: block; } .right { text-align: left; margin-top: 18px; } th, td { font-size: 12px; } }
    </style>
  </head>
  <body>
    <article class="invoice">
      <header class="header">
        <div>
          <p class="brand">Ayush Medico</p>
          <p class="subtle">Kurla West · Mumbai</p>
          <p class="subtle">+91 98332 73838</p>
        </div>
        <div class="right">
          <h1>Tax invoice</h1>
          <p class="subtle">Invoice for order ${escapeHtml(order.orderId)}</p>
        </div>
      </header>
      <section class="meta">
        <div>
          <h2>Billed to</h2>
          <p><strong>${escapeHtml(order.customerName)}</strong></p>
          <p class="subtle">${escapeHtml(order.customerEmail || order.customerPhone)}</p>
        </div>
        <div class="right">
          <h2>Order details</h2>
          <p><strong>${escapeHtml(order.orderId)}</strong></p>
          <p class="subtle">Placed ${escapeHtml(formatDate(order.createdAt))}</p>
          <p class="subtle">Status: ${escapeHtml(ORDER_STATUS_LABELS[order.status as OrderStatus] ?? order.status)}</p>
        </div>
      </section>
      <section>
        <h2>Items</h2>
        <table>
          <thead><tr><th>Medicine</th><th class="number">Qty</th><th class="number">Unit price</th><th class="number">Amount</th></tr></thead>
          <tbody>${itemRows || `<tr><td colspan="4">No item lines available.</td></tr>`}</tbody>
        </table>
      </section>
      <section class="summary">
        <div class="summary-row"><span>Subtotal</span><strong>${money(order.pricing.subtotal)}</strong></div>
        <div class="summary-row"><span>Delivery</span><strong>${order.pricing.deliveryCharge === 0 ? "Free" : money(order.pricing.deliveryCharge)}</strong></div>
        <div class="summary-row"><span>GST</span><strong>${money(order.pricing.gst)}</strong></div>
        ${discount}
        <div class="total"><span>Grand total</span><strong>${money(order.pricing.grandTotal)}</strong></div>
      </section>
      <section class="meta">
        <div>
          <h2>Delivery address</h2>
          <p><strong>${escapeHtml(order.address.fullName)}</strong></p>
          <p class="subtle">${escapeHtml(addressLines(order))}</p>
          <p class="subtle">${escapeHtml(order.address.mobileNumber)}</p>
        </div>
        <div class="right">
          <h2>Payment</h2>
          <p><strong>${escapeHtml(paymentMethod)}</strong></p>
          <p class="subtle">${escapeHtml(paymentStatus)}</p>
        </div>
      </section>
      <footer class="footer-row"><span>Thank you for choosing Ayush Medico.</span><span>Generated ${escapeHtml(new Date().toLocaleDateString("en-IN"))}</span></footer>
    </article>
  </body>
</html>`;
}

function printInvoice(order: Order) {
  const printWindow = window.open("", "_blank", "width=900,height=760");
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(getInvoiceMarkup(order));
  printWindow.document.close();
  printWindow.focus();
  window.setTimeout(() => printWindow.print(), 250);
}

function downloadInvoice(order: Order) {
  const blob = new Blob([getInvoiceMarkup(order)], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `ayush-medico-invoice-${order.orderId}.html`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function InvoiceActions({ order, compact = false }: { order: Order; compact?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className={`flex items-center gap-2 ${compact ? "" : "flex-wrap"}`}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          data-testid={`button-view-invoice-${order.id}`}
          className={`${compact ? "px-2.5" : "px-3"} inline-flex items-center justify-center gap-1.5 py-2 rounded-lg border border-primary/25 text-primary text-xs font-semibold hover:bg-primary/5 transition-colors`}
        >
          <Eye size={14} /> <span>View Invoice</span>
        </button>
        <button
          type="button"
          onClick={() => downloadInvoice(order)}
          aria-label={`Download invoice for ${order.orderId}`}
          data-testid={`button-download-invoice-${order.id}`}
          className={`${compact ? "px-2.5" : "px-3"} inline-flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border text-foreground text-xs font-semibold hover:bg-muted transition-colors`}
        >
          <Download size={14} /> <span>Download</span>
        </button>
        <button
          type="button"
          onClick={() => printInvoice(order)}
          aria-label={`Print invoice for ${order.orderId}`}
          data-testid={`button-print-invoice-${order.id}`}
          className={`${compact ? "px-2.5" : "px-3"} inline-flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border text-foreground text-xs font-semibold hover:bg-muted transition-colors`}
        >
          <Printer size={14} /> <span>Print</span>
        </button>
      </div>
      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/45 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`Invoice ${order.orderId}`}
          onClick={() => setOpen(false)}
        >
          <div
            className="relative flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-background shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            data-testid={`invoice-dialog-${order.id}`}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-primary" />
                <p className="text-sm font-bold text-foreground">Invoice {order.orderId}</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => downloadInvoice(order)} aria-label={`Download invoice for ${order.orderId}`} data-testid={`dialog-download-invoice-${order.id}`} className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted">
                  <Download size={13} /> Download
                </button>
                <button type="button" onClick={() => printInvoice(order)} aria-label={`Print invoice for ${order.orderId}`} data-testid={`dialog-print-invoice-${order.id}`} className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted">
                  <Printer size={13} /> Print
                </button>
                <button type="button" onClick={() => setOpen(false)} aria-label="Close invoice" data-testid={`button-close-invoice-${order.id}`} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                  <X size={17} />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto bg-[#eef4f6] p-3 dark:bg-background sm:p-6">
              <InvoicePreview order={order} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function InvoicePreview({ order }: { order: Order }) {
  return (
    <article className="invoice-print-sheet mx-auto max-w-3xl border-t-4 border-primary bg-card p-5 shadow-sm sm:p-9" data-testid={`invoice-preview-${order.id}`}>
      <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-lg font-bold text-foreground">Ayush <span className="text-primary">Medico</span></p>
          <p className="text-xs text-muted-foreground">Kurla West · Mumbai · +91 98332 73838</p>
        </div>
        <div className="sm:text-right">
          <h2 className="text-2xl font-bold tracking-tight text-primary">Tax invoice</h2>
          <p className="text-xs text-muted-foreground">Order {order.orderId}</p>
        </div>
      </header>
      <div className="grid gap-5 border-b border-border py-5 text-sm sm:grid-cols-2">
        <div>
          <p className="invoice-label">Billed to</p>
          <p className="mt-1 font-semibold text-foreground">{order.customerName}</p>
          <p className="text-xs text-muted-foreground">{order.customerEmail || order.customerPhone}</p>
        </div>
        <div className="sm:text-right">
          <p className="invoice-label">Order details</p>
          <p className="mt-1 font-semibold text-foreground">{formatDate(order.createdAt)}</p>
          <p className="text-xs text-muted-foreground">{ORDER_STATUS_LABELS[order.status as OrderStatus] ?? order.status}</p>
        </div>
      </div>
      <div className="py-5">
        <p className="invoice-label">Items</p>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[500px] text-left text-sm">
            <thead className="border-b-2 border-primary/20 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr><th className="py-2 font-semibold">Medicine</th><th className="py-2 text-right font-semibold">Qty</th><th className="py-2 text-right font-semibold">Unit price</th><th className="py-2 text-right font-semibold">Amount</th></tr>
            </thead>
            <tbody>
              {order.items.length > 0 ? order.items.map((item, index) => (
                <tr key={`${item.medicineId}-${index}`} className="border-b border-border/70 last:border-0">
                  <td className="py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-primary/60">
                        {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover" /> : <Package size={16} />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground">{item.medicineName}</p>
                        {item.brandName && <p className="text-xs text-muted-foreground">{item.brandName}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-right text-foreground">{item.quantity}</td>
                  <td className="py-3 text-right text-foreground">{money(item.unitPrice)}</td>
                  <td className="py-3 text-right font-semibold text-foreground">{money(item.totalPrice)}</td>
                </tr>
              )) : <tr><td colSpan={4} className="py-4 text-muted-foreground">No item lines available.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="ml-auto mt-5 max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{money(order.pricing.subtotal)}</span></div>
          <div className="flex justify-between text-muted-foreground"><span>Delivery</span><span>{order.pricing.deliveryCharge === 0 ? "Free" : money(order.pricing.deliveryCharge)}</span></div>
          <div className="flex justify-between text-muted-foreground"><span>GST</span><span>{money(order.pricing.gst)}</span></div>
          {order.pricing.discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>−{money(order.pricing.discount)}</span></div>}
          <div className="flex justify-between border-t border-primary/40 pt-2 text-base font-bold text-primary"><span>Grand total</span><span>{money(order.pricing.grandTotal)}</span></div>
        </div>
      </div>
      <div className="grid gap-5 border-t border-border pt-5 text-sm sm:grid-cols-2">
        <div><p className="invoice-label">Delivery address</p><p className="mt-1 font-semibold text-foreground">{order.address.fullName}</p><p className="text-xs leading-5 text-muted-foreground">{addressLines(order)}</p><p className="text-xs text-muted-foreground">{order.address.mobileNumber}</p></div>
        <div className="sm:text-right"><p className="invoice-label">Payment</p><p className="mt-1 font-semibold capitalize text-foreground">{order.payment.method === "cod" ? "Cash on Delivery" : order.payment.method}</p><p className="text-xs capitalize text-muted-foreground">{order.payment.status === "verification-pending" ? "Verification pending" : order.payment.status}</p></div>
      </div>
      <footer className="mt-7 border-t border-border pt-4 text-xs text-muted-foreground">Thank you for choosing Ayush Medico.</footer>
    </article>
  );
}
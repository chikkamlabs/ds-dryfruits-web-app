'use client';

import React from 'react';
import { X, Printer } from 'lucide-react';
import type { GeneratedBill } from '@/lib/generateBill';

interface BillPreviewProps {
  bill: GeneratedBill | null;
  onClose: () => void;
}

const formatMoney = (amount: number) =>
  `₹${Number(amount || 0).toFixed(2)}`;

const paymentLabel = (mode: string) => {
  switch (mode) {
    case 'cash':
      return 'Cash';
    case 'upi':
      return 'UPI';
    case 'credit':
      return 'Credit';
    default:
      return mode;
  }
};

export default function BillPreview({
  bill,
  onClose,
}: BillPreviewProps) {
  if (!bill) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl h-[95vh] bg-surface rounded-xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-primary">
              Bill Preview
            </h2>

            <p className="text-sm text-muted mt-0.5">
              Bill #{bill.billId}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-subtle transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-auto bg-surface-subtle p-5">
          <div
            className="mx-auto bg-white text-black shadow-md"
            style={{
              width: '80mm',
              minHeight: '100mm',
              padding: '5mm',
              fontFamily: 'monospace',
              fontSize: '12px',
              lineHeight: '1.4',
            }}
          >
            {/* Shop Header */}
            {/* Shop Header */}
<div className="text-center">
  {/* Logo */}
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: '6px',
    }}
  >
    <img
  src="/dsdryfruits.png"
  alt="DS Dry Fruits Logo"
  width={50}
  height={50}
  style={{
    width: '28mm',
    height: 'auto',
    maxWidth: '100%',
    display: 'block',
    margin: '0 auto 5px auto',
    objectFit: 'contain',
  }}
/>
  </div>

  {/* Shop Name */}
  <div
    style={{
      fontSize: '17px',
      fontWeight: 'bold',
    }}
  >
    DS DRY FRUITS
  </div>
    <div>
    8-9-40/1,2 Vankayalavari street, Main Road, Rajamahendravaram
  </div>

  <div style={{ marginTop: '4px' }}>
    {bill.billId} || {bill.date}
  </div>
</div>

            <div
              style={{
                borderTop: '1px dashed #000',
                margin: '10px 0',
              }}
            />

            {/* Customer */}
            {bill.customer && (
              <>
                <div>
                  Customer: {bill.customer.name}
                </div>

                {bill.customer.mobile && (
                  <div>
                    Mobile: {bill.customer.mobile}
                  </div>
                )}

                <div
                  style={{
                    borderTop: '1px dashed #000',
                    margin: '10px 0',
                  }}
                />
              </>
            )}

            {/* Items */}
            {/* Items */}
<div
  style={{
    display: 'grid',
    gridTemplateColumns: '1fr 42px 30px 48px 55px',
    gap: '3px',
    fontWeight: 'bold',
    fontSize: '10px',
    marginBottom: '6px',
  }}
>
  <span>ITEM</span>
  <span style={{ textAlign: 'right' }}>MRP</span>
  <span style={{ textAlign: 'right' }}>QTY</span>
  <span style={{ textAlign: 'right' }}>S.P</span>
  <span style={{ textAlign: 'right' }}>TOTAL</span>
</div>

{bill.items.map((item) => (
  <React.Fragment key={item.id}>
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 42px 30px 48px 55px',
        gap: '3px',
        fontSize: '10px',
        marginBottom: '3px',
        alignItems: 'start',
      }}
    >
      <span
        style={{
          wordBreak: 'break-word',
          paddingRight: '2px',
        }}
      >
        {item.name}
      </span>

      <span style={{ textAlign: 'right' }}>
        {Number(item.mrp).toFixed(2)}
      </span>

      <span style={{ textAlign: 'right' }}>
        {item.quantity}
      </span>

      <span style={{ textAlign: 'right' }}>
        {Number(item.selling_price).toFixed(2)}
      </span>

      <span style={{ textAlign: 'right' }}>
        {Number(item.row_total).toFixed(2)}
      </span>
    </div>

    {/* Small line between products */}
    <div
      style={{
        borderTop: '1px dotted #999',
        margin: '3px 0 4px',
      }}
    />
  </React.Fragment>
))}

            {/* Summary */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>Subtotal</span>
              <span>{formatMoney(bill.subtotal)}</span>
            </div>

            {bill.discount > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>Discount</span>
                <span>-{formatMoney(bill.discount)}</span>
              </div>
            )}

            <div
              style={{
                borderTop: '1px solid #000',
                margin: '7px 0',
              }}
            />

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '15px',
                fontWeight: 'bold',
              }}
            >
              <span>TOTAL</span>
              <span>{formatMoney(bill.total)}</span>
            </div>

            <div
  style={{
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '4px',
    fontSize: '11px',
  }}
>
  <span>You have saved</span>
  <span>
    {formatMoney(
      bill.items.reduce(
        (total, item) =>
          total +
          (Number(item.mrp) - Number(item.selling_price)) *
            Number(item.quantity),
        0
      ) + Number(bill.discount || 0)
    )}
  </span>
</div>

            <div
              style={{
                borderTop: '1px dashed #000',
                margin: '10px 0',
              }}
            />

            {/* Payment */}
            <div style={{ fontWeight: 'bold' }}>
              Payment
            </div>

            {bill.payments.map((payment, index) => (
              <div
                key={`${payment.mode}-${index}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>{paymentLabel(payment.mode)}</span>
                <span>{formatMoney(payment.amount)}</span>
              </div>
            ))}

            <div
  style={{
    borderTop: '1px dashed #000',
    margin: '12px 0 8px',
  }}
/>

<div
  style={{
    textAlign: 'center',
    fontSize: '10px',
    lineHeight: '1.4',
  }}
>
  <div>
    Ph: 75697 98930
  </div>
  <div style={{ marginTop: '4px', fontWeight: 'bold' }}>
    Online order visit:
  </div>

  {/* Online Order QR */}
  <div
    style={{
      marginTop: '8px',
      display: 'flex',
      justifyContent: 'center',
    }}
  >

    <img
      src="/websiteqr.png"
      alt="Online Order QR Code"
      width={120}
      height={120}
      style={{
        width: '28mm',
        height: '28mm',
        display: 'block',
        objectFit: 'contain',
      }}
    />
  </div>


  <div>
    ds-dry-fruits.vercel.app.com
  </div>
</div>

<div
  className="text-center"
  style={{
    marginTop: '8px',
  }}
>
  <div>Thank You! Visit Again</div>
</div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="btn-base btn-secondary px-5 py-2.5"
          >
            Close
          </button>

          <button
            type="button"
            disabled
            className="btn-base btn-primary px-5 py-2.5 opacity-50 cursor-not-allowed flex items-center gap-2"
            title="Printer integration will be added later"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>
    </div>
  );
}
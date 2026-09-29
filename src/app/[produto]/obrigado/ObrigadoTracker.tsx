"use client";

import { useEffect } from "react";
import { gtag } from "@/lib/gtag";

interface ObrigadoTrackerProps {
  paymentId?: string;
  price: number;
  productKey: string;
  productName: string;
}

export default function ObrigadoTracker({
  paymentId,
  price,
  productKey,
  productName,
}: ObrigadoTrackerProps) {
  useEffect(() => {
    const txId = paymentId || `tx_${productKey.toLowerCase()}`;
    const dedupeKey = `obrigado_tracked_${txId}`;

    try {
      if (sessionStorage.getItem(dedupeKey)) {
        return;
      }
      sessionStorage.setItem(dedupeKey, "true");
    } catch {
      // Ignora erro de sessionStorage restrito
    }

    // 1. Dispara o evento de Purchase no Meta Pixel
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (typeof window !== "undefined" && (window as any).fbq) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).fbq("track", "Purchase", {
          value: price,
          currency: "BRL",
          content_name: productName,
        });
      }
    } catch (err) {
      console.warn("Erro ao disparar Pixel no /obrigado:", err);
    }

    // 2. Dispara evento de Purchase no GA4
    gtag("event", "purchase", {
      transaction_id: paymentId || txId,
      value: price,
      currency: "BRL",
      items: [{ item_id: productKey, item_name: productName, price, quantity: 1 }],
    });
  }, [paymentId, price, productKey, productName]);

  return null;
}

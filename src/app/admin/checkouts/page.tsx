"use client";

// Página antiga de gerenciamento — funcionalidade migrada pro hub /admin/produtos
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyCheckoutsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/produtos");
  }, [router]);
  return null;
}

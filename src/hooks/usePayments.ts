import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Payment {
  id: string;
  amount: number;
  payment_type: string;
  status: string;
  created_at: string;
  completed_at: string | null;
}

interface PaymentSettings {
  deposit_percentage: number;
  vat_rate: number;
}

export function usePayments(jobId: string | undefined) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) return;
    
    loadPayments();
    loadSettings();
  }, [jobId]);

  const loadPayments = async () => {
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("job_id", jobId!)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error("Error loading payments:", error);
    }
  };

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("payment_settings")
        .select("deposit_percentage, vat_rate")
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDepositPayment = () => {
    return payments.find((p) => p.payment_type === "deposit");
  };

  const getBalancePayment = () => {
    return payments.find((p) => p.payment_type === "balance");
  };

  const calculateAmounts = (totalCost: number) => {
    if (!settings) return { deposit: 0, balance: 0 };
    
    const deposit = totalCost * (settings.deposit_percentage / 100);
    const balance = totalCost - deposit;
    
    return { deposit, balance };
  };

  const isDepositPaid = () => {
    const depositPayment = getDepositPayment();
    return depositPayment?.status === "succeeded";
  };

  const isBalancePaid = () => {
    const balancePayment = getBalancePayment();
    return balancePayment?.status === "succeeded";
  };

  const isFullyPaid = () => {
    return isDepositPaid() && isBalancePaid();
  };

  return {
    payments,
    settings,
    loading,
    getDepositPayment,
    getBalancePayment,
    calculateAmounts,
    isDepositPaid,
    isBalancePaid,
    isFullyPaid,
    refresh: loadPayments,
  };
}

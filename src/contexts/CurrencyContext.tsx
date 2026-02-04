import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type CurrencyCode = "NGN" | "USD" | "EUR" | "GBP";

type RatesState = {
  base: CurrencyCode;
  fetchedAt: number; // ms
  rates: Record<string, number>;
};

type CurrencyContextValue = {
  baseCurrency: CurrencyCode;
  currency: CurrencyCode;
  supportedCurrencies: CurrencyCode[];
  setCurrency: (next: CurrencyCode) => Promise<void>;
  ratesStatus: "idle" | "loading" | "ready" | "error";
  formatMoney: (amountInBase: number, opts?: { maximumFractionDigits?: number }) => string;
  formatBaseMoney: (amountInBase: number, opts?: { maximumFractionDigits?: number }) => string;
  convertFromBase: (amountInBase: number, to?: CurrencyCode) => number;
  convertToBase: (amountInCurrency: number, from?: CurrencyCode) => number;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

const STORAGE_KEY = "currency_pref_v1";
const RATES_KEY = "fx_rates_v1";

const SUPPORTED: CurrencyCode[] = ["NGN", "USD", "EUR", "GBP"];

function isCurrencyCode(v: unknown): v is CurrencyCode {
  return typeof v === "string" && (SUPPORTED as string[]).includes(v);
}

function readStoredCurrency(): CurrencyCode | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isCurrencyCode(parsed?.currency) ? parsed.currency : null;
  } catch {
    return null;
  }
}

function writeStoredCurrency(currency: CurrencyCode) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ currency }));
  } catch {
    // ignore
  }
}

function readStoredRates(base: CurrencyCode): RatesState | null {
  try {
    const raw = localStorage.getItem(RATES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RatesState;
    if (!parsed || parsed.base !== base || typeof parsed.fetchedAt !== "number" || !parsed.rates) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredRates(state: RatesState) {
  try {
    localStorage.setItem(RATES_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const baseCurrency: CurrencyCode = "NGN";
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => readStoredCurrency() ?? baseCurrency);
  const [ratesStatus, setRatesStatus] = useState<CurrencyContextValue["ratesStatus"]>("idle");
  const [rates, setRates] = useState<Record<string, number> | null>(null);

  const loadRates = useCallback(async () => {
    // Cache for 24h
    const cached = readStoredRates(baseCurrency);
    const now = Date.now();
    if (cached && now - cached.fetchedAt < 24 * 60 * 60 * 1000) {
      setRates(cached.rates);
      setRatesStatus("ready");
      return;
    }

    setRatesStatus("loading");
    try {
      const { data, error } = await supabase.functions.invoke("get-exchange-rates", {
        body: { base: baseCurrency },
      });
      if (error) throw error;
      const nextRates = (data?.rates ?? null) as Record<string, number> | null;
      if (!nextRates) throw new Error("Missing rates");

      setRates(nextRates);
      setRatesStatus("ready");
      writeStoredRates({ base: baseCurrency, fetchedAt: now, rates: nextRates });
    } catch (e) {
      console.error("Failed to load exchange rates", e);
      setRatesStatus("error");
    }
  }, [baseCurrency]);

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  // Sync currency from backend (if logged in)
  useEffect(() => {
    const run = async () => {
      const stored = readStoredCurrency();
      if (!user) {
        setCurrencyState(stored ?? baseCurrency);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_settings")
          .select("currency")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;
        const dbCurrency = isCurrencyCode(data?.currency) ? (data!.currency as CurrencyCode) : null;
        const next = dbCurrency ?? stored ?? baseCurrency;
        setCurrencyState(next);
        writeStoredCurrency(next);

        // Ensure row exists / ensure currency is stored
        if (!dbCurrency) {
          await supabase
            .from("user_settings")
            .upsert({ user_id: user.id, currency: next }, { onConflict: "user_id" });
        }
      } catch (e) {
        console.error("Failed to load currency preference", e);
        setCurrencyState(stored ?? baseCurrency);
      }
    };

    run();
  }, [user?.id, baseCurrency]);

  const setCurrency = useCallback(
    async (next: CurrencyCode) => {
      if (!isCurrencyCode(next)) return;
      setCurrencyState(next);
      writeStoredCurrency(next);

      if (!user) return;
      try {
        await supabase
          .from("user_settings")
          .upsert({ user_id: user.id, currency: next }, { onConflict: "user_id" });
      } catch (e) {
        console.error("Failed to persist currency preference", e);
      }
    },
    [user],
  );

  const convertFromBase = useCallback(
    (amountInBase: number, to: CurrencyCode = currency) => {
      if (to === baseCurrency) return amountInBase;
      const r = rates?.[to];
      if (!r || !Number.isFinite(r)) return amountInBase;
      return amountInBase * r;
    },
    [rates, currency, baseCurrency],
  );

  const convertToBase = useCallback(
    (amountInCurrency: number, from: CurrencyCode = currency) => {
      if (from === baseCurrency) return amountInCurrency;
      const r = rates?.[from];
      if (!r || !Number.isFinite(r)) return amountInCurrency;
      return amountInCurrency / r;
    },
    [rates, currency, baseCurrency],
  );

  const formatBaseMoney = useCallback(
    (amountInBase: number, opts?: { maximumFractionDigits?: number }) => {
      return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: baseCurrency,
        maximumFractionDigits: opts?.maximumFractionDigits ?? 2,
      }).format(amountInBase);
    },
    [baseCurrency],
  );

  const formatMoney = useCallback(
    (amountInBase: number, opts?: { maximumFractionDigits?: number }) => {
      const amount = convertFromBase(amountInBase, currency);
      const locale = currency === "NGN" ? "en-NG" : undefined;
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        maximumFractionDigits: opts?.maximumFractionDigits ?? 2,
      }).format(amount);
    },
    [currency, convertFromBase],
  );

  const value = useMemo<CurrencyContextValue>(
    () => ({
      baseCurrency,
      currency,
      supportedCurrencies: SUPPORTED,
      setCurrency,
      ratesStatus,
      formatMoney,
      formatBaseMoney,
      convertFromBase,
      convertToBase,
    }),
    [baseCurrency, currency, setCurrency, ratesStatus, formatMoney, formatBaseMoney, convertFromBase, convertToBase],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrencyContext() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrencyContext must be used within CurrencyProvider");
  return ctx;
}

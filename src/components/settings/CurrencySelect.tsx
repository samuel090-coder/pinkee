import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrency } from "@/hooks/useCurrency";

export function CurrencySelect() {
  const { currency, supportedCurrencies, setCurrency, ratesStatus, baseCurrency } = useCurrency();

  return (
    <div className="space-y-2">
      <Label>Currency</Label>
      <Select value={currency} onValueChange={(v) => setCurrency(v as any)}>
        <SelectTrigger className="mt-1 bg-input border-border w-48">
          <SelectValue placeholder="Select currency" />
        </SelectTrigger>
        <SelectContent className="bg-card border-border">
          {supportedCurrencies.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Base currency is {baseCurrency}. Exchange rates are {ratesStatus}.
      </p>
    </div>
  );
}

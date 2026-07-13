import { useMoneda } from '../hooks/useMoneda';

export function Money({ amount, className }: { amount: number; className?: string }) {
  const { simbolo, decimales } = useMoneda();
  return (
    <span className={className}>
      {simbolo} {amount.toFixed(decimales)}
    </span>
  );
}
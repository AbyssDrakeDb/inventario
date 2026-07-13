import { useQuery } from '@tanstack/react-query';
import api from '../api/client';

interface MonedaConfig {
  simbolo: string;
  decimales: number;
}

export function useMoneda(): MonedaConfig {
  const { data } = useQuery({
    queryKey: ['config-moneda'],
    queryFn: () => api.get('/auth/profile').then(r => {
      const configs = r.data?.configuraciones;
      if (configs?.length > 0) {
        return {
          simbolo: configs[0].monedaSimbolo || 'S/',
          decimales: configs[0].monedaDecimales ?? 2,
        };
      }
      return { simbolo: 'S/', decimales: 2 };
    }),
    staleTime: 5 * 60 * 1000,
  });

  return data ?? { simbolo: 'S/', decimales: 2 };
}

export function formatMoney(amount: number, config: MonedaConfig): string {
  return `${config.simbolo} ${amount.toFixed(config.decimales)}`;
}
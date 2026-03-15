import { supabase } from './supabase';

async function fetchClientIP(): Promise<string> {
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    return (data?.ip as string) ?? '';
  } catch {
    return '';
  }
}

export async function checkQuoteRateLimit(): Promise<{ allowed: boolean; ip: string }> {
  const ip = await fetchClientIP();
  if (!ip) return { allowed: true, ip: '' };

  const { data, error } = await supabase.rpc('check_quote_rate_limit', { p_ip: ip });
  if (error) return { allowed: true, ip };

  return { allowed: data === true, ip };
}

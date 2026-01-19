import 'server-only';
import axios, { AxiosError } from 'axios';

const baseURL = process.env.API_URL?.replace(/\/$/, '');
if (!baseURL) {
  throw new Error('Missing API_URL in environment');
}

export const api = axios.create({
  baseURL,
  timeout: 15_000,
  headers: {
    Accept: 'application/json',
  },
});

// (opciono) lep error format da dobiješ više info
export function formatApiError(err: unknown) {
  if (!axios.isAxiosError(err)) return { message: 'Unknown error' };

  const e = err as AxiosError<any>;
  return {
    message: e.message,
    status: e.response?.status,
    data: e.response?.data,
  };
}

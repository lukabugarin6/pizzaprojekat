import 'server-only';
import { api } from './server';

export async function getHello() {
  const res = await api.get('/');
  return res.data;
}

'use server';

export async function createPost(prevState: any, formData: FormData) {
  const title = String(formData.get('title') ?? '');
  const content = String(formData.get('content') ?? '');

  const res = await fetch('https://api.vercel.app/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content }),
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { message: text };
  }

  if (!res.ok) {
    return { message: json?.message ?? 'Failed to create post' };
  }

  return json;
}

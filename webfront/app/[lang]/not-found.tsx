import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        textAlign: 'center',
      }}
    >
      <h1>404 - Страница није пронађена</h1>
      <p>Page not found / Страница не найдена</p>
      <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
        <Link href="/sr-Latn">Početna (SR)</Link>
        <Link href="/en">Home (EN)</Link>
        <Link href="/ru">Главная (RU)</Link>
      </div>
    </div>
  );
}

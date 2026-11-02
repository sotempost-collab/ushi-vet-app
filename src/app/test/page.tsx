// Тестовая страница — НЕ обёрнута в AuthGuard.
// Откройте /test — если работает, значит проблема в AuthGuard или authStore.
// Если не работает — проблема в самом Next.js / сборке / деплое.

export default function TestPage() {
  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Test page</h1>
      <p>Если вы видите этот текст — Next.js работает, проблема в AuthGuard.</p>
      <p>Время на сервере: {new Date().toISOString()}</p>
      <hr />
      <p><a href="/">← На главную</a></p>
    </div>
  )
}

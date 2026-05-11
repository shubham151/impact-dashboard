export default function handler(request: Request): Response {
  return new Response(
    JSON.stringify({
      ok: true,
      cwd: process.cwd(),
      node: process.version,
      url: request.url,
      timestamp: new Date().toISOString()
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

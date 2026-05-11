export default async function handler(): Promise<Response> {
  return Response.json({
    ok: true,
    cwd: process.cwd(),
    node: process.version,
    timestamp: new Date().toISOString()
  })
}

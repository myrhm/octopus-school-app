import type { IncomingMessage, ServerResponse } from 'node:http';

type Request = IncomingMessage & { body?: unknown };
type Config = { endpoint: string; project: string; secure: boolean };
const allowed = new Set([
  'start_exam',
  'save_answers',
  'submit_exam',
  'released_result',
  'participant_media',
  'attempt_status',
  'resume_exam',
]);
export async function participant(req: Request, res: ServerResponse, config: Config) {
  const send = (status: number, data: unknown) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(data));
  };
  try {
    if (req.method !== 'POST') return send(405, null);
    const origin = req.headers.origin;
    if (
      !origin ||
      new URL(origin).host !== req.headers.host ||
      !req.headers['content-type']?.startsWith('application/json')
    )
      return send(403, null);
    let body = req.body;
    if (body === undefined) {
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of req) {
        const part = Buffer.from(chunk);
        size += part.length;
        if (size > 262144) return send(413, null);
        chunks.push(part);
      }
      body = Buffer.concat(chunks).toString();
    }
    const input = typeof body === 'string' ? JSON.parse(body) : body;
    if (
      !input ||
      typeof input !== 'object' ||
      !('exam' in input) ||
      typeof input.exam !== 'string' ||
      !/^[-a-zA-Z0-9_]{1,36}$/.test(input.exam) ||
      !('action' in input) ||
      !allowed.has(String(input.action))
    )
      return send(400, null);
    const tab = 'tab' in input ? input.tab : 'default';
    if (typeof tab !== 'string' || !/^[-a-zA-Z0-9]{1,36}$/.test(tab)) return send(400, null);
    const cookieName = 'octopus_attempt_' + input.exam + '_' + tab;
    const cookie = req.headers.cookie
      ?.split(';')
      .map((value) => value.trim())
      .find((value) => value.startsWith(cookieName + '='))
      ?.slice(cookieName.length + 1);
    if (input.action !== 'start_exam' && !cookie) return send(401, null);
    const upstream = await fetch(config.endpoint + '/functions/octopus/executions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Appwrite-Project': config.project },
      body: JSON.stringify({ async: false, body: JSON.stringify({ ...input, attempt: cookie }) }),
    });
    if (!upstream.ok) return send(upstream.status, null);
    const execution = await upstream.json();
    if (execution.responseStatusCode !== 200)
      return send(
        execution.responseStatusCode >= 400 && execution.responseStatusCode < 600
          ? execution.responseStatusCode
          : 502,
        null,
      );
    const data = JSON.parse(execution.responseBody);
    if (input.action === 'start_exam') {
      if (!/^[-a-zA-Z0-9_]{1,64}$/.test(data.attempt)) return send(502, null);
      res.setHeader(
        'Set-Cookie',
        cookieName +
          '=' +
          data.attempt +
          '; Path=/api/participant; HttpOnly; SameSite=Strict' +
          (config.secure ? '; Secure' : ''),
      );
      delete data.attempt;
    }
    send(200, data);
  } catch {
    return send(502, null);
  }
}
export default function handler(req: Request, res: ServerResponse) {
  return participant(req, res, {
    endpoint: process.env.VITE_APPWRITE_ENDPOINT ?? '',
    project: process.env.VITE_APPWRITE_PROJECT_ID ?? '',
    secure: true,
  });
}

// Tiny fakes of the external APIs used by the end-to-end tests (one local server):
//   Stripe     POST /v1/checkout/sessions      -> creates a session, url points to /pay/<id>
//              GET  /v1/checkout/sessions/<id> -> returns it
//              GET  /pay/<id>                  -> "pays" and redirects to success_url (like Stripe Checkout)
//   Telegram   POST /bot<token>/sendMessage    -> records the message
//   Claude     POST /v1/messages               -> a canned rewrite of the invitation message
//   Open-Meteo GET  /v1/search, /v1/forecast   -> a sunny day in Ravello
import http from 'node:http';

export const AI_TEXT = 'Con immensa gioia vi invitiamo a festeggiare con noi il giorno del nostro matrimonio.';

export function startMockApis(port = 12111) {
  const sessions = new Map();
  const requests = [];
  let counter = 0;

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    let body = '';
    for await (const chunk of req) body += chunk;
    requests.push({ method: req.method, path: url.pathname, body, auth: req.headers.authorization, headers: req.headers });

    if (req.method === 'POST' && url.pathname === '/v1/checkout/sessions') {
      if (req.headers.authorization !== 'Bearer sk_test_mock') {
        res.writeHead(401, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ error: { message: 'Invalid API Key provided' } }));
      }
      const p = new URLSearchParams(body);
      const id = `cs_test_${++counter}${Date.now()}`;
      const session = {
        id,
        object: 'checkout.session',
        url: `http://127.0.0.1:${port}/pay/${id}`,
        status: 'open',
        payment_status: 'unpaid',
        amount_total: Number(p.get('line_items[0][price_data][unit_amount]')),
        client_reference_id: p.get('client_reference_id'),
        metadata: { invitation_id: p.get('metadata[invitation_id]') },
        customer_email: p.get('customer_email'),
        customer_details: { email: p.get('customer_email') || 'cliente@example.com' },
        success_url: p.get('success_url'),
        cancel_url: p.get('cancel_url'),
        params: Object.fromEntries(p),
      };
      sessions.set(id, session);
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify(session));
    }

    const get = url.pathname.match(/^\/v1\/checkout\/sessions\/(cs_[\w]+)$/);
    if (req.method === 'GET' && get) {
      const s = sessions.get(get[1]);
      res.writeHead(s ? 200 : 404, { 'content-type': 'application/json' });
      return res.end(JSON.stringify(s ?? { error: { message: 'No such checkout.session' } }));
    }

    const pay = url.pathname.match(/^\/pay\/(cs_[\w]+)$/);
    if (req.method === 'GET' && pay) {
      const s = sessions.get(pay[1]);
      if (!s) {
        res.writeHead(404);
        return res.end('not found');
      }
      s.status = 'complete';
      s.payment_status = 'paid';
      res.writeHead(302, { location: s.success_url.replace('{CHECKOUT_SESSION_ID}', s.id) });
      return res.end();
    }

    const json = (status, data) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(data));
    };

    if (req.method === 'POST' && /^\/bot[^/]+\/sendMessage$/.test(url.pathname)) return json(200, { ok: true, result: { message_id: requests.length } });

    if (req.method === 'POST' && url.pathname === '/v1/messages') {
      if (req.headers['x-api-key'] !== 'sk-ant-test') return json(401, { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } });
      return json(200, {
        id: 'msg_test',
        type: 'message',
        role: 'assistant',
        model: 'claude-opus-5-5',
        content: [
          { type: 'thinking', thinking: '', signature: 'sig' },
          { type: 'text', text: AI_TEXT },
        ],
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 120, output_tokens: 40 },
      });
    }

    if (req.method === 'GET' && url.pathname === '/v1/search') return json(200, { results: [{ name: 'Ravello', latitude: 40.649, longitude: 14.611 }] });
    if (req.method === 'GET' && url.pathname === '/v1/forecast')
      return json(200, { daily: { weather_code: [1], temperature_2m_max: [27.4], temperature_2m_min: [18.2], precipitation_probability_max: [10] } });

    res.writeHead(404, { 'content-type': 'application/json' });
    res.end('{}');
  });

  return new Promise((resolve) =>
    server.listen(port, '127.0.0.1', () =>
      resolve({
        sessions,
        requests,
        markPaid(id) {
          const s = sessions.get(id);
          s.status = 'complete';
          s.payment_status = 'paid';
          return s;
        },
        close: () => new Promise((r) => server.close(r)),
      }),
    ),
  );
}

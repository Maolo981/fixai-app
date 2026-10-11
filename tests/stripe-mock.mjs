// A tiny fake of the Stripe API used by the end-to-end tests:
//   POST /v1/checkout/sessions      -> creates a session, url points to /pay/<id>
//   GET  /v1/checkout/sessions/<id> -> returns it
//   GET  /pay/<id>                  -> "pays" and redirects to success_url (like Stripe Checkout)
import http from 'node:http';

export function startStripeMock(port = 12111) {
  const sessions = new Map();
  const requests = [];
  let counter = 0;

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    let body = '';
    for await (const chunk of req) body += chunk;
    requests.push({ method: req.method, path: url.pathname, body, auth: req.headers.authorization });

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

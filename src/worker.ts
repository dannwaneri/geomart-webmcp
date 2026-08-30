export interface Env {
  ASSETS: Fetcher;
  geomart_db: D1Database;
  TURNSTILE_SECRET_KEY: string;
}

interface QuoteRequestBody {
  product_id: string;
  reasoning_text: string;
  turnstile_token: string;
}

async function verifyTurnstile(token: string, secret: string, ip: string | null, expectedHostname: string): Promise<boolean> {
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) }),
  });
  const result = (await res.json()) as { success: boolean; hostname?: string };
  // The widget is already scoped to this hostname in the Turnstile dashboard,
  // so a token could not have been minted elsewhere -- this is a second,
  // defense-in-depth check against the response Cloudflare itself reports,
  // in case the widget's allowed domains are ever loosened later.
  return result.success === true && result.hostname === expectedHostname;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Catalog browsing: ordinary REST, allowed to duplicate nothing but a
    // plain product list/detail. No fit-scoring, mismatch, brief, tray, or
    // quote-drafting logic lives here or anywhere else in this Worker.
    if (url.pathname === '/api/products' && request.method === 'GET') {
      const { results } = await env.geomart_db.prepare('SELECT * FROM products').all();
      return json(results);
    }

    const productDetailMatch = url.pathname.match(/^\/api\/products\/([^/]+)$/);
    if (productDetailMatch && request.method === 'GET') {
      const row = await env.geomart_db
        .prepare('SELECT * FROM products WHERE id = ?')
        .bind(productDetailMatch[1])
        .first();
      if (!row) return json({ error: 'not_found' }, 404);
      return json(row);
    }

    // The ONLY write path for a quote request. Deliberately NOT a tool and
    // NOT invoked from any tool's execute() handler -- only a plain DOM
    // button click in the browser calls this, after a human has reviewed
    // the drafted justification text. This is the human-in-the-loop gate.
    //
    // The Origin check blocks a request that never touches a browser at
    // all, but Origin is public information (this repo is open source), so
    // it alone doesn't stop an informed script from setting it correctly --
    // confirmed by an adversarial retest. The Turnstile check is what
    // actually closes that gap: the secret needed to produce a valid token
    // never appears in this repo or the client bundle, so a script reading
    // the source has nothing to derive a token from.
    if (url.pathname === '/api/quotes' && request.method === 'POST') {
      const origin = request.headers.get('origin');
      if (origin !== url.origin) {
        return json({ error: 'forbidden' }, 403);
      }

      const body = (await request.json()) as QuoteRequestBody;
      if (!body.product_id || !body.reasoning_text || !body.turnstile_token) {
        return json({ error: 'product_id, reasoning_text, and turnstile_token are required' }, 400);
      }

      const verified = await verifyTurnstile(body.turnstile_token, env.TURNSTILE_SECRET_KEY, request.headers.get('cf-connecting-ip'), url.hostname);
      if (!verified) {
        return json({ error: 'turnstile verification failed' }, 403);
      }

      const product = await env.geomart_db.prepare('SELECT id FROM products WHERE id = ?').bind(body.product_id).first();
      if (!product) {
        return json({ error: 'unknown product_id' }, 400);
      }

      const result = await env.geomart_db
        .prepare('INSERT INTO quotes (product_id, reasoning_text, created_at) VALUES (?, ?, ?) RETURNING id')
        .bind(body.product_id, body.reasoning_text, new Date().toISOString())
        .first();
      return json({ id: result?.id, status: 'submitted' }, 201);
    }

    return env.ASSETS.fetch(request);
  },
};

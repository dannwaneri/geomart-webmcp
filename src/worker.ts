export interface Env {
  ASSETS: Fetcher;
  geomart_db: D1Database;
}

interface QuoteRequestBody {
  product_id: string;
  reasoning_text: string;
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
    if (url.pathname === '/api/quotes' && request.method === 'POST') {
      const body = (await request.json()) as QuoteRequestBody;
      if (!body.product_id || !body.reasoning_text) {
        return json({ error: 'product_id and reasoning_text are required' }, 400);
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

// Vercel serverless function: POST /api/contribute
// Saves a proposed contribution (and/or a founding-signatory signup) to Supabase
// for human review. Nothing here edits the canon — it only records a proposal.
//
// Required env vars:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    res.status(503).json({ error: 'storage not connected' }); return;
  }
  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body || '{}');

    const table = body.kind === 'signatory' ? 'contributors' : 'contributions';
    const row = body.kind === 'signatory'
      ? { display_name: body.name, email: body.email, tier: 'signatory', public_optin: !!body.public }
      : {
          contributor_name: body.name || null,
          contributor_email: body.email || null,
          type: body.type || 'new',
          title: body.title || null,
          proposal_text: body.proposal || null,
          rationale: body.rationale || null,
          target_doc: body.doc || null,
          status: 'pending'
        };

    const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(row)
    });

    if (!r.ok) { const t = await r.text(); res.status(502).json({ error: 'save failed', detail: t.slice(0, 200) }); return; }
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'server error' });
  }
};

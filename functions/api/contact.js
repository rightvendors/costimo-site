/**
 * Cloudflare Pages Function — POST /api/contact
 * Sends an enquiry email via Resend to admin@costimo.ai
 *
 * Required env var (set in Cloudflare Pages → Settings → Environment variables):
 *   RESEND_API_KEY  — your Resend API key
 *
 * IMPORTANT: The "from" address uses costimo.ai domain.
 * You must verify costimo.ai in your Resend dashboard → Domains
 * before this will work. Until verified, change the from address to:
 *   from: 'COSTiMO <onboarding@resend.dev>'
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  /* CORS for local dev */
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  try {
    const body = await request.json();
    const { name, email, company, phone, message, interest } = body;

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers });
    }

    const subject = `[COSTiMO] ${interest || 'New enquiry'} — ${name}`;

    const emailHtml = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F3F5F8;font-family:'Inter',Arial,sans-serif">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #D8DFE8">
  <div style="background:#0B1F3B;padding:28px 32px">
    <p style="color:#C6A75E;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin:0 0 6px">New enquiry from costimo.ai</p>
    <h1 style="color:#fff;font-size:20px;font-weight:800;margin:0">${interest || 'General enquiry'}</h1>
  </div>
  <div style="padding:28px 32px">
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:10px 0;border-bottom:1px solid #ECF0F5;color:#62707F;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;width:110px">Name</td><td style="padding:10px 0;border-bottom:1px solid #ECF0F5;color:#0B1F3B;font-size:14px;font-weight:600">${escHtml(name)}</td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid #ECF0F5;color:#62707F;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase">Email</td><td style="padding:10px 0;border-bottom:1px solid #ECF0F5;font-size:14px"><a href="mailto:${escHtml(email)}" style="color:#C6A75E;font-weight:600">${escHtml(email)}</a></td></tr>
      ${company ? `<tr><td style="padding:10px 0;border-bottom:1px solid #ECF0F5;color:#62707F;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase">Company</td><td style="padding:10px 0;border-bottom:1px solid #ECF0F5;color:#0B1F3B;font-size:14px;font-weight:600">${escHtml(company)}</td></tr>` : ''}
      ${phone ? `<tr><td style="padding:10px 0;border-bottom:1px solid #ECF0F5;color:#62707F;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase">Phone</td><td style="padding:10px 0;border-bottom:1px solid #ECF0F5;color:#0B1F3B;font-size:14px;font-weight:600">${escHtml(phone)}</td></tr>` : ''}
    </table>
    <div style="margin-top:20px;padding:18px 20px;background:#F3F5F8;border-radius:10px;border-left:3px solid #C6A75E">
      <p style="color:#62707F;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin:0 0 8px">Message</p>
      <p style="color:#1F2937;font-size:14px;line-height:1.65;margin:0;white-space:pre-wrap">${escHtml(message)}</p>
    </div>
  </div>
  <div style="padding:16px 32px;background:#F3F5F8;border-top:1px solid #ECF0F5">
    <p style="color:#94A3B8;font-size:11.5px;margin:0">Sent from costimo.ai contact form · ${new Date().toUTCString()}</p>
  </div>
</div>
</body>
</html>`;

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'COSTiMO Website <noreply@costimo.ai>',
        to: ['admin@costimo.ai'],
        reply_to: email,
        subject,
        html: emailHtml,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error('Resend error:', errText);
      return new Response(JSON.stringify({ error: 'Email delivery failed' }), { status: 502, headers });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers });

  } catch (err) {
    console.error('Contact function error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

import nodemailer from 'nodemailer';

// If using Gmail SMTP:
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD, // The 16-char app password we discussed earlier
  },
});

export async function sendLeadDigestEmail(
  to: string,
  agentName: string,
  totalLeads: number,
  leadsThisWeek: number
) {
  if (!process.env.GMAIL_USER) {
    console.log(`[Email Mock] Would send to ${to}: ${leadsThisWeek} leads this week.`);
    return;
  }

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #0a5cff;">HavenFinder</h2>
      <p>Hi ${agentName},</p>
      <p>Here is your weekly lead update for your property listings:</p>
      <div style="background: #f1f5f9; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
        <h1 style="margin: 0; color: #0f172a; font-size: 48px;">${leadsThisWeek}</h1>
        <p style="margin: 5px 0 0; color: #64748b;">New leads this week</p>
      </div>
      <p>You have <strong>${totalLeads} total leads</strong> across all your listings.</p>
      <p>Log in to your dashboard to see exactly which properties are getting the most attention and to respond to inquiries.</p>
      <a href="https://dist-black-six-60.vercel.app/my-listings" style="display: inline-block; background: #0a5cff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px;">View My Dashboard</a>
      <p style="margin-top: 40px; font-size: 12px; color: #94a3b8;">
        You are receiving this because you have an active listing on HavenFinder.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: '"HavenFinder" <' + process.env.GMAIL_USER + '>',
    to,
    subject: `📈 You got ${leadsThisWeek} new leads this week on HavenFinder`,
    html,
  });
}

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

try {
  const info = await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: process.env.GMAIL_USER, // Sending to yourself
    subject: "Test Email from HavenFinder",
    text: "If you see this, your Gmail App Password works perfectly!",
  });
  console.log("✅ Email sent successfully!");
  console.log(info.response);
} catch (error) {
  console.error("❌ Error sending email:", error.message);
}

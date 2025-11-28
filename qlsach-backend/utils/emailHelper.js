const nodemailer = require("nodemailer");

// Simple email helper using SMTP (compatible with Gmail App Password)
// Config via environment variables:
// SMTP_HOST, SMTP_PORT, SMTP_SECURE (true/false), SMTP_USER, SMTP_PASS, FROM_EMAIL

const getTransporter = () => {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = (process.env.SMTP_SECURE || "true") === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error(
      "SMTP_USER and SMTP_PASS must be configured in environment"
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
};

const sendEmail = async (opts) => {
  const transporter = getTransporter();
  const from = process.env.FROM_EMAIL || process.env.SMTP_USER;
  const mail = {
    from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  };
  return transporter.sendMail(mail);
};

const sendResetEmail = async ({ to, username, resetUrl }) => {
  const subject = "Password reset request";
  const text = `Hello ${username},\n\nYou requested to reset your password. Click the link below to set a new password (link expires in 1 hour):\n\n${resetUrl}\n\nIf you didn't request this, ignore this email.`;
  const html = `<p>Hello ${username},</p>
    <p>You requested to reset your password. Click the link below to set a new password (link expires in 1 hour):</p>
    <p><a href="${resetUrl}">Reset your password</a></p>
    <p>If you didn't request this, ignore this email.</p>`;

  return sendEmail({ to, subject, text, html });
};

module.exports = { sendEmail, sendResetEmail };

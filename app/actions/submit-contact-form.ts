"use server";

import { writeClient } from "@/sanity/lib/serverClient";
import nodemailer from "nodemailer";

export async function submitContactForm(formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const subject = formData.get("subject") as string;
    const message = formData.get("message") as string;

    // Validate the required fields
    if (!name || !email || !message) {
      return {
        success: false,
        error: "Please fill in all required fields",
      };
    }

    if (!process.env.SANITY_SERVER_API_TOKEN) {
      return {
        success: false,
        error:
          "Server token missing. Please set SANITY_SERVER_API_TOKEN in .env.local.",
      };
    }

    // Create the document in Sanity
    const result = await writeClient.create({
      _type: "contact",
      name,
      email,
      subject,
      message,
      submittedAt: new Date().toISOString(),
      status: "new",
    });

    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = process.env.SMTP_PORT
      ? Number.parseInt(process.env.SMTP_PORT, 10)
      : 465;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const notifyTo = process.env.CONTACT_NOTIFY_TO || smtpUser;
    const fromEmail = process.env.CONTACT_FROM || smtpUser;

    if (smtpUser && smtpPass && notifyTo && fromEmail) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const safeSubject = subject?.trim() || "New contact form submission";
      const brandColor = process.env.CONTACT_BRAND_COLOR || "#2563eb";
      const safeMessage = (message || "").replace(/\n/g, "<br />");
      const replyUrl = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
        `Re: ${safeSubject}`,
      )}`;

      const emailHtml = `
        <div style="background:#f5f7fb;padding:24px;font-family:Arial, sans-serif;color:#0f172a;">
          <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
            <div style="background:${brandColor};padding:18px 24px;">
              <h2 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;">New Portfolio Inquiry</h2>
              <p style="margin:6px 0 0;color:#e2e8f0;font-size:12px;">You received a new contact form message.</p>
            </div>
            <div style="padding:20px 24px;">
              <div style="margin-bottom:16px;">
                <p style="margin:0 0 6px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.08em;">From</p>
                <p style="margin:0;font-size:15px;font-weight:600;">${name}</p>
                <p style="margin:4px 0 0;font-size:13px;color:#475569;">${email}</p>
              </div>
              <div style="margin-bottom:16px;">
                <p style="margin:0 0 6px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.08em;">Subject</p>
                <p style="margin:0;font-size:15px;font-weight:600;">${safeSubject}</p>
              </div>
              <div style="margin-bottom:20px;">
                <p style="margin:0 0 6px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.08em;">Message</p>
                <p style="margin:0;font-size:14px;line-height:1.6;color:#0f172a;">${safeMessage}</p>
              </div>
              <div style="display:flex;gap:12px;flex-wrap:wrap;">
                <a href="${replyUrl}" style="background:${brandColor};color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:999px;font-size:13px;font-weight:600;">Reply via Email</a>
                <a href="https://mail.google.com/mail/u/0/#inbox" style="background:#0f172a;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:999px;font-size:13px;font-weight:600;">Open Inbox</a>
              </div>
            </div>
            <div style="padding:14px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b;">
              Sent by your portfolio contact form.
            </div>
          </div>
        </div>
      `;

      await transporter.sendMail({
        from: `Portfolio Contact <${fromEmail}>`,
        to: notifyTo,
        replyTo: email,
        subject: `[Portfolio] ${safeSubject}`,
        text: `Name: ${name}\nEmail: ${email}\nSubject: ${safeSubject}\n\n${message}`,
        html: emailHtml,
      });
    }

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Error submitting contact form:", error);
    return {
      success: false,
      error: "Failed to submit the form. Please try again later.",
    };
  }
}

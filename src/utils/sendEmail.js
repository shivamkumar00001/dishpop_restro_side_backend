const nodemailer = require("nodemailer");

const sendEmail = async ({ email, subject, message, html }) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_MAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"DineAR App" <${process.env.SMTP_MAIL}>`,
      to: email,
      subject,
      html: html || message, // ❤️ NOW BOTH WORK
      text: message || "",   // fallback text
    });
  } catch (err) {
    console.error("Error sending email:", err);
    throw new Error("Email could not be sent");
  }
};

module.exports = sendEmail;

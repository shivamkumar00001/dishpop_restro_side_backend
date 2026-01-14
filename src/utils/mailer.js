const nodemailer = require("nodemailer");

const sendMail = async ({ subject, text }) => {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.DISHPOP_EMAIL,
      pass: process.env.DISHPOP_EMAIL_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: `"Dishpop AR" <${process.env.DISHPOP_EMAIL}>`,
    to: process.env.DISHPOP_EMAIL,
    subject,
    text,
  });
};

module.exports = { sendMail };

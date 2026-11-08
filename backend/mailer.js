const nodemailer = require('nodemailer');

// Mail settings come from environment variables (see .env.example).
// If SMTP_HOST is not set, fall back to an Ethereal test inbox so the app
// still works in development. Nothing is delivered to real addresses then.
let transporter;
let mailFrom = process.env.MAIL_FROM || '"Student Registration System" <admin@outr.ac.in>';

async function initMailer() {
    try {
        if (process.env.SMTP_HOST) {
            transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: Number(process.env.SMTP_PORT) || 587,
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });
            console.log('Mailer ready (SMTP).');
        } else {
            const testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: { user: testAccount.user, pass: testAccount.pass },
            });
            console.log('Mailer ready (Ethereal test inbox, emails are not delivered).');
        }
    } catch (err) {
        console.error('Mailer could not start, emails are disabled:', err.message);
    }
}

initMailer();

async function sendEmail(to, subject, text) {
    if (!transporter) {
        console.error("Mailer is not initialized yet");
        return;
    }

    try {
        let info = await transporter.sendMail({
            from: mailFrom,
            to: to, // list of receivers
            subject: subject, 
            text: text, 
            html: `<p>${text}</p>`, // html body
        });

        console.log('Message sent: %s', info.messageId);
        // Only returns a URL when sending through an Ethereal test account
        const preview = nodemailer.getTestMessageUrl(info);
        if (preview) console.log('Preview URL: %s', preview);
    } catch (err) {
        console.error("Error sending email:", err);
    }
}

module.exports = { sendEmail };

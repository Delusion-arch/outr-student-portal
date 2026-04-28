const nodemailer = require('nodemailer');

// For local testing, we use Ethereal Email which generates a fake inbox.
// When you deploy to production, replace these credentials with a real SMTP service (e.g., Gmail, SendGrid)
let transporter;

async function initMailer() {
    // Generate a test account if no real credentials are provided
    let testAccount = await nodemailer.createTestAccount();

    transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: testAccount.user, // generated ethereal user
            pass: testAccount.pass, // generated ethereal password
        },
    });
    
    console.log("Mailer initialized with Ethereal Email for testing.");
    console.log("Email User:", testAccount.user);
    console.log("Email Pass:", testAccount.pass);
}

initMailer();

async function sendEmail(to, subject, text) {
    if (!transporter) {
        console.error("Mailer is not initialized yet");
        return;
    }

    try {
        let info = await transporter.sendMail({
            from: '"Student Registration System" <admin@outr.ac.in>', 
            to: to, // list of receivers
            subject: subject, 
            text: text, 
            html: `<p>${text}</p>`, // html body
        });

        console.log("Message sent: %s", info.messageId);
        // Preview only available when sending through an Ethereal account
        console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    } catch (err) {
        console.error("Error sending email:", err);
    }
}

module.exports = { sendEmail };

import nodemailer from "nodemailer";

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("Missing EMAIL_USER or EMAIL_PASS");
}

export const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});



async function sendMail(to: string, subject: string, text: string) {
    if (!to) return;

    await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject,
        text,
    });
}

export async function sendDownEmail(endpoint: any, error: string) {
    await sendMail(
        endpoint.email,
        `🔴 SERVICE DOWN: ${endpoint.url}`,
        `Service: ${endpoint.url}\n\nError: ${error}\n\nTime: ${new Date().toISOString()}`
    );
}

export async function sendRecoveryEmail(endpoint: any, downtimeMs: number) {
    const seconds = (downtimeMs / 1000).toFixed(1);

    await sendMail(
        endpoint.email,
        `🟢 SERVICE RECOVERED: ${endpoint.url}`,
        `Service: ${endpoint.url}\n\nDowntime: ${seconds} seconds\n\nRecovered at: ${new Date().toISOString()}`
    );
}

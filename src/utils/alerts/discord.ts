import axios from "axios";

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

async function sendDiscord(payload: any) {
    if (!WEBHOOK_URL) {
        console.error("DISCORD_WEBHOOK_URL not set");
        return;
    }

    try {
        await axios.post(WEBHOOK_URL, payload);
    } catch (err: any) {
        console.error("Discord alert failed:", err.message);
    }
}

export async function sendDownAlert(endpoint: any, error: string) {
    const payload = {
        embeds: [
            {
                title: "🔴 SERVICE DOWN",
                description:
                    `**Service:** ${endpoint.name ?? endpoint.url}\n` +
                    `**URL:** ${endpoint.url}\n` +
                    `**Error:** ${error ?? "Unknown error"}`,
                color: 0xff0000,
                timestamp: new Date().toISOString(),
            },
        ],
    };

    await sendDiscord(payload);
}

export async function sendRecoveryAlert(endpoint: any, downtimeMs: number) {
    const seconds = (downtimeMs / 1000).toFixed(1);
    const payload = {
        embeds: [
            {
                title: "🟢 SERVICE RECOVERED",
                description:
                    `**Service:** ${endpoint.name ?? endpoint.url}\n` +
                    `**URL:** ${endpoint.url}\n` +
                    `**Downtime:** ${seconds} seconds`,
                color: 0x00ff00,
                timestamp: new Date().toISOString(),
            },
        ],
    };

    await sendDiscord(payload);
}

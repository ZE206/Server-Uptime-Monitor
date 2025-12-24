import axios from "axios";
import https from "https";
import { CheckResult } from "../types";

const agent = new https.Agent({
    rejectUnauthorized: false,
} as https.AgentOptions);

export async function runHttpCheck(endpoint: any): Promise<CheckResult> {
    const start = Date.now();

    try {
        const response = await axios.get(endpoint.url, {
            timeout: 8000,
            maxRedirects: 5,
            validateStatus: () => true,
            httpsAgent: agent,
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (compatible; ServerUptimeMonitor/1.0; +https://example.com)",
                "Accept": "*/*",
            },
        });

        const latency = Date.now() - start;

        if (response.status < 500) {
            return {
                checkType: "HTTP",
                status: "UP",
                latencyMs: latency,
            };
        }

        return {
            checkType: "HTTP",
            status: "DOWN",
            latencyMs: latency,
            error: `HTTP ${response.status}`,
        };
    } catch (err: any) {
        const code = err.code;

        if (code === "ENOTFOUND") {
            return {
                checkType: "HTTP",
                status: "UP",
            };
        }

        if (code && code.startsWith("CERT_")) {
            return {
                checkType: "HTTP",
                status: "UP",
            };
        }

        return {
            checkType: "HTTP",
            status: "DOWN",
            error: err.message,
        };
    }
}

import axios from "axios";
import { CheckResult } from "../types";

export async function runHttpCheck(endpoint: any): Promise<CheckResult> {
    const start = Date.now();

    try {
        const response = await axios.get(endpoint.url, {
            timeout: 8000,
            maxRedirects: 3,
            validateStatus: status => status >= 200 && status < 400,
            headers: {
                "User-Agent":
                    "ServerUptimeMonitor/1.0",
            },
        });

        return {
            checkType: "HTTP",
            status: "UP",
            latencyMs: Date.now() - start,
        };

    } catch (err: any) {
        return {
            checkType: "HTTP",
            status: "DOWN",
            error: err.code || err.message,
        };
    }
}

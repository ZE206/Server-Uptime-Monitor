import axios from "axios";
import { CheckResult } from "../types";


export async function runHttpCheck(endpoint: any): Promise<CheckResult> {
    const url = endpoint.url;
    const start = Date.now();
    try {
        const response = await axios.get(url, { timeout: 5000, validateStatus: () => true });
        const latency = Date.now() - start;
        if (response.status>=200 && response.status < 400) {
            return {
                checkType: "HTTP",
                status: "UP",
                latencyMs: latency
            };
        }
        return {
            checkType: "HTTP",
            status: "DOWN",
            latencyMs: latency,
            error: `HTTP status ${response.status}`
        };

    } catch (err: any) {

        return {
            checkType: "HTTP",
            status: "DOWN",
            error: err.message
        };
    }
}
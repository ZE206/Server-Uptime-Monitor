export interface CheckResult {
    checkType: "HTTP" | "DNS" | "SSL" | "PING";
    status: "UP" | "DOWN";
    latencyMs?: number;
    error?: string;
    resolvedIp?: string;
    sslExpiryDate?: Date;
}

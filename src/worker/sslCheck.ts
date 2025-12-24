const tls = require("tls");

import { CheckResult } from "../types";

export async function runSslCheck(endpoint: any): Promise<CheckResult> {
    const url = new URL(endpoint.url);
    const host = url.hostname;
    const port = url.port ? Number(url.port) : 443;

    return new Promise((resolve) => {
        const socket = tls.connect(
            {
                host,
                port,
                servername: host,
                rejectUnauthorized: false,
            },
            () => {
                const cert = socket.getPeerCertificate();
                socket.end();

                if (!cert || !cert.valid_to) {
                    resolve({
                        checkType: "SSL",
                        status: "DOWN",
                        error: "NO_CERT",
                    });
                    return;
                }

                const expiry = new Date(cert.valid_to);
                const now = new Date();

                if (expiry < now) {
                    resolve({
                        checkType: "SSL",
                        status: "DOWN",
                        error: "CERT_EXPIRED",
                        sslExpiryDate: expiry,
                    });
                    return;
                }

                resolve({
                    checkType: "SSL",
                    status: "UP",
                    sslExpiryDate: expiry,
                });
            }
        );

        socket.on("error", (err: Error) => {
            resolve({
                checkType: "SSL",
                status: "DOWN",
                error: err.message,
            });
        });
    });
}

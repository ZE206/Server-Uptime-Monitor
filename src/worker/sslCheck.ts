import tls from "tls";
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
                try {
                    const cert = socket.getPeerCertificate();

                    if (!cert || !cert.valid_to) {
                        socket.destroy();
                        resolve({
                            checkType: "SSL",
                            status: "DOWN",
                            error: "NO_CERTIFICATE",
                        });
                        return;
                    }

                    const expiryDate = new Date(cert.valid_to);
                    const now = new Date();

                    socket.destroy();

                    if (expiryDate > now) {
                        resolve({
                            checkType: "SSL",
                            status: "UP",
                            sslExpiryDate: expiryDate,
                        });
                    } else {
                        resolve({
                            checkType: "SSL",
                            status: "DOWN",
                            error: "SSL_EXPIRED",
                        });
                    }
                } catch (err: any) {
                    socket.destroy();
                    resolve({
                        checkType: "SSL",
                        status: "DOWN",
                        error: err.message,
                    });
                }
            }
        );

        socket.on("error", (err) => {
            socket.destroy();
            resolve({
                checkType: "SSL",
                status: "DOWN",
                error: err.message,
            });
        });
    });
}

console.log("WORKER BOOTED AT", new Date().toISOString());

import { prisma } from "../db/client";
import { runDnsCheck } from "../worker/dnsCheck";
import { runSslCheck } from "../worker/sslCheck";
import { runHttpCheck } from "../worker/httpCheck";
import { handleStateTransition } from "../utils/stateMachine";

const CHECK_INTERVAL_MS = 30_000;
async function waitForDb() {
    while (true) {
        try {
            await prisma.$queryRaw`SELECT 1`;
            console.log("DB ready");
            return;
        } catch {
            console.log("Waiting for DB...");
            await new Promise(r => setTimeout(r, 2000));
        }
    }
}

async function runWorker() {
    await waitForDb();
    console.log("Worker started...");

    while (true) {
        const endpoints = await prisma.endpoint.findMany();

        for (const endpoint of endpoints) {
            try {
                // 1. DNS CHECK
                const dnsResult = await runDnsCheck(endpoint);
                await prisma.check.create({
                    data: {
                        endpointId: endpoint.id,
                        checkType: dnsResult.checkType,
                        status: dnsResult.status,
                        latencyMs: null,
                        error: dnsResult.error ?? null,
                        resolvedIp: dnsResult.resolvedIp ?? null,
                        sslExpiryDate: null,
                        checkedAt: new Date(),
                    },
                });

                // 2. SSL CHECK
                const sslResult = await runSslCheck(endpoint);
                await prisma.check.create({
                    data: {
                        endpointId: endpoint.id,
                        checkType: sslResult.checkType,
                        status: sslResult.status,
                        latencyMs: null,
                        error: sslResult.error ?? null,
                        resolvedIp: null,
                        sslExpiryDate: sslResult.sslExpiryDate ?? null,
                        checkedAt: new Date(),
                    },
                });

                // 3. HTTP CHECK
                const httpResult = await runHttpCheck(endpoint);
                await prisma.check.create({
                    data: {
                        endpointId: endpoint.id,
                        checkType: httpResult.checkType,
                        status: httpResult.status,
                        latencyMs: httpResult.latencyMs ?? null,
                        error: httpResult.error ?? null,
                        resolvedIp: null,
                        sslExpiryDate: null,
                        checkedAt: new Date(),
                    },
                });

                // 4. STATE MACHINE (HTTP ONLY)
                await handleStateTransition(endpoint, httpResult);

            } catch (err: any) {
                console.error(`Worker error on endpoint ${endpoint.id}:`, err);
            }
        }

        // Sleep before next cycle
        await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL_MS));
    }
}

runWorker().catch(err => {
    console.error("Worker crashed:", err);
    process.exit(1);
});

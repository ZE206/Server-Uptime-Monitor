import { prisma } from "../db/client";
import { runHttpCheck } from "../worker/httpCheck";
import { runDnsCheck } from "./dnsCheck";
import { handleStateTransition } from "../utils/stateMachine";

const CHECK_INTERVAL_MS = 30_000;

async function runWorker() {
    console.log("Worker started...");

    while (true) {
        const endpoints = await prisma.endpoint.findMany();

        for (const endpoint of endpoints) {
            try {
                const dnsResult = await runDnsCheck(endpoint);

                await prisma.check.create({
                    data: {
                        endpointId: endpoint.id,
                        checkType: dnsResult.checkType,
                        status: dnsResult.status,
                        latencyMs: dnsResult.latencyMs ?? null,
                        error: dnsResult.error ?? null,
                        resolvedIp: dnsResult.resolvedIp ?? null,
                        sslExpiryDate: null,
                        checkedAt: new Date(),
                    },
                });

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

                await handleStateTransition(endpoint, httpResult);

            } catch (err: any) {
                console.error(`Worker error on endpoint ${endpoint.id}:`, err);
            }
        }

        await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL_MS));
    }
}

runWorker().catch(err => {
    console.error("Worker crashed:", err);
    process.exit(1);
});

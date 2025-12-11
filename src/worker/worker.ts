import { prisma } from "../db/client";
import { runHttpCheck } from "../worker/httpCheck";
import { handleStateTransition } from "../utils/stateMachine";

const CHECK_INTERVAL_MS = 30_000;

async function runWorker() {
    console.log("Worker started...");

    while (true) {
        const endpoints = await prisma.endpoint.findMany();

        for (const endpoint of endpoints) {
            try {
                const result = await runHttpCheck(endpoint);

                await prisma.check.create({
                    data: {
                        endpointId: endpoint.id,
                        checkType: result.checkType,
                        status: result.status,
                        latencyMs: result.latencyMs ?? null,
                        error: result.error ?? null,
                        resolvedIp: result.resolvedIp ?? null,
                        sslExpiryDate: result.sslExpiryDate ?? null,
                        checkedAt: new Date(),
                    }
                });

                await handleStateTransition(endpoint, result);

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

import { prisma } from "../db/client";
import { CheckResult } from "../types";

const FAILURE_THRESHOLD = 3;

export async function handleStateTransition(endpoint: any, httpResult: CheckResult) {
    const isUp = httpResult.status === "UP";
    const isDown = httpResult.status === "DOWN";

    if (isUp) {
        await handleUpState(endpoint, httpResult);
        return;
    }

    if (isDown) {
        await handleDownState(endpoint, httpResult);
        return;
    }
}

async function handleUpState(endpoint: any, httpResult: CheckResult) {
    if (endpoint.currentStatus === "DOWN") {
        await closeIncident(endpoint.id);
        await sendRecoveryAlert(endpoint);
    }

    await prisma.endpoint.update({
        where: { id: endpoint.id },
        data: {
            currentStatus: "UP",
            failCount: 0,
        },
    });
}

async function handleDownState(endpoint: any, httpResult: CheckResult) {
    const newFailCount = endpoint.failCount + 1;

    if (newFailCount < FAILURE_THRESHOLD) {
        await prisma.endpoint.update({
            where: { id: endpoint.id },
            data: { failCount: newFailCount },
        });
        return;
    }

    if (newFailCount >= FAILURE_THRESHOLD && endpoint.currentStatus === "UP") {
        await startIncident(endpoint.id, httpResult);
        await sendDownAlert(endpoint, httpResult);

        await prisma.endpoint.update({
            where: { id: endpoint.id },
            data: {
                currentStatus: "DOWN",
                failCount: newFailCount,
            },
        });

        return;
    }

    if (endpoint.currentStatus === "DOWN") {
        await prisma.endpoint.update({
            where: { id: endpoint.id },
            data: { failCount: newFailCount },
        });
        return;
    }
}

async function startIncident(endpointId: number, httpResult: CheckResult) {
    await prisma.incident.create({
        data: {
            endpointId,
            downAt: new Date(),
            reason: httpResult.error ?? "Unknown error",
        },
    });
}

async function closeIncident(endpointId: number) {
    const incident = await prisma.incident.findFirst({
        where: { endpointId, upAt: null },
        orderBy: { downAt: "desc" },
    });

    if (!incident) return;

    await prisma.incident.update({
        where: { id: incident.id },
        data: { upAt: new Date() },
    });
}

async function sendDownAlert(endpoint: any, httpResult: CheckResult) {
    console.log(`ALERT: ${endpoint.url} is DOWN - ${httpResult.error}`);
}

async function sendRecoveryAlert(endpoint: any) {
    console.log(`ALERT: ${endpoint.url} has RECOVERED`);
}

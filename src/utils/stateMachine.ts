import { prisma } from "../db/client";
import { CheckResult } from "../types";
import { sendDownEmail, sendRecoveryEmail } from "./alerts/email";

/* SAFETY: alerts must never block worker */
async function safeAlert(fn: () => Promise<void>) {
    try {
        await Promise.race([
            fn(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Alert timeout")), 5000)
            )
        ]);
    } catch (err) {
        console.error("Alert failed:", err);
    }
}

const FAILURE_THRESHOLD = 3;

export async function handleStateTransition(
    endpoint: any,
    httpResult: CheckResult
) {
    const freshEndpoint = await prisma.endpoint.findUnique({
        where: { id: endpoint.id },
    });

    if (!freshEndpoint) return;

    console.log(
        "[STATE]",
        freshEndpoint.id,
        freshEndpoint.currentStatus,
        "→",
        httpResult.status,
        "failCount:",
        freshEndpoint.failCount
    );

    if (httpResult.status === "UP") {
        await handleUpState(freshEndpoint);
        return;
    }

    if (httpResult.status === "DOWN") {
        await handleDownState(freshEndpoint, httpResult);
    }
}

async function handleUpState(endpoint: any) {
    if (endpoint.currentStatus === "DOWN") {
        const downtimeMs = await closeIncident(endpoint.id);
        if (downtimeMs !== null) {
            await safeAlert(() =>
                sendRecoveryEmail(endpoint, downtimeMs)
            );
        }
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

    if (endpoint.currentStatus === "UP") {
        await startIncident(endpoint.id, httpResult.error);
        await safeAlert(() =>
            sendDownEmail(endpoint, httpResult.error ?? "Unknown error")
        );

        await prisma.endpoint.update({
            where: { id: endpoint.id },
            data: {
                currentStatus: "DOWN",
                failCount: newFailCount,
            },
        });
        return;
    }

    await prisma.endpoint.update({
        where: { id: endpoint.id },
        data: { failCount: newFailCount },
    });
}

async function startIncident(endpointId: number, reason?: string) {
    const existingIncident = await prisma.incident.findFirst({
        where: {
            endpointId,
            upAt: null,
        },
    });

    // If an incident is already open, do nothing
    if (existingIncident) return;

    await prisma.incident.create({
        data: {
            endpointId,
            downAt: new Date(),
            reason: reason ?? "Unknown error",
        },
    });
}


async function closeIncident(endpointId: number): Promise<number | null> {
    const incident = await prisma.incident.findFirst({
        where: {
            endpointId,
            upAt: null,
        },
        orderBy: {
            downAt: "desc",
        },
    });

    if (!incident) {
        console.warn(
            "No open incident found while trying to close incident for endpoint",
            endpointId
        );
        return null;
    }

    const resolvedAt = new Date();
    const downtimeMs =
        resolvedAt.getTime() - incident.downAt.getTime();

    await prisma.incident.update({
        where: { id: incident.id },
        data: { upAt: resolvedAt },
    });

    return downtimeMs;
}

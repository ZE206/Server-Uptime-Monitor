import { prisma } from "../db/client";

export async function calculateUptimePercentage(
    endpointId: number,
    from: Date,
    to: Date
) {
    const totalWindowMs = to.getTime() - from.getTime();
    if (totalWindowMs <= 0) return 100;

    const incidents = await prisma.incident.findMany({
        where: {
            endpointId,
            downAt: { lte: to },
            OR: [
                { upAt: { gte: from } },
                { upAt: null },
            ],
        },
    });

    let downtimeMs = 0;

    for (const incident of incidents) {
        const start = Math.max(incident.downAt.getTime(), from.getTime());
        const end = incident.upAt
            ? Math.min(incident.upAt.getTime(), to.getTime())
            : to.getTime();

        downtimeMs += Math.max(0, end - start);
    }

    const uptimeMs = totalWindowMs - downtimeMs;
    return Number(((uptimeMs / totalWindowMs) * 100).toFixed(2));
}

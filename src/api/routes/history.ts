import { Router } from "express";
import { prisma } from "../../db/client";

export const historyRouter = Router();

/**
 * Get recent checks for an endpoint
 * Example:
 * GET /history/checks/1?limit=100
 */
historyRouter.get("/checks/:endpointId", async (req, res) => {
    const endpointId = Number(req.params.endpointId);
    const limit = Number(req.query.limit) || 100;

    if (isNaN(endpointId)) {
        return res.status(400).json({ error: "Invalid endpointId" });
    }

    const checks = await prisma.check.findMany({
        where: { endpointId },
        orderBy: { checkedAt: "desc" },
        take: limit,
    });

    res.json(checks);
});

/**
 * Get incident history for an endpoint
 * Example:
 * GET /history/incidents/1
 */
historyRouter.get("/incidents/:endpointId", async (req, res) => {
    const endpointId = Number(req.params.endpointId);

    if (isNaN(endpointId)) {
        return res.status(400).json({ error: "Invalid endpointId" });
    }

    const incidents = await prisma.incident.findMany({
        where: { endpointId },
        orderBy: { downAt: "desc" },
    });

    res.json(incidents);
});

/**
 * Get total downtime (including LIVE downtime)
 * Example:
 * GET /history/downtime/1
 */
historyRouter.get("/downtime/:endpointId", async (req, res) => {
    const endpointId = Number(req.params.endpointId);

    if (isNaN(endpointId)) {
        return res.status(400).json({ error: "Invalid endpointId" });
    }

    const incidents = await prisma.incident.findMany({
        where: { endpointId },
        orderBy: { downAt: "asc" },
    });

    const now = Date.now();
    let totalDowntimeMs = 0;

    for (const incident of incidents) {
        if (incident.upAt) {
            // Closed incident
            totalDowntimeMs +=
                incident.upAt.getTime() - incident.downAt.getTime();
        } else {
            // LIVE incident (still DOWN)
            totalDowntimeMs +=
                now - incident.downAt.getTime();
        }
    }

    res.json({
        incidentCount: incidents.length,
        totalDowntimeMinutes: Number(
            (totalDowntimeMs / 60000).toFixed(2)
        ),
    });
});

import { calculateUptimePercentage } from "../../utils/uptime";

historyRouter.get("/uptime/:endpointId", async (req, res) => {
    const endpointId = Number(req.params.endpointId);
    const range = String(req.query.range || "24h");

    const now = new Date();
    let from: Date;

    if (range === "7d") {
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
        from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const uptime = await calculateUptimePercentage(endpointId, from, now);

    res.json({
        endpointId,
        range,
        uptimePercentage: uptime,
    });
});

historyRouter.get("/report/:endpointId", async (req, res) => {
    const endpointId = Number(req.params.endpointId);
    const range = String(req.query.range || "24h");

    const now = new Date();
    let from: Date;

    if (range === "7d") {
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
        from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }


    const incidents = await prisma.incident.findMany({
        where: {
            endpointId,
            downAt: { gte: from },
        },
    });

    let downtimeMs = 0;
    for (const i of incidents) {
        downtimeMs += i.upAt
            ? i.upAt.getTime() - i.downAt.getTime()
            : now.getTime() - i.downAt.getTime();
    }


    const checks = await prisma.check.findMany({
        where: {
            endpointId,
            checkType: "HTTP",
            checkedAt: { gte: from },
            latencyMs: { not: null },
        },
    });

    const avgLatency =
        checks.length === 0
            ? null
            : Math.round(
                checks.reduce((s, c) => s + (c.latencyMs || 0), 0) /
                checks.length
            );

    // Uptime
    const uptime = await calculateUptimePercentage(endpointId, from, now);

    res.json({
        endpointId,
        range,
        uptimePercentage: uptime,
        incidentCount: incidents.length,
        totalDowntimeMinutes: Number((downtimeMs / 60000).toFixed(2)),
        averageLatencyMs: avgLatency,
    });
});


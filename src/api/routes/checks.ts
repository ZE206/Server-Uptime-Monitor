import { Router, Request, Response } from "express";
import { prisma } from "../../db/client";

export const router = Router();

router.get("/:endpointId", async (req: Request, res: Response) => {
    try {
        const endpointId = Number(req.params.endpointId);;
        const limit = Number(req.query.limit) || 50;
        const page = Number(req.query.page) || 1;

        if (!Number.isInteger(endpointId)) {
            return res.status(400).json({ error: "Invalid endpoint id" });
        }

        if (limit < 1 || limit > 500) {
            return res.status(400).json({ error: "invalid limit (1-500 allowed)" });
        }

        const offset = (page - 1) * limit;

        const exist = await prisma.endpoint.findUnique({
            where: { id: endpointId },
            select: { id: true },
        });
        if (!exist) {
            return res.status(404).json({ error: "Endpoint not found" });
        }
        const checks = await prisma.check.findMany({
            where: { endpointId },
            orderBy: { checkedAt: "desc" },
            skip: offset,
            take: limit,
        });

        const total = await prisma.check.count({
            where: { endpointId },
        });

        return res.json({
            data: checks,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        console.error("GET /checks/:endpointId error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }


});
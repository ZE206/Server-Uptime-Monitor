import { Router, Request, Response } from "express";
import { prisma } from "../../db/client";
export const router = Router();

function isValidUrl(str: string): boolean {
    try {
        const newURL = new URL(str);
        return newURL.protocol === 'http:' || newURL.protocol === 'https:';
    } catch (err) {
        return false;
    }
}


function isValidEmail(e: unknown): e is string {
    if (typeof e !== "string") return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}


function normalizeInterval(x: any): number | null {
    const num = Number(x);
    if (!Number.isInteger(num)) return null;
    if (num < 5 || num > 86400) return null;
    return num;
}



router.post("/", async (req: Request, res: Response) => {
    try {
        const { url, intervalSeconds, email, webhookUrl } = req.body;

        if (!url || !intervalSeconds || !email) {
            return res.status(400).json({
                error: "Missing required fields. Required: url, intervalSeconds, emails",
            });

        }
        if (!isValidUrl(url)) {
            return res.status(400).json({ error: "Invalid url. Use https or http URL." });

        }

        const interval = normalizeInterval(intervalSeconds);
        if (interval === null) {
            return res.status(400).json({
                error: "Invalid intervalSeconds. Must be integer between 5 and 86400.",
            });
        }


        if (!isValidEmail(email)) {
            return res.status(400).json({ error: "Invalid email address." });
        }

        if (webhookUrl !== undefined && webhookUrl !== null) {
            if (!isValidUrl(webhookUrl)) {
                return res.status(400).json({ error: "Invalid webhookUrl. Use http(s)." });
            }
        }

        const existing = await prisma.endpoint.findFirst({
            where: { url, email },
        });

        if (existing) {
            res.status(400).json({
                error: "Endpoint for given URL exists already!",
                endpointId: existing.id,
            });
        }

        const endpoint = await prisma.endpoint.create({
            data: {
                url,
                intervalSeconds,
                email,
                webhookUrl: webhookUrl ?? null,
            }
        });
        return res.status(201).json({ data: endpoint });
    } catch (err) {
        console.error("POST /endpoints errror: ", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

router.get("/", async (_req: Request, res: Response) => {
    try {
        const list = await prisma.endpoint.findMany({
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                url: true,
                intervalSeconds: true,
                email: true,
                webhookUrl: true,
                currentStatus: true,
                failCount: true,
                lastCheckedAt: true,
                createdAt: true,
            }
        });
        res.json({ data: list });
    } catch (err) {
        console.error("GET /endpoints error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/:id", async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) {
            return res.status(400).json({ error: "Invalid id" });

        }
        const ep = await prisma.endpoint.findUnique({
            where: { id },
            include: {
                checks: { orderBy: { checkedAt: "desc" }, take: 20 },
                incidents: { orderBy: { downAt: "desc" }, take: 10 },
            },
        });
        if (!ep) return res.status(400).json({ error: "endpoint not found" });
        return res.json({ data: ep });
    } catch (err) {
        console.error("GET /endpoint/:id error", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});


router.delete("/:id", async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) {
            return res.status(400).json({ error: "invalid id" });
        }

        await prisma.check.deleteMany({ where: { endpointId: id } });
        await prisma.incident.deleteMany({ where: { endpointId: id } });
        await prisma.endpoint.delete({ where: { id } });

        return res.json({ ok: true });
    } catch (err) {
        console.error("DELETE /endpoints/:id error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});
import express from "express";
import cors from "cors";
import { router as endpointsRouter } from "./routes/endpoints";
import { router as checksRouter } from "./routes/checks";
import { router as incidentsRouter } from "./routes/incidents";
import { router as analyticsRouter } from "./routes/analytics";

const app = express();
app.use(express.json());
app.use(cors());

// Mount routes
app.get("/", (_req, res) => {
    res.json({
        message: "Uptime Monitor API running",
        routes: ["/endpoints", "/checks", "/incidents", "/analytics"]
    });

});

app.use("/endpoints", endpointsRouter);
app.use("/checks", checksRouter);
app.use("/incidents", incidentsRouter);
app.use("/analytics", analyticsRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
});

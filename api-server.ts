import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({ status: "API server running" });
});

app.listen(3000, () => {
    console.log("API Server on http://localhost:3000");
});

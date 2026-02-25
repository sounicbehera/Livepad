import express from "express";
import healthRouter from "./routes/health.js";
import rootRouter from "./routes/root.js";

const app = express();

app.use(express.json());

app.use("/", rootRouter);
app.use("/health", healthRouter);

export default app;

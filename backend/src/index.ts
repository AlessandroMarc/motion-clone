import express, { type Request, type Response } from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ message: "Backend is fucking running!" });
});

app.get("/api", (req: Request, res: Response) => {
  res.json({ message: "Welcome to the API" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;

import express from "express";
import dotenv from "dotenv";
import { seedDatabase } from "./db/seed";
import { AuthRouter, UserRouter, RoleRouter } from "./routes";
import cors from "cors";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

app.use("/api/v1/auth", AuthRouter);
app.use("/api/v1/users", UserRouter);
app.use("/api/v1/role", UserRouter);

async function startServer() {
  const PORT = process.env.PORT || 3000;

  try {
    // seedDatabase(); // Seed the database if needed do this only once
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error starting the server:", error);
    process.exit(1); // Exit the process with a failure code
  }
}

startServer();

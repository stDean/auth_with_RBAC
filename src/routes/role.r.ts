import { Router } from "express";
import { RoleCtrl } from "../controllers/role.c";
import { authenticateJWT } from "../middleware/admin.m";

const router = Router();

router.use(authenticateJWT);

export default router;

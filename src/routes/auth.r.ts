import { Router } from "express";
import { AuthCtrl } from "../controllers/auth.c";
import { authenticateJWT } from "../middleware/admin.m";

const router = Router();

router.post("/register", AuthCtrl.register);
router.post("/login", AuthCtrl.login);
router.post("/refresh-token", AuthCtrl.refreshToken);
router.post("/logout", AuthCtrl.logout);
router.get("/profile", authenticateJWT, AuthCtrl.getProfile);

export default router;

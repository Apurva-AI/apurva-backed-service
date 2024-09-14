import express from "express";
import userRoutes from "./user.route";
import authRoutes from "./auth.route";
import assetRoutes from "./asset-details.route";
import groupAssetRoutes from "./asset-group-details.route";
import enhancePromptRoutes from "./enhance-prompts.route";
import shortUrlRoutes from "./url-shortner.route";
import DriveLinkRoutes from "./drive-link.route";
import googleApisRoutes from "./google-api.route"
import WisdomRoutes from "./wisdom.route"
const router = express.Router(); // eslint-disable-line new-cap

/** GET /health-check - Check service health */
// router.get('/health-check', (req, res) => res.send('OK'));

// mount user routes at /users
router.use("/users", userRoutes);

// mount auth routes at /auth
router.use("/auth", authRoutes);

router.use("/asset", assetRoutes);

router.use("/group", groupAssetRoutes);

router.use("/enhance", enhancePromptRoutes);

router.use("/cn", shortUrlRoutes);

router.use("/drive-link", DriveLinkRoutes);

router.use("/googleapi", googleApisRoutes)

router.use("/wisdom", WisdomRoutes);

export default router;

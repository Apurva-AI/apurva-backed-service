import express from "express";
import { validate } from "express-validation";
import paramValidation from "../../config/param-validation";
import DriveLinkAssetDetailsController from "../controllers/drive-link-details.controller";
import driveLinkController from "../controllers/drive-link.controller";
var cron = require("node-cron");
const router = express.Router();


router.post('/verify-drive',validate(paramValidation.driveLinkAssetDetails), driveLinkController.verifyDrive);

router.post('/refresh-drive',validate(paramValidation.driveLinkAssetDetails), driveLinkController.refreshDrive);
router
  .route("/addDrivelink")
  .post(
    // validate(paramValidation.createDriveLinkAssetDetails),
    DriveLinkAssetDetailsController.createDriveLinkAssetDetails
  );
router
  .route("/getDriveLink/:user_id")
  .get(DriveLinkAssetDetailsController.getDriveLinkAssetDetails);

export default router;

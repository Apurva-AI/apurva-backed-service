import express from "express";
import { validate } from "express-validation";
import paramValidation from "../../config/param-validation";
import assetDetailsController from "../controllers/asset-details.controller";
import migrateData from "../helpers/migrateData";
import diyIngestion from '../controllers/diyIngestion';

var cron = require("node-cron");
const router = express.Router();

router.route("/upload").post(assetDetailsController.uploadInS3);
router.route("/delete").post(assetDetailsController.deleteFromAws);
router
  .route("/delete-file")
  .post(
    validate(paramValidation.updateDeleteColumn),
    assetDetailsController.updateDeleteColumn
  );
router
  .route("/addAsset")
  .post(
    validate(paramValidation.createAssetDetails),
    assetDetailsController.createAssetDetails
  );
router.route("/getAsset/:user_id").get(assetDetailsController.getAssetDetails);
router
  .route("/getOrgAssets/:group")
  .get(assetDetailsController.getAllAssetDetails);
router
  .route("/updateAsset/:id")
  .put(
    validate(paramValidation.updateAssetDetails),
    assetDetailsController.updateAssetDetails
  );

router.route("/updateDocId").put(assetDetailsController.updateDocIdForAssets);
router
  .route("/getOrgAssets/:group")
  .get(assetDetailsController.getAllAssetDetails);

router.route('/allowedFileTypes')
  .get(assetDetailsController.getAllowedFileTypes);
  
var AssetUploadCall = true;
var AssetStatusCall = true;
var telemetryStatusCall = true;

var driveLinkIngestionCall = true;

const job = cron.schedule(
  "* * * * *",
  async function () {
    try {
      if (AssetUploadCall) {
        AssetUploadCall = false;
        job.start();
        let status = await assetDetailsController.processUploadedAssets();
        console.log("Asset status cron status-", status);
        AssetUploadCall = true;
      } else {
        job.stop();
        console.log(
          "Asset previous job is in progress so this request will be executed in next slab"
        );
      }
    } catch (error) {
      console.log("ERROR OCCURED IN ASSET CRON");
      AssetUploadCall = true;
    }
  },
  {
    scheduled: true,
  }
);

const CJob = cron.schedule(
  "* * * * *",
  async function () {
    try {
      if (AssetStatusCall) {
        AssetStatusCall = false;
        CJob.start();
        let status = await assetDetailsController.checkInjestedAssets();
        console.log("process cron status-", status);
        AssetStatusCall = true;
      } else {
        CJob.stop();
        console.log(
          "process previous job is in progress so this request will be executed in next slab"
        );
      }
    } catch (error) {
      console.log("ERROR OCCURED IN PROCESS CHECK JOB", error);
      AssetStatusCall = true;
    }
  },
  {
    scheduled: true,
  }
);

const TJob = cron.schedule(
  "*/2 * * * *",
  async function () {
    try {
      if (telemetryStatusCall) {
        telemetryStatusCall = false;
        TJob.start();
        let status = await migrateData.getData();
        console.log("Telemetry cron status-", status);
        telemetryStatusCall = true;
      } else {
        TJob.stop();
        console.log(
          "Telemetry previous job is in progress so this request will be executed in next slab"
        );
      }
    } catch (error) {
      console.log("ERROR OCCURED IN TELEMETRY CHECK JOB", error);
      telemetryStatusCall = true;
    }
  },
  {
    scheduled: true,
  }
);

const DJob = cron.schedule('* * * * *', async function () {
  try {
    if (driveLinkIngestionCall) {
      driveLinkIngestionCall = false;
      DJob.start();
      let status = await diyIngestion.fetchDataFromDriveLink();
      console.log('Ingestion cron status-', status);
      driveLinkIngestionCall = true;
    }
    else {
      DJob.stop();
      console.log('process ingestion job is in progress so this request will be executed in next slab');
    }
  }
  catch (error) {
    console.log("ERROR OCCURED IN INGESTION JOB", error)
    driveLinkIngestionCall = true;
  }
}, {
  scheduled: true
});

export default router;
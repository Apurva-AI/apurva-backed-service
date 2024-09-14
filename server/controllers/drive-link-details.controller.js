import db from "../../config/sequelize";
import error from "../helpers/error";
import crypto from "crypto";
const { drive_link_asset_details } = db;

const createDriveLinkAssetDetails = async (req) => {
  try {
    const drivelinkAssets = {
      id: crypto.randomUUID(),
      user_id: req.user_id,
      user_name: req.user_name,
      drive_link: req.drive_link,
      status: "YTD",
      group_name: req.group_name,
      uningested_supported_files: req.uningested_supported_files,
      unsupported_files: req.unsupported_files,
      logs: req.logs
    };

    // Check if a record with the same unique constraint already exists and has a status of "FAILED"
    const existingRecord = await drive_link_asset_details.findOne({
      where: {
        // Assuming 'drive_link' is the unique field. Replace with actual unique field(s) if different.
        drive_link: req.drive_link,
        status: "FAILED"
      }
    });

    // If a failed record exists, update it instead of creating a new one
    let savedDetails;
    if (existingRecord) {
      savedDetails = await existingRecord.update({ ...drivelinkAssets });
    } else {
      const details = drive_link_asset_details.build(drivelinkAssets);
      savedDetails = await details.save();
    }

    return {
      message: "Successfully added new drive link",
      data: savedDetails
    };
  } catch (e) {
    if (e.name === "SequelizeUniqueConstraintError") {
      throw new Error("Unique constraint violation");
    } else {
      throw e;
    }
  }
};



function getDriveLinkAssetDetails(req, res, next) {
  drive_link_asset_details
    .findAll({
      where: {
        user_id: req.params.user_id,
      },
      order: [["createdAt", "DESC"]],
    })
    .then((detail) => {
      if (!detail) {
        const msg = error.InternalServerError;
        msg["msg"] = "There is some error!!";
        res.json(msg);
      } else {
        let msg = error.readSuccess;
        msg["msg"] = "Successful Operation";
        msg["data"] = detail;
        res.json(msg);
      }
    })
    .catch((e) => next(e));
}
export default {
  getDriveLinkAssetDetails,
  createDriveLinkAssetDetails
};

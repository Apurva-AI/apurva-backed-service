import db from "../../config/sequelize";
import error from "../helpers/error";
import crypto from "crypto";
import config from "../../config/config";

const { asset_details } = db;
const formidable = require("formidable");
const axios = require("axios");
import AWS from "aws-sdk";
const { Op } = require("sequelize");
const fs = require("fs");
const s3 = new AWS.S3({
  accessKeyId: config.AWS_ACCESS_KEY_ID,
  secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
  signatureVersion: "v4",
});
const allowedFileTypes = require('../helpers/utils');
const fetchAllFiles = config.FETCH_ALL_FILES_FROM_DRIVE === 'true';

async function upload(file, user_name) {
  let filename = file.file.originalFilename;
  let fileSplitArray = filename.split(".");
  let extension = "." + fileSplitArray[fileSplitArray.length - 1];
  var today = generateDatabaseDateTime(new Date());
  filename = fileSplitArray[0] + "-" + today + extension;
  // console.log('filename:',filename);

  const fileContent = fs.readFileSync(file.file.filepath);
  var params = {
    Bucket: config.AWS_BUCKET_NAME,
    Key: user_name + "/" + filename,
    Body: fileContent,
  };
  return new Promise((resolve, reject) => {
    s3.upload(params, (err, data) => {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });
}

function generateDatabaseDateTime(date) {
  const p = new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  })
    .formatToParts(date)
    .reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});

  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

function deleteImage(data) {
  const params = {
    Bucket: config.AWS_BUCKET_NAME,
    Key: data,
  };

  return new Promise((resolve, reject) => {
    s3.deleteObject(params, (err, data) => {
      if (err) {
        reject(err);
      } else if (data) {
        // console.log('delet data------',data);
        let success = "File has been deleted successfully";
        resolve(success);
      }
    });
  });
}

async function deleteFromAws(req, res) {
  // console.log(req.body);
  const { keys } = req.body;

  try {
    const deletionResponses = await Promise.all(
      keys.map((key) => deleteImage(key))
    );

    const successCount = deletionResponses.filter(
      (response) => response
    ).length;
    const errorCount = keys.length - successCount;

    if (errorCount === 0) {
      const successMsg = `All ${successCount} files have been deleted successfully`;
      res.json({ success: successMsg });
    } else {
      const errorMsg = `Failed to delete ${errorCount} files`;
      res.json({ error: errorMsg });
    }
  } catch (error) {
    const errorMsg = "There is some error while deleting the files";
    res.json({ error: errorMsg });
  }
}

function createAssetDetails(req, res, next) {
    const assets = req.body.assets;
  const savedAssets = [];
  let savedCount = 0;

  assets.forEach((asset) => {
    let buildAssetDetails = {
      id: crypto.randomUUID(),
      user_id: req.body.user_id,
      user_name: req.body.user_name,
      name: asset.name,
      url: asset.url,
      status: "Uploaded",
      category: asset.category,
      metadata: {
        // status: 'Uploaded',
        access: asset.metaData.Access,
        Channel: asset.metaData.Channel,
        date: asset.metaData.Date,
        Group: asset.metaData.Group,
        source_url:asset.metaData.Source
      },
    };
    buildAssetDetails.doc_id = `${buildAssetDetails.metadata.Group}_${buildAssetDetails.id}`;

    const details = asset_details.build(buildAssetDetails);
        details
      .save()
      .then((savedDetails) => {
        savedCount++;
        savedAssets.push(savedDetails.dataValues);
        if (savedCount === assets.length) {
          const msg = error.Success;
          msg["msg"] = "Successfully created new asset details";
          msg["payload"] = {
            data: savedAssets,
          };
                    res.json(msg);
        }
      })
      .catch((e) => next(console.log(e)));
  });
}

function getAssetDetails(req, res, next) {
  asset_details
    .findAll({
      where: {
        user_id: req.params.user_id,
        is_deleted: { [Op.or]: [false, null] },
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

function getAllAssetDetails(req, res, next) {
  asset_details
    .findAll({
      where: {
        is_deleted: { [Op.or]: [false, null] },
        metadata: {
          Group: req.params.group,
        },
      },
      order: [["createdAt", "DESC"]],
    })
    .then((detail) => {
      if (!detail) {
        const msg = error.InternalServerError;
        msg.msg = "There is some error!!";
        res.json(msg);
      } else {
        const msg = error.readSuccess;
        msg.msg = "Successful Operation";
        msg.data = detail;
        res.json(msg);
      }
    })
    .catch((e) => {
      next(e);
      console.log("error from all Asset api", e);
    });
}

function updateAssetDetails(req, res, next) {
  asset_details
    .findAll({ where: { id: req.params.id } })
    .then(function (getUpdatedData) {
      if (getUpdatedData != undefined) {
        asset_details
          .update(req.body, { where: { id: req.params.id } })
          .then((updatedData) => {
            if (updatedData) {
              const msg = error.readSuccess;
              msg["msg"] = "Successful Operation";
              console.log(msg);
              res.json(msg);
            } else {
              const msg = error.InternalServerError;
              msg["msg"] = "There is some error while updating!!";
              res.json(msg);
            }
          })
          .catch((e) => next(e));
      } else {
        res.json("User Id not found");
      }
    });
}

function updateDeleteColumn(req, res, next) {

  const fileId = req.body.file_id;
  const deleted_by = req.body.user_name;
  // console.log("asset id---------", doc_id);

  asset_details.findOne({ where: { id: fileId } }).then(function (asset) {

    //call an api before updating isDeleted column as true
    // console.log("assets---", asset);
    if (asset) {
      axios
        .post(
          config.DS_INGESTION_URL+"delete-document",
          { doc_id: asset.doc_id },
          {
            headers: {
              "content-type": "application/json",
            },
          }
        )
        .then((response) => {
          if (response.status === 200) {
            asset_details
              .update({ is_deleted: true ,deleted_by: deleted_by}, { where: { id: fileId } })
              .then((updatedData) => {
                if (updatedData) {
                  const msg = { message: "Asset marked as deleted." };
                  // console.log(msg);
                  res.json(msg);
                } else {
                  const msg = {
                    message:
                      "There was an error while marking the asset as deleted.",
                  };
                  res.status(500).json(msg);
                }
              })
              .catch((e) => next(e));
          } else {
            const msg = { message: "API request failed" };
            res.status(500).json(msg);
          }
        })
        .catch((apiError) => {
          const msg = { message: "API request failed" };
          res.status(500).json(msg);
        });
    } else {
      const msg = { message: "Asset not found." };
      res.status(404).json(msg);
    }
  });
}

async function uploadInS3(req, res, next) {
  // console.log('UUID-------------',req.query);
  const formFields = formidable();
  formFields.parse(req, async (err, fields, files) => {
    if (err) {
      res.json(err);
    }
    let filename = files.file.originalFilename;
    const FileURL = await upload(files, req.query.param2);
    let returnObj = {
      url: FileURL.Location,
      id: req.query.param1,
      key: FileURL.Key,
      // preview: previewBase64
    };
    res.json(returnObj);
  });
}

async function processUploadedAssets() {
  try {
    const queryOptions = {
      where: { status: "Uploaded" }
    }
    if(fetchAllFiles){
      queryOptions.limit = 20;
    }
    const uploadedAssets = asset_details
      .findAll(queryOptions)
      .then((uploadedAssets) => {
        uploadedAssets.forEach(async (asset) => {
          let uploadURL = config.DS_INGESTION_URL + "file/upload";
          if (asset.category == "Audio") {
            uploadURL = config.DS_INGESTION_URL + "audio/upload";
          } else if (asset.category == "Video") {
            uploadURL = config.DS_INGESTION_URL + "video/upload";
          } else if (asset.category == "Website") {
            uploadURL = config.DS_INGESTION_URL + "webpage/summary";
          }
          let data = {
            user_id: asset.user_name,
            uri: asset.url,
            bucket: config.AWS_BUCKET_NAME,
            org_id: asset.metadata.Group,
            ets: convertDateToEpoch(asset.metadata.date),
            access: getAccessType(asset.metadata.access),
            tags: [asset.metadata.Channel],
            doc_id: asset.doc_id,
            source_url:asset.metadata.source_url
          };
                    
          if (asset.category === "Website") {
            data.url = asset.url;
            delete data.uri;
            delete data.bucket;
          }

          // Make the POST request to upload the file based on the upload logic and URL
          try {
            const response = await axios.post(uploadURL, JSON.stringify(data), {
              headers: { "Content-Type": "application/json" },
            });
            if (response.status == 200) {
              updateAsset(asset.id, response.data.task_id);
            } else {
              console.error("Error occurred during file upload:", error);
            }
          } catch (error) {
            console.error("Error occurred during file upload:", error);
          }
        });
      })
      .catch((error) => {
        console.error("Error occurred in cron job DB fetch:", error);
      });
  } catch (error) {
    console.error("Error occurred in cron job:", error);
  }
}

async function updateAsset(Id, taskId) {
  try {
    const Asset = await asset_details.findOne({
      where: {
        id: Id,
      },
    });
    let updateData = {
      status: "Processing",
      task_id: taskId,
    };
    asset_details.update(updateData, { where: { id: Id } }).then((Data) => {});
  } catch (error) {
    console.log(error);
  }
}

function convertDateToEpoch(dateString) {
  const date = new Date(dateString);
  const epoch = date.getTime() / 1000; // Convert milliseconds to seconds
  return epoch;
}

function getAccessType(access) {
  const accessMap = {
    Public: 0,
    Organization: 1,
    Private: 2,
  };

  return accessMap[access];
}

async function checkInjestedAssets() {
  try {
    const injestedAssets = asset_details
      .findAll({ where: { status: "Processing" } })
      .then((injestedAssets) => {
        injestedAssets.forEach(async (asset) => {
          const taskID = asset.task_id;
          const url = config.DS_INGESTION_URL + "task/" + taskID;
          try {
            const response = await axios.get(url);
            if (response.data.state === "SUCCESS") {
              updateAssetLast(asset.id, "Processed");
            } else if (response.data.state === "FAILURE") {
              updateAssetLast(asset.id, "Failed");
            }
          } catch (error) {
            console.error(error);
          }
        });
      })
      .catch((error) => {
        console.error("Error occurred in cron job DB fetch:", error);
      });
  } catch (error) {
    console.error("Error occurred in cron job:", error);
  }
}

async function updateAssetLast(Id, updatedStatus) {
  try {
    const Asset = await asset_details.findOne({
      where: {
        id: Id,
      },
    });
    let updateData = {
      status: updatedStatus,
    };
    asset_details.update(updateData, { where: { id: Id } }).then((Data) => {
      console.log("Updated status for Task id: ", Id, updatedStatus);
    });
  } catch (error) {
    console.log(error);
  }
}

async function updateDocIdForAssets(req, res) {
  try {
    const assetsWithoutDocId = await asset_details.findAll({
      where: { doc_id: null },
    });

    const promises = assetsWithoutDocId.map(async (asset) => {
      const newDocId = `${asset.metadata.Group}_${asset.id}`;
      await asset.update({ doc_id: newDocId });
    });

    await Promise.all(promises);

    res.json({ message: "Updated doc_id for assets without a doc_id." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

// async function performTask() {
//   try {
//     // Fetch all user IDs from the database (replace with your actual database query)
//     const users = await asset_details.findAll({ attributes: ['user_name'] });

//     if (users.length > 0) {
//       const userIDs = users.map(user => user.user_name);
//       // console.log('the User_name is :', userIDs.join(', '));
//     } else {
//       console.log('No user IDs found in the database.');
//     }
//   } catch (error) {
//     console.error('Error in task execution:', error);
//   }
// }

// Schedule the cron job to run every 5 minutes
// cron.schedule('*/5 * * * *', async () => {
//   await performTask();
// });

// async function reTriggerIngestion(req, res) {
//   const { id, start_index, end_index } = req.body;
//   try {
//     const idsToUpdate = id.slice(start_index, end_index +1);
//      await asset_details.update(
//       { status: 'updated' },
//       { where: { id: idsToUpdate, status: 'processing' } }
//     );
//     const msg = { message: "Successful in updated" };
//     res.json(msg);
//   } catch (error) {
//     console.error('Error:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// }

// function ingestionStatus(req, res) {
//   const id = req.body.id;
//   try {
//     const dis= asset_details.findAll({
//       attributes: ['id', 'status']
//     })
//       .then(result => {
//         res.json(result);
//       })
//       console.log(dis);
//   } catch (error) {
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// }

function getAllowedFileTypes(_req, res){
  try{
    res.json(allowedFileTypes)
  }
  catch (error){
    res.status(500).json({error:'Internal server error'})
  }
}





export default {
  createAssetDetails,
  getAssetDetails,
  getAllAssetDetails,
  updateAssetDetails,
  deleteFromAws,
  processUploadedAssets,
  checkInjestedAssets,
  uploadInS3,
  updateDeleteColumn,
  updateDocIdForAssets,
  upload,
  generateDatabaseDateTime,
  getAllowedFileTypes,
  // ingestionStatus,
  // reTriggerIngestion,
  // performTask,
  

};

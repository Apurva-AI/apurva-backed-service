import db from '../../config/sequelize';
const { Op } = require("sequelize");
const { drive_link_asset_details } = db;
import config from '../../config/config';
import assetDetailsController from './asset-details.controller';
import AWS from 'aws-sdk';
import { google } from 'googleapis';
import fs from "fs"
const serviceAccountKey = JSON.parse(fs.readFileSync('temp/creds.json'));
const scopes = ['https://www.googleapis.com/auth/drive'];

const auth = new google.auth.GoogleAuth({
    credentials: serviceAccountKey,
    scopes: scopes
});

const drive = google.drive({
    version: 'v3',
    auth: auth
});
AWS.config.update({
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY
});

const s3 = new AWS.S3();

let id;
let user_id;
let user_name;
let channel;
let group;
let extractedDate;
let drive_link;
let files;
let accessType;
let ingested;


async function fetchDataFromDriveLink() {
  try {
    // Fetch drive link details from drive_link_asset_details table
    let driveLinkDetails = await drive_link_asset_details.findAll({
      where: {
        status: {
          [Op.or]: ['YTD', 'REFRESHING']
        }
      }
    });

    for (const detail of driveLinkDetails) {
      id = detail?.dataValues?.id;
      user_id = detail?.dataValues?.user_id;
      user_name = detail?.dataValues?.user_name;
      group = detail?.dataValues?.group_name;
      drive_link = detail?.dataValues?.drive_link;
      files = detail?.dataValues?.uningested_supported_files;
      // channel = detail?.dataValues?.uningested_supported_files.channelName;
      // extractedDate = detail?.dataValues?.uningested_supported_files.date;
      // accessType = detail?.dataValues?.uningested_supported_files.accessType;
      ingested = detail?.dataValues?.ingested_files
      
      for (const file of files) {
        channel = file.channelName;
        extractedDate = file.date;
        accessType = file.accessType;
        let filename = file.name;
        let fileSplitArray = filename.split(".");
        let extension = "." + fileSplitArray[fileSplitArray.length - 1];
        var today = assetDetailsController.generateDatabaseDateTime(new Date());
        filename = fileSplitArray[0] + "-" + today + extension;
        try {
          // Download file from Google Drive
          const driveResponse = await drive.files.get({
              fileId: file.id,
              alt: 'media'
          }, {
              responseType: 'stream'
          });

          try {
            // Upload file to S3
            const s3Response = await s3.upload({
                Bucket: config.AWS_BUCKET_NAME,
                Key: user_name + "/" + filename,
                Body: driveResponse.data
            }).promise();

            // console.log(`File uploaded successfully: ${s3Response.Location}`);
            await addDataIntoAssetsTable(s3Response.Key, file.name, channel, extractedDate);
          } catch (s3Error) {
            console.error('Error uploading to S3:', s3Error);
            await drive_link_asset_details.update(
              { status: 'FAILED' },
              { where: { id: id, status: {
                [Op.or]: ['YTD', 'REFRESHING']
              } } }
            );
          }
        } catch (driveError) {
          console.error('Error downloading from Google Drive:', driveError);
        }
      }
      if(ingested){
        files = ingested.concat(files);
      }
      try {
        // Update drive link asset details table
        let updateResult = await drive_link_asset_details.update(
          { status: 'DONE',ingested_files: files, uningested_supported_files: null },
          { where: { id: id, status: {
            [Op.or]: ['YTD', 'REFRESHING']
          } } }
        );
      } catch (updateError) {
        console.error('Error updating database:', updateError);
      }
    }
  } catch (dbError) {
    console.error('Error fetching from database:', dbError);
  }
}

async function addDataIntoAssetsTable(key,fileName,channel,extractedDate) {
  const assets = [{
      "name": fileName,
      "url": key,
      "category": convertFileCategory(fileName.split('.').pop()),
      "metaData": {
        "Access": accessType,
        "Channel": channel,
        "Date": extractedDate,
        "Group": group
      }
  }];
  const req = {
    body : {
      "user_id": user_id,
      "user_name": user_name,
      assets
    }
  }
  let res;
  try {
    const secondApiResponse = assetDetailsController.createAssetDetails(req, res, (error) => {
      if (error) {
        console.error('Adding aseet to database failed', error);
        throw error;
      }
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

function convertFileCategory(category) {
  switch (category) {
    // Document types
    case 'txt':
    case 'md':
    case 'rtf':
    case 'docx':
    case 'pdf':
      return 'Text';
    // Audio types
    case 'wav':
    case 'm4a':
    case 'mp3':
    case 'aac':
    case 'mp2':
    case 'flac':
    case 'aiff':
    case 'ac3':
      return 'Audio';
    // Video types
    case 'mp4':
      return 'Video';
    default:
      return '';
  }
}



export default {
  fetchDataFromDriveLink
}




import AWS from 'aws-sdk'
import config from '../../config/config';
const fs = require('fs');
const s3 = new AWS.S3({
  accessKeyId: config.AWS_ACCESS_KEY_ID,
  secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
  signatureVersion: 'v4',
});

function upload(file, user_id) {
  let filename = file.file.originalFilename;

  let fileSplitArray = filename.split('.');
  let extension = "." + fileSplitArray[fileSplitArray.length - 1];
  var today = Date.now();
  filename = user_id + "-"
    + today + extension;
 
  const fileContent = fs.readFileSync(file.file.filepath)
  var params = {
    Bucket: config.AWS_BUCKET_NAME,
    Key: filename,
    Body: fileContent
  }
  return new Promise((resolve, reject) => {
    s3.upload(params, (err, data) => {
      if (err) {
        reject(err)
      }
      resolve(data.Location)
    })
  })

}
function previewImage(key) {
  return new Promise((res, rej) => {
    var bucket = new AWS.S3({ params: { Bucket: config.AWS_BUCKET_NAME } });
    bucket.getObject({ Key: key }, async function (err, file) {
      if (err) {
        rej(err)
      }
      const result = await encode(file.Body);
      res(result)
    });
  })

}
function getSignedURLFromS3(key) {
  return new Promise((res, rej) => {
    const signedUrlExpireSeconds = 60 * 5;
    const url = s3.getSignedUrl('getObject', {
        Bucket: config.AWS_BUCKET_NAME,
        Key: key,
        Expires: signedUrlExpireSeconds
    });
    res(url)
  })

}
function encode(data) {
  return new Promise((res, rej) => {
    var str = data.reduce(function (a, b) { return a + String.fromCharCode(b) }, '');
    res(btoa(str).replace(/.{76}(?=.)/g, '$&\n'))
  })

}

function deleteImage(data){
  const params = {
    Bucket: config.AWS_BUCKET_NAME,
    Key: data
};

return new Promise((resolve, reject) => {
  s3.deleteObject(params, (err, data)=> {
    if (err) {
      reject(err);
    }
    else if(data){
      let success = "File has been deleted successfully";
      resolve(success)
    }  
  });
})
}
export default {getSignedURLFromS3,upload, previewImage, deleteImage };
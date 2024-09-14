import configAPI from '../../config/config'
// Imports the Google Cloud client library
// const {Translate} = require('@google-cloud/translate').v2;
const axios = require('axios');
let GOOGLE_API_KEY = configAPI.GOOGLE_API_KEY;

function translateText(text, src, target) {
  return new Promise(async (resolve, reject) => {
    try {
      var textToTranslate = text
      const bodyObj = {
        q: textToTranslate,
        source: src,
        target: target,
        format:'text'
      }
      if (textToTranslate == " ") {
        console.log("No data detected")
        resolve(null);
        return;
      }
      const url = `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_API_KEY}`;
      const response = await axios.post(url, bodyObj, { headers: { 'Content-Type': 'application/json' } });
      let ReturnResult = "";
      if (response.data) {
        ReturnResult = response.data.data?.translations[0]?.translatedText;
      }
      resolve(ReturnResult);
    } catch (err) {
      console.log('Translate Google API error inside catch', err);
      resolve(null)
    }
  })
}

function detectLanguage(text) {
  return new Promise(async (resolve, reject) => {
    try {
      const bodyObj = {
        q: text
      };
      const url = `https://translation.googleapis.com/language/translate/v2/detect?key=${GOOGLE_API_KEY}`;
      const response = await axios.post(url, bodyObj, { headers: { 'Content-Type': 'application/json' } });
      let detectedLanguage = "";
      if (response.data) {
        detectedLanguage = response.data.data?.detections[0]?.[0]?.language;
      }
      resolve(detectedLanguage);

    } catch (err) {
      console.log('Language detection Google API error inside catch', err);
      resolve(null);
    }
  });
}



module.exports = { translateText ,detectLanguage}
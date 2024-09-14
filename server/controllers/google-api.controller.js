import translateText from "../helpers/google-translate-api.service";
import detectLanguage from "../helpers/google-translate-api.service";
import error from "../helpers/error";

async function translateTextAPI(req, res) {
  const { text, srcLang, targetLang } = req.body;
  console.log("at translate endpoint");
  try {
    if (text) {
      var translated = await translateText.translateText(
        text,
        srcLang,
        targetLang ? targetLang : "en"
      );
      console.log(translated);
      const data = error.Success;
      data["msg"] = "Successfully Translated";
      data["payload"] = {
        data: translated,
      };
      res.json(data);
    } else {
      console.log("Translate Bad request");
      const data = error.BadRequest;
      data["msg"] = "There is some error!!";
      res.json(data);
    }
  } catch (err) {
    console.log("Error occured in translation : ", err);                                           
    const data = error.InternalServerError;
    data["msg"] = "There is some error!!";
    res.json(data);
  }
}


async function detectLanguageAPI(req,res){
  const { text } = req.body;
  console.log("At detect language endpoint");
  try {
    if (text) {
      const detectedLanguage = await detectLanguage.detectLanguage(text);
      if (detectedLanguage) {
        console.log(`Detected language: ${detectedLanguage}`);
        const data = error.Success;
        data["msg"] = "Successfully Detected Language";
        data["payload"] = {
          language: detectedLanguage,
        };
        
        res.json(data);
      } else {
        
        const data = error.BadRequest;
        data["msg"] = "Language detection failed";
        res.json(data);
      }
    } else {
      console.log("Detect Language Bad request");
      const data = error.BadRequest;
      data["msg"] = "There is some error!!";
      res.json(data);
    }
  } catch (err) {
    console.log("Error occurred in language detection: ", err);
    const data = error.InternalServerError;
    data["msg"] = "There is some error!!";
    res.json(data);
  }
}

export default {
  translateTextAPI,  detectLanguageAPI
};
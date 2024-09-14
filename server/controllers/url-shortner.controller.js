import httpStatus from "http-status";
import db from "../../config/sequelize";
import { validateUrl } from "../../utils";
const ShortUniqueId = require("short-unique-id");
const { short_url } = db;
const uid = new ShortUniqueId({ length: 10 });

async function get(req, res, next) {
  const { urlId } = req.params;
  try {
    const urlData = await short_url.findOne({ where: { urlId } });
    if (urlData) {
      const { originalURL } = await urlData;
      return res.redirect(originalURL);
    } else {
      return res.status(404).json("Not found");
    }
  } catch (error) {
    console.log(error)
    return res.status(500).json("Internal Server Errror");
  }
}

async function create(req, res, next) {
  const { originalURLs } = req.body;
  const resultArr = [];

  if (Array.isArray(originalURLs)) {
    for (const originalURL of originalURLs) {
      const validURL = validateUrl(originalURL);
      const urlId = uid();

      if (validURL) {
        try {
          const url = await short_url.findOne({ where: { originalURL } });
          if (url) {
            resultArr.push(url.shortURL);
          } else {
            const shortURL = `${process.env.SHORTENER_BASE_URL}/${urlId}`;
            const newUrlInfo = short_url.build({
              urlId: urlId,
              originalURL: originalURL,
              shortURL: shortURL,
            });
            await newUrlInfo.save();
            resultArr.push(shortURL);
          }
        } catch (error) {
          console.error(error);
          res.status(500).json({ error: "Internal Server Error" });
          return;
        }
      } else {
        res.status(404).json({ error: "Invalid Original Url" });
        return;
      }
    }
    res.status(200).json({ result: resultArr });
  } else {
    res.status(404).json({ error: "Invalid Request" });
  }
}

export default {
  get,
  create,
};

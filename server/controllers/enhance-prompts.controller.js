import db from '../../config/sequelize';
import error from '../helpers/error';
const { enhance_prompts } = db;

function getPromts(req, res, next) {
    enhance_prompts.findAll()
    .then((detail) => {
      if (!detail) {
        const msg = error.InternalServerError
        msg['msg'] = "There is some error!!"
        res.json(msg)
      } else {
        let msg = error.readSuccess;
        msg['msg'] = "Successful Operation"
        msg['data'] = detail
        res.json(msg)
      }
    })
    .catch((e) => next(e));
}

export default {
    getPromts
}
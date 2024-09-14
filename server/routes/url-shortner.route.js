import express from 'express';
import ShortUrlCntrl from '../controllers/url-shortner.controller'
const router = express.Router(); // eslint-disable-line new-cap

router.route('/shorten')

/** GET /api/users - Get list of users */
  .post(ShortUrlCntrl.create)

router.route('/:urlId')

/** GET /api/users/:userId - Get user */
  .get(ShortUrlCntrl.get)

export default router;

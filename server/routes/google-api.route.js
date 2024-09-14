import express from 'express';
const router = express.Router();
import googleApiController from '../controllers/google-api.controller';
import { validate } from 'express-validation';

import paramValidation from '../../config/param-validation';

router.route('/detect-language')
    .post(validate(paramValidation.detectLanguage),googleApiController.detectLanguageAPI);
    
router.route('/translate-text')
    .post(validate(paramValidation.translateText), googleApiController.translateTextAPI);

export default router;
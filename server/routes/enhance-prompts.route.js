import express from 'express';
const router = express.Router();
import enhancePromptsController from '../controllers/enhance-prompts.controller';


router.route('/getPrompts')
.get(enhancePromptsController.getPromts);


export default router;
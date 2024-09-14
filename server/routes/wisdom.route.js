import express from 'express';
const router = express.Router();
import wisdomController from '../controllers/wisdom.controller';

router.route('/uniqueSessions/:userId')
.get(wisdomController.getUniqueSessions);

router.route('/sessionDetails/:sessionId')
.get(wisdomController.getSessionDetails);



//Don't remove this code. API to fetch network questions from static table
// router.route('/getNetworkQuestions/:group_details/:user_name')
// .get(wisdomController.getNetworkQuestions);



export default router;
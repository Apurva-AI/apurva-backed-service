import express from 'express';
const router = express.Router();
import assetGroupDetailsController from '../controllers/asset-group-details.controller';
import { validate } from 'express-validation';

import paramValidation from '../../config/param-validation';

router.route('/getGroupDetails/:groupid')
.get(assetGroupDetailsController.getAssetGroupDetails);
router.route('/updateUserGroup/:groupName')
.put(validate(paramValidation.updateUserGroupDetails),assetGroupDetailsController.updateUserGroupDetails);
router.route('/superAdminDisplay')
.get(assetGroupDetailsController.superAdminDisplay)
router.route('/addGroup')
.post(assetGroupDetailsController.superAdminGroupInput)

export default router;
import db from '../../config/sequelize';
import error from '../helpers/error';
import { update } from 'lodash';

const { user_group_details } = db;

async function getAssetGroupDetails(req, res, next) {
    let channelList = [];
        await user_group_details.findOne({ where: { group_name: req.params.groupid } })
            .then((detail) => {
                if (!detail) {
                    // const msg = error.InternalServerError
                    // msg['msg'] = "There is some error!!"
                    // res.json(msg)
                    console.log('There is no channel mapping for group :',groupId)
                } else {
                    channelList.push(...detail.dataValues.channel);

                }
            })
            .catch((e) => next(e));
    
    let msg = error.readSuccess;
    msg['msg'] = "Successful Operation"

    msg['data'] = channelList
    res.json(msg)
    
}

function updateUserGroupDetails(req, res, next) {
    const groupName = req.params.groupName;
    const newChannel = req.body.channel;

    // First, try to find the group by name
    user_group_details.findOne({ where: { group_name: groupName } }).then(function (groupData) {
        if (groupData) {
            // If the group exists, update its channel array
            const channelArray = groupData.dataValues.channel;
            channelArray.push(newChannel);
            user_group_details.update({ channel: channelArray }, { where: { group_name: groupName } })
                .then(() => {
                    const msg = error.readSuccess;
                    msg['msg'] = "Successful Operation";
                    console.log(msg);
                    res.status(200).json({newChannel});
                })
                .catch((e) => next(e));
        } else {
            // If the group doesn't exist, create a new one
            user_group_details.create({
                group_name: groupName,
                channel: [newChannel] // Create a new channel array with the provided channel
            })
                .then(() => {
                    const msg = error.readSuccess;
                    msg['msg'] = "Group created and channel added successfully";
                    console.log(msg);
                    res.json(msg);
                })
                .catch((e) => next(e));
        }
    });
}

async function superAdminDisplay(req, res) {
    try {
      const result = await user_group_details.findAll({
        attributes: ['group_name', 'channel']
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
}

async function superAdminGroupInput(req, res, next) {
    try {
  
      const groupName = req.body.groupName;  
     await user_group_details.create({ group_name: groupName});
      const msg = error.readSuccess;
      msg['msg'] = "Group created and updated successfully";
      res.status(200).json(groupName);
    } catch (e) {
      console.error('Error:', e);
      next(e);
    }
  }


export default {
    getAssetGroupDetails, 
    updateUserGroupDetails,
    superAdminGroupInput,
    superAdminDisplay
}
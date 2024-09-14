import { google } from 'googleapis';
import fs from "fs"
import { allowedFileTypes } from '../helpers/utils';
import assetGroupDetailsController from './asset-group-details.controller';
import driveLinkDetailsController from './drive-link-details.controller';
import db from "../../config/sequelize";
import config from '../../config/config';
import e from 'express';
const { drive_link_asset_details } = db;


const serviceAccountKey = JSON.parse(fs.readFileSync('temp/creds.json'));
const scopes = ['https://www.googleapis.com/auth/drive'];

const auth = new google.auth.GoogleAuth({
    credentials: serviceAccountKey,
    scopes: scopes
});

const drive = google.drive({
    version: 'v3',
    auth: auth
});

const fetchAllFiles = config.FETCH_ALL_FILES_FROM_DRIVE === 'true';

function sortFiles(files) {
    let supportedFileList = [];
    let unsupportedFileList = [];
    let oversizedFileList = []; // List for oversized files
    const supportedExtensions = allowedFileTypes.map(type => type.replace('.', ''));
    // Convert the size limit from MB to bytes (1 MB = 1024 * 1024 bytes)
    const sizeLimitMB = config.FILESIZE_LIMIT || '200'; // Default to 20 MB if env variable is not set
    const sizeLimitBytes = parseInt(sizeLimitMB) * 1024 * 1024;

    files.forEach(file => {
        const fileExtension = file.name.split('.').pop().toLowerCase();
        const fileSize = parseInt(file.size);
        // Check if the file is oversized
        if (fileSize > sizeLimitBytes) {
            oversizedFileList.push({ name: file.name });
        } else if (supportedExtensions.includes(fileExtension) || file.mimeType === 'application/vnd.google-apps.folder') {
            // Create a new object with only the needed properties
            let fileData = {
                id: file.id,
                name: file.name,
                mimeType: file.mimeType
                // Add any other properties you need here
            };
            supportedFileList.push(fileData);
        } else {
            unsupportedFileList.push({ name: file.name });
        }
    });

    return { supportedFileList, unsupportedFileList, oversizedFileList };
}


async function extractFolderDetails(folderName, group_name) {
    const pattern = /^[^:]+:(public|private|organization)$/i;

    if (pattern.test(folderName)) {
        const parts = folderName.split(':');
        const channelNameLowerCase = parts[0].toLowerCase();
        const accessType = parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase();
        const timestamp = new Date();
        var date = timestamp.toISOString().split('T')[0];

        // Create a mock request object to fetch the channel details for this group
        const mockReq = {
            params: {
                groupid: [group_name] // Assuming group_name is what you want to pass
            }
        };

        try {
            // Call getAssetGroupDetails asynchronously and wait for the response
            const mockRes = await new Promise((resolve, reject) => {
                assetGroupDetailsController.getAssetGroupDetails(mockReq, {
                    json: (data) => resolve(data),
                    status: () => ({ send: (msg) => reject(new Error(msg)) })
                }, (error) => {
                    if (error) reject(error);
                });
            });
            // Extract the channel list and convert to lowercase for comparison
            var channelArrLowerCase = mockRes.data.map(channel => channel.toLowerCase());
            channelArrLowerCase = channelArrLowerCase.map(channel =>
                channel.replace(/ /g, '_'));
            // Find the index of the channelName in the lowercase array
            const index = channelArrLowerCase.indexOf(channelNameLowerCase);
            if (index !== -1) {
                // Return the original value from channelArr
                return { channelName: mockRes.data[index], accessType, date };
            } else {
                return null;
            }
        } catch (error) {
            console.error('Error in fetching group details:', error);
            return null;
        }
    } else {
        return null;
    }
}

function compareFileListsByIDs(list1, list2) {
    const list2FileIds = new Set(list2.map(file => file.id));
    const uniqueFiles = list1.filter(file => !list2FileIds.has(file.id));
    return uniqueFiles;
}

function compareFileListsByNames(list1, list2) {
    const list2FileNames = new Set(list2.map(file => file.name));
    const uniqueFiles = list1.filter(file => !list2FileNames.has(file.name));
    return uniqueFiles;
}


async function processDrive(req, res, next, isRefresh = false) {
    const link = req.body.drivelink;
    const user_id = req.body.user_id;
    const user_name = req.body.user_name;
    const group_name = req.body.group_name;
    
    const folderIdMatch = link.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    const folderId = folderIdMatch ? folderIdMatch[1] : null;
    
    if (!folderId) {
        return res.status(491).send('Invalid Google Drive shared link.');
    }
    
    try {
        const response = await drive.files.list({
            q: `'${folderId}' in parents`,
            fields: 'files(id, name, size, mimeType)'
        });
        
        if (!response) {
            return res.status(492).send('Not accessible.');
        }
        
        const supportedFolders = [];
        const unsupportedFolders = [];
        
        for (const file of response.data.files) {
            if (file.mimeType === "application/vnd.google-apps.folder") {
                const folderDetail = await extractFolderDetails(file.name, group_name);
                if (folderDetail) {
                    const combinedObject = { ...file, ...folderDetail };
                    supportedFolders.push(combinedObject);
                } else {
                    unsupportedFolders.push(file);
                }
            }
        }

        if (supportedFolders.length === 0) {
            return res.status(499).send({
                message: 'No folders found',
            });
        }
        
        if (unsupportedFolders.length > 0) {
            return res.status(494).send({
                message: 'Folder name does not follow the required structure.',
                supportedFolders: supportedFolders,
                unsupportedFolders: unsupportedFolders
            });
        } else {
            const folderLogs = supportedFolders.map(folder => {
                return {
                    id: folder.id,
                    name: folder.name,
                    date: new Date().toISOString() // Adds the current timestamp
                };
            });
            
            let folderDet;
            
            if (isRefresh) {
                folderDet = await processRefreshFolders(supportedFolders, user_id, user_name, group_name, link, folderLogs);
                if (!folderDet) {
                    return res.status(497).send({
                        message: 'No supported or unique files found after refresh please check the new files',
                    });
                }
            } else {
                folderDet = await processFolders(supportedFolders, user_id, user_name, group_name, link, folderLogs);
                if (!folderDet) {
                    return res.status(498).send({
                        message: 'No supported files',
                    });
                }
            }
            
            res.json(folderDet);
        }
    } catch (e) {
        console.log(e);
        return res.status(500).send(e);
    }
}

async function verifyDrive(req, res, next) {
    await processDrive(req, res, next);
}

async function refreshDrive(req, res, next) {
    await processDrive(req, res, next, true);
}


async function processFolders(matchingFolders, user_id, user_name, group_name, parentLink, folderLogs) {
    let combinedSupportedFileList = [];
    let combinedUnsupportedFileList = [];
    let combinedOversizedFileList = [];
    let folderDetails = [];

    for (const folder of matchingFolders) {
        let folderDetail = {
            name: folder.name,
            message: 'success',
            error: false
        };
        const metadata = {
            channelName: folder.channelName,
            accessType: folder.accessType,
            date: folder.date
        }
        try {
            let result = await verifyAndProcessDriveDetails(folder.id);
            if (result.filesList.supportedFileList) {
                combinedSupportedFileList.push(...result.filesList.supportedFileList.map(file => {
                    return { ...file, ...metadata };
                }));
                combinedUnsupportedFileList.push(...result.filesList.unsupportedFileList);
                combinedOversizedFileList.push(...result.filesList.oversizedFileList);
            }
            else {
                throw new Error(`Error processing folder ${folder.name}:`);
            }

        } catch (error) {
            console.error(`Error processing folder ${folder.name}:`, error);
            folderDetail.error = true;
            folderDetail.message = error.message;
        }
        folderDetails.push(folderDetail);
    }
    const unsupportedFileList = combinedUnsupportedFileList.concat(combinedOversizedFileList);
    const allFoldersHaveError = folderDetails.every(folder => folder.error);
    if (allFoldersHaveError) {
        // If all folders have errors, return a specific error response
        return null;
    }

    let requestData = {
        user_id,
        user_name,
        drive_link: parentLink,
        group_name,
        uningested_supported_files: combinedSupportedFileList,
        unsupported_files: unsupportedFileList,
        logs: folderLogs,
    };

    await driveLinkDetailsController.createDriveLinkAssetDetails(requestData);


    return {
        combinedSupportedFileList,
        combinedUnsupportedFileList,
        combinedOversizedFileList,
        folderDetails
    };
}

async function verifyAndProcessDriveDetails(folderId) {

    try {
        let files;
        if(fetchAllFiles){
            files = await fetchAllFilesInFolder(folderId);
        }
        else{
            const response = await drive.files.list({
                q: `'${folderId}' in parents`,
                fields: 'files(id, name, size, mimeType)',
                // pageSize: 15
            });
            files = response.data.files;
        }
        if (!files.length) {
            throw new Error('No files found.');
        }

        let filesList = sortFiles(files);
        for (const file of files) {
            if (file.mimeType === 'application/vnd.google-apps.folder') {
                const subfolderResult = await verifyAndProcessDriveDetails(file.id);
                filesList.supportedFileList = filesList.supportedFileList.concat(subfolderResult.filesList.supportedFileList);
                filesList.unsupportedFileList = filesList.unsupportedFileList.concat(subfolderResult.filesList.unsupportedFileList);
                filesList.oversizedFileList = filesList.oversizedFileList.concat(subfolderResult.filesList.oversizedFileList);
            }
        }

        if (filesList.supportedFileList.length === 0) {
            throw new Error('No supported files found.');
        }
        return { filesList };
    } catch (err) {
        throw new Error(`An error occurred: ${err.message}`);
    }
}

async function fetchAllFilesInFolder(folderId,pageToken = null) {
    let allFiles = [];

    try {
        while (true) {
            const response = await drive.files.list({
                q: `'${folderId}' in parents`,
                fields: 'nextPageToken, files(id, name, size, mimeType)',
                pageToken : pageToken
            });
            const files = response.data.files;
            const nextPageToken = response.data.nextPageToken
            allFiles = allFiles.concat(files);
            if (!nextPageToken) {
                break;
            }
            else{
                pageToken = nextPageToken;
            }
        }
    } catch (err) {
        throw new Error(`An error occurred while fetching files: ${err.message}`);
    }
    return allFiles;
}






async function processRefreshFolders(matchingFolders, user_id, user_name, group_name, parentLink, folderLogs) {
    let combinedUniqueFileList = [];
    let combinedUnsupportedFileList = [];
    let combinedOversizedFileList = [];
    let allUnsupportedFileList = []
    let folderDetails = [];

    for (const folder of matchingFolders) {
        let folderDetail = {
            name: folder.name,
            message: 'success',
            error: false
        };
        const metadata = {
            channelName: folder.channelName,
            accessType: folder.accessType,
            date: folder.date
        }
        try {
            let result = await refreshDriveFiles(folder.id, user_id, user_name, group_name, parentLink);

            if (result.uniqueFiles) {
                combinedUniqueFileList.push(...result.uniqueFiles.map(file => {
                    return { ...file, ...metadata };
                }));
                allUnsupportedFileList.push(...result.unsupported_files);
                combinedUnsupportedFileList.push(...result.unsupportedFileList);
                combinedOversizedFileList.push(...result.oversizedFileList);
            } else {
                throw new Error(`Error processing folder ${folder.name}:`);
            }

        } catch (error) {
            // console.error(`Error processing folder ${folder.name}:`, error);
            folderDetail.error = true;
            folderDetail.message = error.message;
        }
        folderDetails.push(folderDetail);
    }

    const allFoldersHaveError = folderDetails.every(folder => folder.error);
    if (allFoldersHaveError) {
        // If all folders have errors, return a specific error response
        return null;
    }
    const currentData = await drive_link_asset_details.findOne({
        where: { drive_link: parentLink, user_id: user_id },
        attributes: ['logs', 'id']
    });
    const allLogs = currentData.dataValues.logs.concat(folderLogs);
    await drive_link_asset_details.update(
        { status: 'REFRESHING', uningested_supported_files: combinedUniqueFileList, unsupported_files: allUnsupportedFileList, logs: allLogs },
        { where: { id: currentData.dataValues.id } }
    );


    return {
        combinedUniqueFileList,
        combinedUnsupportedFileList,
        combinedOversizedFileList,
        folderDetails
    };
}

async function refreshDriveFiles(folderId, user_id, user_name, group_name, parentLink) {
    let uniqueFiles = [];
    let filesList;
    try {
        const existingRecord = await drive_link_asset_details.findOne({
            where: { drive_link: parentLink, user_id: user_id }
        });

        if (!existingRecord) {
            throw new Error("Record not found");
        }

        let record = existingRecord.dataValues;
        const response = await drive.files.list({
            q: `'${folderId}' in parents`,
            fields: 'files(id, name, size)'
        });

        const files = response.data.files;
        if (!files || !files.length) {
            throw new Error('No files found.');
        }

        filesList = sortFiles(files);
        if (filesList.supportedFileList.length === 0) {
            throw new Error('No supported files found');
        }

        if (record.ingested_files) {
            uniqueFiles = compareFileListsByIDs(filesList.supportedFileList, record.ingested_files);
        } else {
            uniqueFiles = filesList.supportedFileList;
        }

        if (uniqueFiles.length === 0) {
            throw new Error('No Unique Files Found');
        }

        let unsupported_files = filesList.unsupportedFileList.concat(filesList.oversizedFileList);

        filesList.unsupportedFileList = compareFileListsByNames(filesList.unsupportedFileList, record.unsupported_files);
        filesList.oversizedFileList = compareFileListsByNames(filesList.oversizedFileList, record.unsupported_files);

        return {
            unsupportedFileList: filesList.unsupportedFileList,
            uniqueFiles,
            unsupported_files,
            oversizedFileList: filesList.oversizedFileList
        };
    } catch (error) {
        console.error(error);
        return new Error(`Error processing request: ${error.message}`);
    }
}





export default {
    verifyDrive,
    refreshDrive
};



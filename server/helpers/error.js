

const _ = require('lodash');

module.exports = {
	BadRequest: { 
		errCode: 'Bad Request',
		code: 400,
	},

	Unauthorized: {
		errCode: 'Unauthorised',
		code: 401,
	},

	Forbidden: {
		errCode: 'Forbidden',
		code: 403,
	},

	NotFound: {
		errCode: 'Not Found',
		code: 404
	},

	UnprocessableEntity: {
		code: 422,
		errCode: 'Unprocessable Entity',
	},

	InternalServerError: {
		errCode: 'Internal Server Error',
		code: 500,
	},
	APIUnauthorization:{
		errCode: 'Unauthorized user',
		code: 401,
	},
	APIAuthorization:{
		errCode: 'authorized user',
		code: 200,
	},
	Success: {
		code: 201,
		status:"created"
	},
	readSuccess:{
		code: 200,
		status:"OK"
	},
    dataBaseNotConnected:{
        errCode: 'Internal Server Error',
		code: 500,
        msg:"Database does not exist"
    },
	empty: [],
};

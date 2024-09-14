// import db from '../../config/sequelize';
import telemtrydb from '../../config/telemetrySequelize'
import error from '../helpers/error';
const { wisdom_questions } = telemtrydb;
import config from '../../config/config';
const { Op, Sequelize } = require('sequelize');


async function getUniqueSessions(req, res, next) {
  const user_id = req.params.userId;
  const wisdom_url = req.query.wisdom_url;
  const today = new Date();
  const past7Days = new Date(today);
  // const deploymentTime = new Date(config.CHAT_HISTORY_DEPLOYMENT_TIME)
  past7Days.setDate(today.getDate() - 7); // Calculate the date 7 days ago
  try {
    const sessions = await wisdom_questions.findAll({
      attributes: [
        [Sequelize.fn('DISTINCT', Sequelize.col('sid')), 'sid'],
        [Sequelize.fn('MAX', Sequelize.col('created_at')), 'created_at']
      ],
      where: {
        user_id: user_id,
        wisdom_url: wisdom_url,
      },
      group: ['sid'], // Group by sid to ensure uniqueness
      order: [[Sequelize.fn('MAX', Sequelize.col('created_at')), 'DESC']], // Order by the most recent session
      limit: 10
    });
    console.log("sessions length--------",sessions?.length)
    if (!sessions || sessions.length === 0) {
      const msg = error.InternalServerError;
      msg['msg'] = "There is some error or no data found!!";
      return res.json(msg);
    } else {
      const detailsWithQuestions = await Promise.all(sessions.map(async (session) => {
        const question_text = await getFirstQuestionTextForSession(session.sid);
        return {
          session_id: session.sid,
          question_text: question_text
        };
      }));

      const msg = error.readSuccess;
      msg['msg'] = "Successful Operation";
      msg['data'] = detailsWithQuestions;
      res.json(msg);
    }
  } catch (e) {
    console.error("Error fetching unique sessions:", e);
    next(e); 
  }
}

function getSessionDetails(req, res, next) {
  const sid = req.params.sessionId;
  const offset = parseInt(req.query.offset) || 0;
  const limit = parseInt(req.query.limit) || 5;
  wisdom_questions.findAndCountAll({
    attributes: ['question_text', 'answer_text', 'reaction','result','sid'],
    where: {
      sid: sid
    },
    order: [['created_at', 'ASC']], // Order by createdAt in ascending order
    offset: offset,
    limit: limit
  })
  .then((result) => {
    const details = result.rows;
    const totalCount = result.count;
    if (!details || details.length === 0) {
      const msg = {
        code: 404,
        status: "Not Found",
        msg: "No data found for the given session ID."
      };
      res.status(404).json(msg);
    } else {
      const msg = {
        code: 200,
        status: "OK",
        msg: "Successful Operation",
        data: details,
        totalCount: totalCount
      };
      res.json(msg);
    }
  })
  .catch((e) => {
    console.log("error--", e);
    next(e);
  });
}

async function getFirstQuestionTextForSession(sessionId) {
  try {
    const firstQuestion = await wisdom_questions.findOne({
      attributes: ['question_text'],
      where: {
        sid: sessionId
      },
      order: [['created_at', 'ASC']] // Fetch the first question in ascending order of createdAt
    });
    return firstQuestion ? firstQuestion.question_text : null;
  } catch (error) {
    console.error(`Error fetching first question text for session ${sessionId}:`, error);
    throw error;
  }
}


export default {
    getUniqueSessions,
    getSessionDetails
}
import { isArray } from 'lodash';
import config from '../../config/config';

const { Client } = require('pg');

// Database connection configuration
const dbConfig = {
    user: config.postgres.user,
    host: config.postgres.host,
    database: config.postgres.telemetry_db,
    password: config.postgres.passwd,
    port: 5432, // Default PostgreSQL port
};

// SQL query to fetch data from the table


const getPagination = (page, size) => {
    const limit = size ? +size : 10;
    let pageNo = parseInt(page)
    const offset = pageNo && pageNo >= 1 ? (pageNo - 1) * limit : 0;
    return { limit, offset };
};


const getData = () => {
    // Create a new PostgreSQL client
    const client = new Client(dbConfig);
    const telemetrySourceTable = 'winston_logs';
    const telemetryFlatTable = 'wisdom_questions'
    const wisdom_host_name =  config.WISDOM_HOST_NAME

    // Connect to the PostgreSQL database
    client.connect()
        .then(() => {
            console.log('Connected to the database');
            let query = '' 
        if(config.IS_MIGRATED.toLowerCase() === 'true') {
                query = `SELECT level, message, meta, timestamp FROM public.${telemetrySourceTable} WHERE timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' >= NOW() - INTERVAL '2 minutes'  and (message::json->'events'->1->>'channel')::text = '${wisdom_host_name}' order by timestamp desc`
            }else{
                query = `SELECT level, message, meta, timestamp FROM public.${telemetrySourceTable} where (message::json->'events'->1->>'channel')::text = '${wisdom_host_name}'`
            }
            // Fetch data from the table
            return client.query(query);
        })
        .then(async (result) => {
            // Process the JSON data and create rows for CSV
            if (result.rows && result.rows.length > 0) {

                for (const row of result.rows) {
                    const { message, timestamp} = row;
                    let data = JSON.parse(message);
//console.log(data);
                    let qObject = ""
                    let aObject = ""
                    let wisdom_url = ""
                    for (const item of data['events']) {
                        if (item['eid'] == "OE_ITEM_RESPONSE") {
                            wisdom_url = item['channel']
                            qObject = item['edata']['eks']['target']['questionsDetails'];
                            aObject = item['edata']['eks']['target']['questionsDetails']['answerText'];
                            if (qObject && qObject['questionText'] && (qObject['questionSource']!= 'ENHANCE')) {
                                const sid = item['sid'];
                                const token = qObject['token'];
                                const existingEntry = await findEntry('wisdom_questions', client, { 'sid': sid, 'token': token });
                                const updatedData = {
                                    'question_text': qObject['questionText'],
                                    "answer_text": aObject['answer'],
                                    "result": aObject['result'],
                                    'org_id': qObject['groupDetails'][0],
                                    'user_id': item['uid'],
                                    'created_at': timestamp,
                                    'id': item['mid'],
                                    'sid': sid,
                                    'token': token,
                                    'wisdom_url':wisdom_url
                                };
                                // Check if reaction exists in qObject and set it in updatedData
                                if ('reaction' in qObject) {
                                    updatedData['reaction'] = qObject['reaction'];
                                }
                                // Check if feedback exists in qObject and set it in updatedData, even if it is an empty string
                                if ('feedback' in qObject) {
                                    updatedData['feedback'] = qObject['feedback'];
                                }
                                // If there is an existing entry, update it
                                if (existingEntry) {
                                    await update(telemetryFlatTable, client, { 'sid': sid, 'token': token }, updatedData);
                                } else {
                                    // If there is no existing entry, create a new one
                                    await create(telemetryFlatTable, client, updatedData);
                                }                               
                            }
                        }
                    }

                    // console.log("ques", qObject)
                    // await create('discussion_details', qObject);
                }
            }
        })
        .then(() => {
            console.log('migrated successfully');
        })
        .catch(error => {
            console.error('Error:', error);
        })
        .finally(() => {
            // Close the database connection
            client.end();
        });
}

const getSubscriptionData = () => {
    // Create a new PostgreSQL client
    const client = new Client(dbConfig);

    // Connect to the PostgreSQL database
    client.connect()
        .then(() => {
            console.log('Connected to the database', query);
            // Fetch data from the table
            return client.query(query);
        })
        .then(async (result) => {
            // Process the JSON data and create rows for CSV
            if (result.rows && result.rows.length > 0) {
                for (const row of result.rows) {
                    const { message, converted_timestamp, meta } = row;
                    let data = JSON.parse(message);
                    for (const item of data['events']) {
                        if (item['eid'] == "OE_ITEM_RESPONSE") {
                            let evenData = item['edata']['eks']['target'];
                            console.log("evenData['type']", evenData['type'])
                            const subscriptionDate = new Date(item['ets']).toISOString();
                            if (evenData['type'] && evenData['type'] == 'SUBSCRIBE' || evenData['type'] && evenData['type'] == 'UNSUBSCRIBE')
                                await create('subscription', client,
                                    { 'email_id': evenData['user']['email'], "is_subscribed": evenData['type'] == 'SUBSCRIBE' ? true : false, date_of_subcription: subscriptionDate }
                                );
                        }
                    }
                }
            }
        })

        .then(() => {
            console.log('migrated subscription successfully');
        })
        .catch(error => {
            console.error('Error:', error);
        })
        .finally(() => {
            // Close the database connection
            // client.end();
        });
}

const getListOfQA = async (req) => {
    const client = new Client(dbConfig);
    const { page, size } = req.query;
    const { limit, offset } = getPagination(page, size);
    const totalCountQuery = 'SELECT count(*) from discussion_details';
    let query = 'SELECT * from discussion_details';
    if (limit > 0) {
        query = `SELECT * from discussion_details offset ${offset} limit ${limit}`;
    }
    return client.connect()
        .then(() => {
            return client.query(query);
        })
        .then(async (result) => {
            const data = await client.query(totalCountQuery);
            const totalCount = data?.rows ? data?.rows.map(row => row?.count) : 0;
            // Process the JSON data
            if (result.rows && result.rows.length > 0) {
                return { count: isArray(totalCount) ? parseInt(`${totalCount[0]}`) : totalCount, results: result.rows };
            }
        })
        .catch(error => {
            console.error('Error:', error);
            return { count: 0, results: [] };
        })
        .finally(() => {
            client.end();
        });

}


const getCountOfQA = async (req) => {
    const client = new Client(dbConfig);
    let query = 'SELECT count(*) from discussion_details';
    return client.connect()
        .then(() => {
            console.log("res")
            return client.query(query);
        })
        .then((result) => {
            if (result.rows && result.rows.length > 0) {
                return result.rows[0];
            }
        })
        .catch(error => {
            console.error('Error:', error);
            return 0;
        })
        .finally(() => {
            client.end();
        });

}

const create = async (tableName, client, rest) => {
    try {
        let query = insertQuery({
            table: tableName,
            data: rest,
            returnfields: "*",
        });
        let columnvalues = getQueryValues(rest);
        const { rows } = await client.query(query, [...columnvalues]);
        return rows;
    } catch (err) {
        console.log("error", err)
    }
}

const getQueryValues = (data) => {
    var colValues = Object.keys(data).map(function (key) {
        return data[key];
    });
    let existcol = colValues.filter(function (val) {
        return true;
    })
    var merged = [].concat.apply([], existcol);
    return merged;

}


const insertQuery = (builder) => {
    // Setup static beginning of query
    const { table, data, returnfields } = builder;
    var query = ['INSERT INTO ' + table + '('];
    var fields = [];
    Object.keys(data).forEach(function (key, i) {
        fields.push(key);
    });
    query.push(fields.join(', '));
    query.push(")");
    // Create another array storing each set command
    // and assigning a number value for parameterized query
    query.push("VALUES (");
    var set = [];
    Object.keys(data).forEach(function (key, i) {
        set.push(' $' + (i + 1));
    });
    query.push(set.join(', '));
    query.push(')' + 'RETURNING ' + returnfields);
    // Return a complete query string
    return query.join(' ');
}

const findEntry = async (tableName, client, query) => {
    try {
        let selectQuery = `SELECT * FROM ${tableName} WHERE `;
        let conditions = [];
        let values = [];
        let index = 1;

        for (const [key, value] of Object.entries(query)) {
            conditions.push(`${key} = $${index}`);
            values.push(value);
            index++;
        }
        selectQuery += conditions.join(' AND ');
        const { rows } = await client.query(selectQuery, values);
        return rows.length > 0 ? rows[0] : null;
    } catch (err) {
        console.log("Error finding entry:", err);
        return null;
    }
}

const update = async (tableName, client, query, updatedData) => {
    try {
        let updateQuery = `UPDATE ${tableName} SET `;
        let setStatements = [];
        let values = [];
        let index = 1;
        for (const [key, value] of Object.entries(updatedData)) {
            setStatements.push(`${key} = $${index}`);
            values.push(value);
            index++;
        }
        updateQuery += setStatements.join(', ');
        let conditions = [];
        for (const [key, value] of Object.entries(query)) {
            conditions.push(`${key} = $${index}`);
            values.push(value);
            index++;
        }
        updateQuery += ' WHERE ' + conditions.join(' AND ');

        await client.query(updateQuery, values);
    } catch (err) {
        console.log("Error updating entry:", err);
    }
}

export default { getData, getListOfQA, getCountOfQA, getSubscriptionData }

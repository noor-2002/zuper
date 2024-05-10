import express from 'express';
import bodyParser from 'body-parser';
import db from './database.js';

const app = express();
const PORT = 5000

app.use(bodyParser.json());

// Define the functions for the database operations
function getUsers(callback) {
    db.all('SELECT * FROM users', callback);
}

function getActivity(callback) {
    db.all('SELECT * FROM activity', callback);
}

function getUserActivity(callback) {
    db.all(`
        SELECT
            u.name AS user_name,
            a.name AS activity_name,
            ca.points_earned
        FROM users u
        JOIN completion_activity ca ON u.user_id = ca.user_id
        JOIN activity a ON ca.act_id = a.act_id
    `, callback);
}

function getUserPoints(page, pageSize, month, callback) {
    const offset = (page - 1) * pageSize;
    db.all(`
        SELECT
            u.name AS user_name,
            SUM(ca.points_earned) AS total_points_earned,
            CASE strftime('%m', ca.created_at)
                WHEN '01' THEN 'January'
                WHEN '02' THEN 'February'
                WHEN '03' THEN 'March'
                WHEN '04' THEN 'April'
                WHEN '05' THEN 'May'
                WHEN '06' THEN 'June'
                WHEN '07' THEN 'July'
                WHEN '08' THEN 'August'
                WHEN '09' THEN 'September'
                WHEN '10' THEN 'October'
                WHEN '11' THEN 'November'
                WHEN '12' THEN 'December'
            END AS month
        FROM users u
        LEFT JOIN completion_activity ca ON u.user_id = ca.user_id
        WHERE strftime('%m', ca.created_at) = ?
        GROUP BY u.user_id
        ORDER BY total_points_earned DESC
        LIMIT ? OFFSET ?
    `, [month, pageSize, offset], callback);
}

// Define the function for the database operations

function getUserActivitiesById(userId, page, pageSize, month, callback) {
    const offset = (page - 1) * pageSize;
    db.all(`
        SELECT
            a.name AS activity_name,
            ca.points_earned,
            strftime('%m', ca.created_at) AS month
        FROM completion_activity ca
        JOIN activity a ON ca.act_id = a.act_id
        WHERE ca.user_id = ?
    `, [userId], (err, allRows) => {
        if (err) {
            callback(err);
            return;
        }
        const totalPointsAll = allRows.reduce((sum, row) => sum + row.points_earned, 0);
        const rowsForMonth = allRows.filter(row => row.month === month);
        const totalPointsMonth = rowsForMonth.reduce((sum, row) => sum + row.points_earned, 0);
        const rowsForPage = rowsForMonth.slice(offset, offset + pageSize);
        const totalPointsPage = rowsForPage.reduce((sum, row) => sum + row.points_earned, 0);
        callback(null, totalPointsAll, totalPointsMonth, totalPointsPage, rowsForPage);
    });
}



function addActivity(activityName, points, description, callback) {
    db.run('INSERT INTO activity (name, points, desc) VALUES (?, ?, ?)', [activityName, points, description], callback);
}

function addCompletionActivity(userId, actId, callback) {
    db.get('SELECT points FROM activity WHERE act_id = ?', [actId], (err, row) => {
        if (err) {
            callback(err);
            return;
        }
        if (!row) {
            callback(new Error('Activity not found'));
            return;
        }
        const points = row.points;
        db.run('INSERT INTO completion_activity (user_id, act_id, points_earned) VALUES (?, ?, ?)', [userId, actId, points], (err) => {
            if (err) {
                callback(err);
                return;
            }
            db.run('UPDATE users SET total_points = total_points + ? WHERE user_id = ?', [points, userId], (err) => {
                if (err) {
                    callback(err);
                    return;
                }
                db.get('SELECT name FROM users WHERE user_id = ?', [userId], (err, row) => {
                    if (err) {
                        callback(err);
                        return;
                    }
                    callback(null, { name: row.name, points_added: points });
                });
            });
        });
    });
}



// Use the functions in the API handlers

app.get('/getallusers', (req, res) => {
    getUsers((err, users) => {
        if (err) {
            console.error('Error querying users:', err);
            res.status(500).json({ status: 'failure', message: 'Server error' });
            return;
        }
        res.json({ status: 'success', data: users });
    });
});


app.get('/getallactivity', (req, res) => {
    getActivity((err, activity) => {
        if (err) {
            console.error('Error querying activity:', err);
            res.status(500).json({ status: 'failure', message: 'Server error' });
            return;
        }
        res.json({ status: 'success', data: activity });
    });
});

app.get('/completed-activities', (req, res) => {
    getUserActivity((err, rows) => {
        if (err) {
            console.error('Error executing query:', err);
            res.status(500).send({ status: 'failure', message: 'Server error' });
            return;
        }
        res.json({ status: 'success', data: rows });
    });
});

app.get('/dashboard', (req, res) => {

    const page = req.query.page || 1;
    const pageSize = req.query.pageSize || 1;
    const month = req.query.month || (new Date().getMonth() + 1).toString().padStart(2, '0');

    getUserPoints(page, pageSize, month, (err, rows) => {
        if (err) {
            console.error('Error executing query:', err);
            res.status(500).send({ status: 'failure', message: 'Server error' });
            return;
        }
        res.json({ status: 'success', data: rows });
    });
});

app.get('/singleuser/:userId', (req, res) => {
    const userId = req.params.userId;
    const page = req.query.page || 1;
    const pageSize = req.query.pageSize || 10;
    const month = req.query.month || (new Date().getMonth() + 1).toString().padStart(2, '0');
    getUserActivitiesById(userId, page, pageSize, month, (err, totalPointsAll, totalPointsMonth, totalPointsPage, rows) => {
        if (err) {
            console.error('Error executing query:', err);
            res.status(500).send({ status: 'failure', message: 'Server error' });
            return;
        }
        res.json({ status: 'success', data: { total_points_forever: totalPointsAll, total_points_month: totalPointsMonth, total_points_page: totalPointsPage, activities: rows } });
    });
});

app.post('/add-completion-activity', (req, res) => {
    const { userId, actId } = req.body;
    if (!userId || !actId) {
        res.status(400).send('Missing user ID or activity ID');
        return;
    }
    addCompletionActivity(userId, actId, (err, result) => {
        if (err) {
            console.error('Error adding completion activity:', err);
            res.status(500).send({ status: 'failure', message: 'Server error' });
            return;
        }
        res.status(201).send({ status: 'success', message: 'Logs added and total count is updated', points_added_user: result });
    });
});

app.post('/add-activity', (req, res) => {
    const { activityName, points, description } = req.body;
    if (!activityName || !points || !description) {
        res.status(400).send('Missing activity name, points, or description');
        return;
    }
    addActivity(activityName, points, description, (err) => {
        if (err) {
            console.error('Error adding activity:', err);
            res.status(500).send({ status: 'failure', message: 'Server error' });
            return;
        }
        res.status(201).send({ status: 'success', message: 'Activity added successfully' });
    });
});

app.get('/', (req, res) => {
    res.json({
        status: 'All systems working',
        mainEndpoints: [
            { method: 'GET', path: '/' },
            { method: 'GET', path: '/dashboard' },
            { method: 'GET', path: '/singleuser/:userId' },
            { method: 'POST', path: '/add-activity' },
            { method: 'POST', path: '/add-completion-activity' },
        ],
        additionalEndpoints: [
            { method: 'GET', path: '/getallusers' },
            { method: 'GET', path: '/getallactivity' },
            { method: 'GET', path: '/completed-activities' },
        ]
    });
});

app.listen(PORT, () => console.log(`Server running on port: http://localhost:${PORT}`));


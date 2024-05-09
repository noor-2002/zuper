import db from './database.js';

const insertSampleData = () => {
    const users = ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Williams', 'Charlie Brown', 'David Davis', 'Eva Evans', 'Frank Franklin', 'Grace Green', 'Hannah Hill'];
    const activities = [
        ['Write a report', 'Write a report on the recent project', 20],
        ['Attend a meeting', 'Participate in the team meeting', 10],
        ['Research', 'Conduct an hour of research on the assigned topic', 15],
        ['Presentation', 'Prepare and deliver a presentation', 30],
        ['Code review', 'Perform code review for a colleague', 25],
        ['Documentation', 'Write documentation for the current project', 20],
        ['Brainstorming', 'Participate in a brainstorming session', 15],
        ['Testing', 'Test the new features in the application', 20],
        ['Bug fixing', 'Fix a bug in the application', 25],
        ['Designing', 'Design a new feature for the application', 30],
        ['Planning', 'Participate in project planning', 15],
        ['Training', 'Attend a training session', 10],
        ['Mentoring', 'Mentor a junior colleague', 20],
        ['Refactoring', 'Refactor a part of the codebase', 25],
        ['Networking', 'Participate in a networking event', 15],
        ['Compliance training', 'Complete compliance training', 10],
        ['Data analysis', 'Analyze the project data', 20],
        ['Customer support', 'Provide support to a customer', 15],
        ['Quality assurance', 'Perform quality assurance tasks', 20],
        ['Project management', 'Manage a part of the project', 25]
    ];

    db.serialize(() => {
        users.forEach((user, index) => {
            db.run(`INSERT INTO users (name, total_points) VALUES ('${user}', 0)`);
            activities.forEach((activity, actIndex) => {
                db.run(`INSERT INTO activity (name, desc, points) VALUES ('${activity[0]}', '${activity[1]}', ${activity[2]})`);
                if (Math.random() > 0.5) { // Randomly assign activities to users
                    db.run(`INSERT INTO completion_activity (user_id, act_id, points_earned) VALUES (${index + 1}, ${actIndex + 1}, ${activity[2]})`);
                }
            });
        });
    });

    console.log('Sample data inserted into the database');
};

insertSampleData();
const express = require('express');
const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');
const session = require('express-session');
const { stringify } = require('querystring');


const app = express();
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Set to true if using HTTPS
        maxAge: 1000 * 60 * 60 * 24, // 1 day
        httpOnly: true
     }
}));
app.use((req, res, next) => {
    res.locals.userId = req.session ? req.session.userId : null;
    next();
});
const eventsFile = path.join(__dirname, 'events.json');
if (!fsSync.existsSync(eventsFile)) {
    fsSync.writeFileSync(eventsFile, JSON.stringify({ events: [] }, null, 2));
}
const dataFile = path.join(__dirname, 'userinfo.json');
if (!fsSync.existsSync(dataFile)) {
    fsSync.writeFileSync(dataFile, JSON.stringify([], null, 2));
}
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    } else {
        return res.redirect('/signin');
    }
};
async function ReadJSON(filepath) {
    try {
        const data = await fs.readFile(filepath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading JSON file:', err);
        return null;
    }
}
async function writeJson(path, data) {
    try {
        await fs.writeFile(path, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error writing JSON file:', err);
    }
}
async function CompareUserSignIn(username, password) {
    try {
        const userData = await ReadJSON(dataFile);
        if (!userData) return false;
        if (!Array.isArray(userData)) return false;
        const user = userData.find(u => u.user === username && u.password === password);
        return !!user;
    } catch (err) {
        console.error('Error comparing user sign-in:', err);
        return false;
    }

}
async function WriteUserData(username, password, firstName, lastName) {
    try {
        const data = await ReadJSON(dataFile) || [];
        const id = String(data.length + 1);
        data.push({ id, username, password, firstName, lastName, email: "", content: "" });
        await writeJson(dataFile, data);
    } catch (err) {
        console.error('Error writing user data:', err);
    }
}
async function GetEventInfoById(id, allOrNot) {
    const data = await ReadJSON(path.join(__dirname, 'events.json'));
    const events = data && data.events ? data.events : [];
    if (allOrNot === true) {
        return events;
    }
    let event = events.find(e => e.id === id);
    if (event === undefined) {
        event = {
            id: '404'
        }
    }
    return event;
}
async function GetUserInfoById(id) {
    const data = await ReadJSON(dataFile);
    return data.find(u => u.id === String(id));
}
app.get('/', (req, res) => res.render('index'));
app.get('/futurevents', isAuthenticated, async (req, res) => {
    const userId = (req.session && req.session.userId) ? req.session.userId : null;
    const events = await GetEventInfoById(null, true);
    const id = req.params.id;
    const userData = GetUserInfoById(id);
    res.render('futurevents', { events: events, userId: userId, userData: userData });
});
app.get('/venturing', (req, res) => res.render('venturing'));
app.get('/signin', (req, res) => res.render('signin'));
app.get('/newaccount', (req, res) => res.render('newaccount'));
app.get('/donate', (req, res) => res.render('donate'));
app.get('/contact', (req, res) => res.render('contact'));
app.get('/about', (req, res) => res.render('about'));
app.get('/calendar', isAuthenticated, (req, res) => res.render('calendar'));
app.get('/404', (req, res) => res.render('404'));
app.get('/userpage/:id', isAuthenticated, async (req, res) => {
    const userId = req.params.id;
    const userData = await GetUserInfoById(userId);
    if (!userData) return res.redirect("/404");
    const isOwner = (req.session.userId === userData.user);
    res.render('userpage', {userData: userData, isOwner: isOwner });
});
app.get('/event/:id', isAuthenticated, async (req, res) => {
    const eventId = req.params.id;
    const eventData = await GetEventInfoById(eventId, false);
    if (eventData.id === '404') {
        return res.redirect('/404');
    }
    res.render('event', { event: eventData });
});
app.get('/getUserId', async (req, res) => {
    const sessionUser = (req.session && req.session.userId) ? req.session.userId : null;
    const userid = await ReadJSON(dataFile);
    const userData = userid.find(u => u.user === sessionUser);
    res.json({ userId: sessionUser, userData: userData});
});
app.get('/signout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Sign out failed');
        }
        res.redirect('/');
    });
});
app.post('/register', async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    try {
        await WriteUserData(username, password, firstName, lastName);
        return res.redirect('/signin');
    } catch (err) {
        console.error('Registration error:', err);
        return res.status(500).send('Registration failed');
    }
});
app.post('/signin', async (req, res) => {
    const { username, password } = req.body;
    const isValid = await CompareUserSignIn(username, password);
    if (isValid) {
        req.session.userId = username;
        req.session.isLoggedIn = true;
        return res.redirect('/');
    } else {
        return res.redirect('/signin');
    }
});
app.post('/newevent', isAuthenticated, async (req, res) => {
    try{
    const { title, content, author } = req.body;
    const data = await ReadJSON(path.join(__dirname, 'events.json'));
    const maxId = data.events.reduce((max, ev) => Math.max(max, Number(ev.id)), 0);
    const nextId = maxId + 1;
    if (nextId == 404) nextId++;
    const newEvent = { id: String(nextId), title, content, author };
    data.events.push(newEvent);
    await writeJson(path.join(__dirname, 'events.json'), data);
    res.redirect('/futurevents');
    } catch (err) {
        const userId = (req.session && req.session.userId) ? req.session.userId : null;
        const events = await GetEventInfoById(null, true);
        res.render('futurevents', {events: events, userId: userId, error: 'Error creating event. Please try again.'});
    }
});
app.post('/updateuser', isAuthenticated, async (req, res) => {
    try {
        const oldInfo = await GetUserInfoById(req.params.id);
        if (!oldInfo) {
            return res.status(404).send('User not found');
        }
        const { email, content } = req.body;
        const data = await ReadJSON(dataFile);
        const userIndex = data.findIndex(u => u.id === String(req.session.userId));
        if (userIndex !== -1) {
            data[userIndex].email = email;
            data[userIndex].content = content;
            await writeJson(dataFile, data);
        }
        res.redirect(`/userpage/${req.session.userId}`);
    } catch (err) {
        console.log(err);
    }
});

app.use((req, res) => {
    res.status(404).redirect('/404');
});

app.listen(3000, () => console.log('Server is running on port 3000'));
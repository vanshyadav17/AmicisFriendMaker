const fs = require('fs');

const express = require('express');
const bodyParser = require('body-parser');

const data = require('./data/data.json');
const urlencodedParser = bodyParser.urlencoded({
    extended: false
})
const adminPanelLink = data.config.adminPanelURL;

const app = express();

const port = data.config.port;

/*
Redirects the user from "/" to the "/login" endpoint.
It's possible that an actual "/" page could be included in the future.
*/

app.get('/', (req, res) => {
    res.redirect('/login');
});

/*
The "/login" endpoint serves two different files depending on the circumstances.
If someone's normally accessing it (i.e. just logging in normally) it'll serve the "normal" version of the login.html file.
However, there is a slightly edited login.html file called login-error.html that is served when the user incorrectly fills in credentials.
Considering this project does not use React, Angular, etc. this is the only way to add responsiveness while still using "static".
*/

app.get('/login', (req, res) => {

    let successQuery = req.query.success;

    if (successQuery === "no") {
        res.sendFile('./assets/web-pages/login-error.html', {
            root: __dirname
        });
        return;
    }

    res.sendFile('./assets/web-pages/login.html', {
        root: __dirname
    });

});

/*
The /adduser endpoint which responds with an HTML page depending on the query passed.
That query being "success", with its three possible options being yes, no, or undefined.
If undefined, it'll return a normal version of the add-user HTML page.
If yes, it'll return the HTML page but with a success message.
If no, it'll return the HTML page but with a failure message.
*/

app.get(`/${adminPanelLink}/adduser`, (req, res) => {
    let successQuery = req.query.success;

    if (successQuery === "no") {
        const page = fs.readFileSync('./assets/web-pages/add-user/adduser-error.html', 'utf8')
            .replaceAll('{adminpanellink}', adminPanelLink)
            .replaceAll('{cplink}', `/${adminPanelLink}`);
        res.send(page);
        return;
    } else if (successQuery === "yes") {
        const page = fs.readFileSync('./assets/web-pages/add-user/adduser-success.html', 'utf8')
            .replaceAll('{adminpanellink}', adminPanelLink)
            .replaceAll('{cplink}', `/${adminPanelLink}`);
        res.send(page);
        return;
    }

    let page = fs.readFileSync('./assets/web-pages/add-user/adduser.html', 'utf8').replace('{adminpanellink}', adminPanelLink);
    page = page
        .replaceAll('{adminpanellink}', adminPanelLink)
        .replaceAll('{cplink}', `/${adminPanelLink}`);
    res.send(page);

});

/*
The POST endpoint that actually takes the information to add a user
*/

app.post(`/${adminPanelLink}/useradd`, urlencodedParser, (req, res) => {
    if ((req.body.adminpswd === data.config.adminPassword) && (getUserData(req.body.email) === null)) {
        createNewUser(
            req.body.email, req.body.password, req.body.name, req.body.age,
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris",
            "To be set", ["To be set", "To be set", "To be set", "To be set"], req.body.pfp, "TO BE SET");

        res.redirect(`/${adminPanelLink}/adduser?success=yes`);
        return;
    }

    res.redirect(`/${adminPanelLink}/adduser?success=no`);

});

/*
The /changepasscode endpoint which responds with an HTML page depending on the query passed.
That query being "success", with its three possible options being yes, no, or undefined.
If undefined, it'll return a normal version of the add-user HTML page.
If yes, it'll return the HTML page but with a success message.
If no, it'll return the HTML page but with a failure message.
*/

app.get(`/${adminPanelLink}/changepasscode`, (req, res) => {
    let successQuery = req.query.success;

    if (successQuery === 'no') {
        const page = fs.readFileSync('./assets/web-pages/change-passcode/changeadminpassword-error.html', 'utf8')
            .replaceAll('{adminpanellink}', adminPanelLink)
            .replaceAll('{cplink}', `/${adminPanelLink}`);
        res.send(page);
        return;
    } else if (successQuery === 'yes') {
        const page = fs.readFileSync('./assets/web-pages/change-passcode/changeadminpassword-success.html', 'utf8')
            .replaceAll('{adminpanellink}', adminPanelLink)
            .replaceAll('{cplink}', `/${adminPanelLink}`);
        res.send(page);
        return;
    }

    let page = fs.readFileSync('./assets/web-pages/change-passcode/changeadminpassword.html', 'utf8');
    page = page
        .replaceAll('{adminpanellink}', adminPanelLink)
        .replaceAll('{cplink}', `/${adminPanelLink}`);
    res.send(page);
});

/*
The POST endpoint that actually takes the information to change the administrator passcode.
*/

app.post(`/${adminPanelLink}/changeadminpassword`, urlencodedParser, (req, res) => {
    let currentPassword = req.body.oldpassword;
    let newPassword = req.body.newpassword;

    if ((currentPassword === data.config.adminPassword) && (newPassword != "") && (typeof newPassword != 'undefined') && (newPassword != null)) {
        data.config.adminPassword = newPassword;
        saveData();
        res.redirect(`/${adminPanelLink}/changepasscode?success=yes`);
        return;
    }

    res.redirect(`/${adminPanelLink}/changepasscode?success=no`);
});

/*
The administrator panel
*/

app.get(`/${adminPanelLink}`, (req, res) => {
    let page = fs.readFileSync('./assets/web-pages/admincp.html', 'utf8');
    page = page.replaceAll('{adminpanellink}', adminPanelLink);
    res.send(page);

})

/*
Log out endpoint. Deletes the user's session.
*/

app.get('/logout', (req, res) => {

    const ip = req.socket.remoteAddress;

    if (!validateSession(ip)) {
        res.redirect('/login');
        return;
    }

    deleteSessionByIP(ip);
    res.redirect('/login');

});

/*
Profile page endpoint. 
Builds an HTML page for a "my profile" page based off a pre-designed HTML document. (see: getUserProfileHTML() function)
*/

app.get('/my-profile', (req, res) => {

    let ip = req.socket.remoteAddress;

    if (!validateSession(ip)) {
        res.redirect('/access-denied');
        return;
    }

    res.send(getUserProfileHTML(getSession(ip).email));

});

/*
This endpoint is what a user is redirected to if their session is invalid.
A session may be invalid either due to it never existing or expiring (sessions are valid for up to 600 seconds).
*/

app.get('/access-denied', (req, res) => {

    res.sendFile('./assets/web-pages/403.html', {
        root: __dirname
    });

});

/*
Endpoint for updating a profile.
Takes form data from the "edit profile" button's modal form from the profile page and updates a profile with new data.
*/

app.post(`/updateprofile`, urlencodedParser, (req, res) => {
    const ip = req.socket.remoteAddress;
    const session = getSession(ip);

    if (typeof session === 'undefined' || session === null) {
        res.redirect('/access-denied');
        return;
    }

    const email = session.email;

    const body = req.body;

    updateProfile(email, body.bioedit, body.location, body.hobbies.split(","), body.profilepic, body.almamater);
    res.redirect('/my-profile');

});

/*
Endpoint for login authentication.
First and foremost, it validates credentials.
Secondly, it deletes any sessions from the same IP but from other usernames, and then creates a new session for the user.
The user is then redirected to their profile page.
*/

app.post('/login-auth', urlencodedParser, (req, res) => {

    const ip = req.socket.remoteAddress;

    if(validateCredentials(req.body.uname, req.body.psw)) {

        let index = 0;
        data.sessions.forEach((session) => {
            if(session.ip === ip || session.email === req.body.uname) {
                data.sessions.splice(index, 1);
                saveData();
            }
            index++;
        });
        createNewSession(req.body.uname, ip);
        res.redirect('/my-profile');

    }
    else {
        let string = encodeURIComponent('no');
        res.redirect('/login?success=' + string);
    }

});

app.use('/profile', (req, res) => {
    console.log(req.query.account);
    let idQuery = req.query.account;
    if(typeof idQuery === 'undefined' || idQuery === null || idQuery === ''){
        res.redirect('/not-found');
        return;
    }

    let ip = req.socket.remoteAddress;

    if (!validateSession(ip)) {
        res.redirect('/access-denied');
        return;
    }

    if(getUserDataFromID(idQuery) != null){
        res.send(getUserProfilePage(idQuery));
        return;
    }

    res.redirect('/not-found');

});

app.use('/catalog', (req, res) => {
    let ip = req.socket.remoteAddress;

    if (!validateSession(ip)) {
        res.redirect('/access-denied');
        return;
    }

    res.send(getProfileCatalogHTML(getSession(ip).email));
})

/*
The middleware for a custom 404 page.
*/

app.use('/not-found', (req, res) => {
    res.sendFile('./assets/web-pages/404.html', {
        root: __dirname
    });
})

app.use('/adminredirect', (req, res) => {
    console.log('hello');
    const ip = req.socket.remoteAddress;
    if(getSession(ip) != null && validateSession(getSession(ip))){
        res.redirect('/my-profile');
        return;
    }
    res.redirect('/');
});

app.use((req, res, next) => {
    res.redirect('/not-found');
});



/*
Starts the server listening on a given port and ensures it operates in IPV4 mode.
*/

app.listen(port, '0.0.0.0', () => console.log(`(amicis) started server on port ${port}!`));

/**
 * Saves the data.json file
 */

function saveData() {
    fs.writeFileSync('./data/data.json', JSON.stringify(data, null, 1));
}

/**
 * Validates whether the passed credentials are correct
 * @param {string} email 
 * @param {string} password 
 * @returns {boolean} - whether the passed email and password are correct
 */

function validateCredentials(email, password) {
    let isValid = false;
    data.accounts.forEach((account) => {
        if ((account.email.toLowerCase() === email.toLowerCase()) && (account.password === password)) {
            isValid = true;
        }
    });

    return isValid;
}

/**
 * Creates a new user
 * @param {string} email 
 * @param {string} password 
 * @param {string} name 
 * @param {number} age 
 * @param {string} bio 
 * @param {string} location 
 * @param {Array} hobbies 
 * @param {string} pfp 
 */

function createNewUser(email, password, name, age, bio, location, hobbies, pfp, almamater) {
    data.accounts.push({
        email: email,
        password: password,
        name: name,
        age: age,
        bio: bio,
        location: location,
        hobbies: hobbies,
        pfp: pfp,
        id: randomString(6, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'),
        blockedUsers: [],
        almamater: almamater
    });
    saveData();
}

/**
 * Deletes a user 
 * @param {string} email 
 */

function deleteUser(email) {
    let index = 0;
    data.accounts.forEach((account) => {
        if (account.email === email) {
            data.accounts.splice(index, 1);
            saveData();
            return;
        }
        index++;
    })
}

/**
 * Creates a new session 
 * @param {string} email 
 * @param {string} ipAddress 
 */

function createNewSession(email, ipAddress) {
    data.sessions.push({
        ip: ipAddress,
        email: email,
        timeStarted: getCurrentTime()
    });
    saveData();
}

/**
 * Deletes a session given an email address
 * @param {string} email 
 */

function deleteSession(email) {
    let index = 0;
    data.sessions.forEach((session) => {
        if (session.email === email) {
            data.sessions.splice(index, 1);
            saveData();
            return;
        }
        index++;
    });
}

/**
 * Deletes a session given an IP address
 * @param {string} ip 
 */

function deleteSessionByIP(ip) {
    let index = 0;
    data.sessions.forEach((session) => {
        if (session.ip === ip) {
            data.sessions.splice(index, 1);
            saveData();
        }
        index++;
    });
}

/**
 * Validates whether an IP has a valid session
 * @param {string} ip 
 * @returns {boolean} - whether the IP has a valid session
 */

function validateSession(ip) {
    let hasValidSession = false;
    data.sessions.forEach((session) => {
        if (session.ip === ip) {
            const timeElapsedSinceSessionStart = getCurrentTime() - session.timeStarted;
            if (timeElapsedSinceSessionStart < 600) {
                hasValidSession = true;
            }
            else {
                data.sessions.splice(data.sessions.indexOf(session), 1);
                saveData();
            }
        }
    });
    return hasValidSession;
}

/**
 * Gets the data of a session given an IP address
 * @param {string} ip 
 * @returns {object} - object containing session data
 */

function getSession(ip) {
    let sessionToReturn = null;
    data.sessions.forEach((session) => {
        if (session.ip === ip) {
            sessionToReturn = session;
        }
    });
    return sessionToReturn;
}

/**
 * Gets the current UNIX Timestamp in seconds
 * @returns {number} - UNIX timestamp in seconds
 */

function getCurrentTime() {
    return Math.floor(Date.now() / 1000)
}

/**
 * Fetches a user's account and profile data
 * @param {string} email 
 * @return {object} - a user's data from data.json 
 */

function getUserData(email) {
    let profileToReturn = null;
    data.accounts.forEach((profile) => {
        if (profile.email === email) {

            profileToReturn = profile;
        }
    });
    return profileToReturn;
}

function getUserDataFromID(id) {
    let profileToReturn = null;
    data.accounts.forEach((profile) => {
        if (profile.id === id) {
            profileToReturn = profile;
        }
    });
    return profileToReturn;
}

/**
 * Creates the HTML and CSS webpage data for a user's profile
 * @param {string} email - the email of the user
 * @returns {string} - the user's profile webpage
 */

function getUserProfileHTML(email) {
    let profileTemplate = fs.readFileSync('./assets/web-pages/profile.html', 'utf8');

    const userData = getUserData(email);

    let hobbyString = "";

    userData.hobbies.forEach((hobby) => {
        hobbyString = hobbyString + "<br>&nbsp;&nbsp;&nbsp;- " + hobby;
    });

    let rawHobbyData = "";

    userData.hobbies.forEach((hobby) => {
        rawHobbyData = rawHobbyData + hobby + ",";
    });

    let hobbyData = rawHobbyData.slice(0, -1);

    profileTemplate = profileTemplate
        .replace('{name}', userData.name)
        .replace('{age}', userData.age)
        .replace('{biography}', userData.bio)
        .replace('{hobbies}', hobbyString)
        .replace('{location}', userData.location)
        .replace('{pfplink}', userData.pfp)
        .replace('{biodata}', userData.bio)
        .replace('{locationdata}', userData.location)
        .replace('{hobbydata}', hobbyData)
        .replace('{pfpdata}', userData.pfp)
        .replaceAll('{almamater}', userData.almamater);

    return profileTemplate;
}

function getUserProfilePage(id) {
    let profileTemplate = fs.readFileSync('./assets/web-pages/profile_user.html', 'utf8');

    const userData = getUserDataFromID(id);

    let hobbyString = "";

    userData.hobbies.forEach((hobby) => {
        hobbyString = hobbyString + "<br>&nbsp;&nbsp;&nbsp;- " + hobby;
    });

    let rawHobbyData = "";

    userData.hobbies.forEach((hobby) => {
        rawHobbyData = rawHobbyData + hobby + ",";
    });

    let hobbyData = rawHobbyData.slice(0, -1);

    profileTemplate = profileTemplate
        .replaceAll('{name}', userData.name)
        .replace('{age}', userData.age)
        .replace('{biography}', userData.bio)
        .replace('{hobbies}', hobbyString)
        .replace('{location}', userData.location)
        .replace('{pfplink}', userData.pfp)
        .replace('{biodata}', userData.bio)
        .replace('{locationdata}', userData.location)
        .replace('{hobbydata}', hobbyData)
        .replace('{pfpdata}', userData.pfp)
        .replace('{accountid}', userData.id)
        .replaceAll('{almamater}', userData.almamater);

    return profileTemplate;
}

/**
 * Determines whether an IP has more than one session
 * @param {string} ip - ip of requesting user
 * @returns {boolean} - whether the ip has more than one session
 */

function ipHasDuplicateSession(ip) {
    let numberOfSessions = 0;
    data.sessions.forEach((session) => {
        if (session.ip === ip) {
            numberOfSessions++;
        }
    });

    if (numberOfSessions > 1) {
        return true;
    }

    return false;
}

/**
 * Will update a profile as per the passed arguments 
 * @param {string} email - the email of the profile that needs updatingg
 * @param {string} bio - user biography
 * @param {string} location - user location
 * @param {string} hobbies - user hobbies and interests
 * @param {string} pfp - user profile picture URL
 */

function updateProfile(email, bio, location, hobbies, pfp, almamater) {
    let index = getProfileArrayIndex(email);
    data.accounts[index].bio = bio;
    data.accounts[index].location = location;
    data.accounts[index].hobbies = hobbies;
    data.accounts[index].pfp = pfp;
    data.accounts[index].almamater = almamater;
    saveData();
}


/**
 * Gets the index at which a profile is in the data.profiles array
 * @param {string} email - the email of the user 
 * @returns the index at which the profile is in the data.profiles array
 */

function getProfileArrayIndex(email) {
    let index = 0;
    let indexToReturn = -1;
    data.accounts.forEach((profile) => {
        if (profile.email === email) {
            indexToReturn = index;
        }
        index++;
    });
    return indexToReturn;
}

/**
 * Robust replaceAll() function taken from the standardized method that exists in ECMAScript.
 * https://tc39.es/ecma262/#sec-string.prototype.replaceall
 * @param {string} str1 
 * @param {string} str2 
 * @param {*} ignore 
 */

String.prototype.replaceAll = function(str1, str2, ignore) {
    return this.replace(new RegExp(str1.replace(/([\/\,\!\\\^\$\{\}\[\]\(\)\.\*\+\?\|\<\>\-\&])/g, "\\$&"), (ignore ? "gi" : "g")), (typeof(str2) == "string") ? str2.replace(/\$/g, "$$$$") : str2);
}

/**
 * Randomly generates a string
 * @param {number} length - length of generated string
 * @param {string} chars - characters to user in the randomly generated string
 */

function randomString(length, chars) {
    var isUnique = false;
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}

function getProfileCatalogHTML(forUserEmail){
    const catalogPart1HTML = fs.readFileSync('./assets/web-pages/catalog/catalog_part_1.html', 'utf8');
    const catalogPart2HTML = fs.readFileSync('./assets/web-pages/catalog/catalog_part_2.html', 'utf8');
    const catalogProfileTemplateHTML = fs.readFileSync('./assets/web-pages/catalog/catalog_profile_template.html', 'utf8');

    let profilesHTML = "";

    data.accounts.forEach((account) => {

        if(account.email != forUserEmail && !getUserData(forUserEmail).blockedUsers.includes(account.id)){
            let hobbyData = "";

            account.hobbies.forEach((hobby) => {
                hobbyData = hobbyData + hobby + ", ";
            });
    
            hobbyData = hobbyData.slice(0, -1).slice(0, -1);
    
            let accountHTML = catalogProfileTemplateHTML
            .replace('{userpfpdata}', account.pfp)
            .replace('{name}', account.name)
            .replace('{profileLink}', `/profile?account=${account.id}`)
            .replace('{locationdata}', account.location)
            .replace('{agedata}', account.age)
            .replace('{hobbiesdata}', hobbyData);
            profilesHTML = profilesHTML + accountHTML;
        }

    });

    return (catalogPart1HTML + profilesHTML + catalogPart2HTML);

}
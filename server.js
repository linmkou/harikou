// server.js
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname)));

// Auth setup
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: 'http://localhost:3000/auth/github/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Load local users.json for role matching
    const users = JSON.parse(fs.readFileSync(path.join(__dirname, 'users.json')));
    const user = users.find(u => u.username.toLowerCase() === profile.username.toLowerCase());

    if (!user) return done(null, false);
    return done(null, { username: profile.username, role: user.role });
  } catch (err) {
    return done(err);
  }
}));

// Auth routes
app.get('/auth/github', passport.authenticate('github', { scope: ['user:email'] }));

app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login.html' }),
  (req, res) => {
    // Redirect based on role
    const role = req.user.role;
    if (role === 'admin') return res.redirect('/file-browser.html');
    if (role === 'teacher') return res.redirect('/middle-school.html');
    if (role === 'student') return res.redirect('/primary-school.html');
    return res.redirect('/index.html');
  });

app.get('/logout', (req, res) => {
  req.logout(() => {
    req.session.destroy();
    res.redirect('/login.html');
  });
});

// Auth middleware
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login.html');
}

// Protect sensitive pages
app.get(['/file-browser.html', '/middle-school.html', '/primary-school.html', '/secondary-school.html'], ensureAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, req.path));
});

// Default route 200
app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    const role = req.user.role;
    if (role === 'admin') return res.redirect('/file-browser.html');
    if (role === 'teacher') return res.redirect('/middle-school.html');
    if (role === 'student') return res.redirect('/primary-school.html');
  }
  res.redirect('/login.html');
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
app.get("/auth/user", (req, res) => {
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).json({});
  }
});

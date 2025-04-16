// server.js
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// إعداد الجلسة
app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: true
}));

// إعداد Passport
app.use(passport.initialize());
app.use(passport.session());

// المستخدمون من GitHub
let usersByRole = {};

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
    const res = await axios.get('https://raw.githubusercontent.com/linmkou/harikou/main/users.json');
    const users = res.data;
    const userData = users.find(user => user.username === profile.username);

    if (userData) {
      return done(null, {
        username: profile.username,
        role: userData.role
      });
    } else {
      return done(null, false);
    }
  } catch (err) {
    return done(err);
  }
}));

// مسارات المصادقة
app.get('/auth/github', passport.authenticate('github', { scope: [ 'user:email' ] }));

app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login.html' }),
  (req, res) => {
    // التوجيه حسب الدور
    const role = req.user.role;
    if (role === 'primary') return res.redirect('/primary-school.html');
    if (role === 'middle') return res.redirect('/middle-school.html');
    if (role === 'secondary') return res.redirect('/secondary-school.html');
    return res.redirect('/');
  });

app.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/login.html');
  });
});

// حماية الصفحات
const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.redirect('/login.html');
};

// تقديم الملفات الثابتة
app.use(express.static(path.join(__dirname, '../')));

// حماية صفحات الأطوار والفايل بروزر
app.get(['/primary-school.html', '/middle-school.html', '/secondary-school.html', '/file-browser.html'], requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, `../${req.path}`));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

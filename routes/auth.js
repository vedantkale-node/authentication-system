const express = require("express");
const router = express.Router();
const pool = require("../database/db");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
require("dotenv").config();
const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  handler: (req, res) => {
    res.status(429).render("limit", {
      message: "Too many requests, please try again later",
    });
  },
});

const createSmtpTransporter = () => {
  const port = Number(process.env.SMTP_PORT) || 587;
  const requiredEnv = ["SMTP_HOST", "SMTP_USER", "SMTP_SECRET"];
  const missingEnv = requiredEnv.filter((key) => !process.env[key]);

  if (missingEnv.length > 0) {
    throw new Error(
      `Missing SMTP environment variables: ${missingEnv.join(", ")}`,
    );
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    family: 4,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_SECRET,
    },
  });
};

router.get("/login", (req, res) => {
  res.render("login", {
    login: req.flash("fail"),
    internalServerErr: req.flash("internalServerErr"),
    passChanged: req.flash("passChange"),
    notVerified: req.flash("notVerified"),
  });
});

router.get("/register", limiter, (req, res) => {
  res.render("register", {
    crossUsername: req.flash("existUsername"),
    checkMail: req.flash("existEmail"),
    firstName: req.flash("fname"),
    lastName: req.flash("lname"),
    email: req.flash("email"),
    username: req.flash("uname"),
    internetErr: req.flash("internetErr"),
    internalServerErr: req.flash("internalServerErr"),
  });
});

router.get("/reset-password", (req, res) => {
  res.render("forgotPassword");
});

router.post("/login", limiter, async (req, res) => {
  let { username, password } = req.body;
  try {
    let loginSql = `SELECT * FROM users WHERE username = ?`;
    let checkLogin = await pool.query(loginSql, username);
    if (checkLogin.length > 0) {
      let checkPassword = await bcrypt.compare(
        password,
        checkLogin[0].password,
      );
      if (!checkPassword) {
        req.flash("fail", "Invalid Username or Password");
        res.redirect("/user/login");
      } else {
        if (checkLogin[0].verified === 0) {
          req.flash(
            "notVerified",
            "Email not verified, please verify your email to continue",
          );
          return res.redirect("/user/login");
        }
        req.session.user = username;
        return res.redirect("/");
      }
    } else {
      req.flash("fail", "Invalid Username or Password");
      res.redirect("/user/login");
      return;
    }
  } catch (error) {
    req.flash("internalServerErr", `Internal Server Error!`);
    res.redirect("/user/login");
    console.log(error);
  }
});

router.post("/register", limiter, async (req, res) => {
  let { firstName, lastName, email, username, password } = req.body;
  let firstNameChar = firstName.charAt(0).toUpperCase();
  let restFirstName = firstName.slice(1);
  let capitalizeFirstName = firstNameChar + restFirstName;
  let lastNameChar = lastName.charAt(0).toUpperCase();
  let restLastName = lastName.slice(1);
  let capitalizeLastName = lastNameChar + restLastName;
  const token = crypto.randomBytes(32).toString("hex");
  try {
    let sql = `SELECT * FROM users WHERE email = ?`;
    const result = await pool.query(sql, email);
    if (result.length === 0) {
      let checkUsernameSql = `SELECT username FROM users WHERE username = ?`;
      let checkUsername = await pool.query(checkUsernameSql, username);
      if (checkUsername.length !== 0) {
        req.flash("fname", capitalizeFirstName);
        req.flash("lname", capitalizeLastName);
        req.flash("uname", username);
        req.flash("email", email);
        req.flash("existUsername", "Username Already Exists");
        return res.redirect("/user/register");
      } else {
        let verificationLink = `https://authentication-system-3145.onrender.com/user/verify/${token}`;
        let transporter = createSmtpTransporter();
        const mailOptions = {
          from: `"Vedant Kale" <${process.env.SMTP_USER}>`,
          to: email,
          subject: "Verify Your Email Address",
          html: `
Dear ${capitalizeFirstName},<br><br>

Thank you for registering with AuthSys By Vedant. To ensure the security of your account and prevent unauthorized access, we require that you verify your email address.<br><br>

To complete the verification process, simply click on the following link: <br>
<a href="${verificationLink}">${verificationLink}</a><br>

If you are unable to click on the link, please copy and paste the URL into your web browser.<br><br>

Please note that your account will remain inactive until your email address is verified. If you have any questions or concerns, please do not hesitate to contact our customer support team.

Sincerely,<br>
Vedant Kale
          `,
        };
        let mailSent = await transporter.sendMail(mailOptions);

        if (mailSent.accepted.length > 0) {
          let hashPassword = await bcrypt.hash(password, 10);
          let addUserSql = `INSERT INTO users (first_name, last_name, email, username, password, token, token_created_at, created_at, updated_at) VALUES (?,?,?,?,?,?,NOW(),NOW(),NOW())`;
          let userData = [
            capitalizeFirstName,
            capitalizeLastName,
            email,
            username,
            hashPassword,
            token,
          ];
          let userRegistered = await pool.query(addUserSql, userData);
          if (userRegistered.affectedRows > 0) {
            req.session.regsitered = true;
            return res.render("valid", {
              firstName: capitalizeFirstName,
              lastName: capitalizeLastName,
              registered: true,
            });
          } else {
            return res.render("valid", {
              registeredErr: true,
            });
          }
        } else {
          return res.render("valid", {
            emailSent: true,
          });
        }
      }
    } else {
      req.flash("fname", capitalizeFirstName);
      req.flash("lname", capitalizeLastName);
      req.flash("uname", username);
      req.flash("email", email);
      req.flash("existEmail", "Email Already Exists");
      return res.redirect("/user/register");
    }
  } catch (error) {
    if (error.errno == -4039) {
      req.flash(
        "internetErr",
        "We apologize for the inconvenience, but it seems that there is a problem with your internet connection. Please check your network settings and try again.",
      );
      return res.redirect("/user/register");
    }
    req.flash("internalServerErr", "Internal Server Error!");
    res.redirect("/user/register");
    console.log(error);
  }
});

router.get("/registered", (req, res) => {
  if (!req.session.regsitered) {
    return res.redirect("/user/register");
  } else {
    req.session.regsitered = false;
    res.render("valid");
  }
});

router.get("/verify/:token", async (req, res) => {
  const { token } = req.params;
  try {
    const checkTokenSql = `SELECT * FROM users WHERE token = ?`;
    const checkToken = await pool.query(checkTokenSql, token);
    let user = checkToken[0];
    if (user) {
      let verifyUserMailSql = `UPDATE users SET verified = true WHERE id = ?`;
      await pool.query(verifyUserMailSql, [user.id]);
      return res.render("valid", {
        emailVarified: true,
      });
    } else {
      return res.render("valid", {
        emailVerifiedFail: true,
      });
    }
  } catch (error) {
    if (error.errno == -4039) {
      req.flash(
        "internetErr",
        "We apologize for the inconvenience, but it seems that there is a problem with your internet connection. Please check your network settings and try again.",
      );
      return res.redirect("/user/forgot");
    }
    req.flash("internalServerErr", "Internal Server Error!");
    res.redirect("/user/forgot");
    console.log(error);
  }
});

router.get("/forgot", (req, res) => {
  res.render("forgot", {
    emailNotFound: req.flash("emailNotFound"),
    internalServerErr: req.flash("internalServerErr"),
    internetErr: req.flash("internetErr"),
  });
});

router.post("/forgot", async (req, res) => {
  const { email } = req.body;
  try {
    const checkEmail = `SELECT * FROM users WHERE email = ?`;
    const resultEmail = await pool.query(checkEmail, [email]);
    if (resultEmail.length === 0) {
      req.flash("emailNotFound", "Email does not exist!");
      return res.redirect("/user/forgot");
    }
    const user = resultEmail[0];
    const name =
      [user.first_name, user.last_name].filter(Boolean).join(" ") ||
      user.username;
    const id = user.id;
    const token = resultEmail[0].token;
    let resetPasswordLink = `https://authentication-system-3145.onrender.com/user/forgot/${token}`;
    let transporter = createSmtpTransporter();
    const mailOptions = {
      from: `"Vedant Kale" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Reset Password Request",
      html: `
Dear ${name}, <br><br>

We have received a request to reset your password for your account. To reset your password, please follow the instructions below: <br><br>

1. Click on the following link: <a href="${resetPasswordLink}">Reset Password</a> <br>
2. Enter your email address. <br>
3. Create a new password and confirm it. <br><br>

Once you have reset your password, you can use your new credentials to log in to your account.<br><br>

Please note that if you did not request a password reset, you can safely ignore this email. However, if you believe someone else may have attempted to access your account, we recommend that you change your password immediately.<br><br>
If you have any further questions or concerns, please do not hesitate to contact us at <a href="mailto:vedantsapalkar989@gmail.com">vedantsapalkar989@gmail.com</a>.

Best regards,<br>
Vedant Kale
      `,
    };
    let mailSent = await transporter.sendMail(mailOptions);
    if (mailSent.accepted.length > 0) {
      return res.render("valid", {
        EmailSentSuccess: true,
      });
    }
    return res.render("valid", {
      emailSent: true,
    });
  } catch (error) {
    req.flash("internalServerErr", "Internal Server Error!");
    res.redirect("/user/forgot");
    console.log(error);
  }
});

router.get("/forgot/:token", async (req, res) => {
  const { token } = req.params;
  try {
    const checkUserSql = `SELECT * FROM users WHERE token = ?`;
    const resultUser = await pool.query(checkUserSql, [token]);
    if (resultUser.length > 0) {
      return res.render("reset", {
        token: token,
      });
    }
    return res.render("valid", {
      invalidToken: true,
    });
  } catch (error) {
    req.flash("internalServerErr", "Internal Server Error!");
    res.redirect("/user/forgot");
    console.log(error);
  }
});

router.post("/pass", async (req, res) => {
  const { token, password } = req.body;
  const hashPass = await bcrypt.hash(password, 10);

  const updatePassSql = `UPDATE users SET password = ? WHERE token = ?`;
  await pool.query(updatePassSql, [hashPass, token]);

  const newToken = crypto.randomBytes(32).toString("hex");
  const updateTokenSql = `UPDATE users SET token = ? WHERE token = ?`;
  await pool.query(updateTokenSql, [newToken, token]);
  req.flash("passChange", "Password changed successfully");
  return res.redirect("login");
});

router.post("/logout", (req, res) => {
  req.session.destroy();
  return res.redirect("/user/login");
});

router.get("/", (req, res) => {
  res.render("reset");
});

router.post("/contact", limiter, async (req, res) => {
  try {
    const { name, email, message } = req.body;
    const contactSql = `INSERT INTO contact (name, email, message) VALUES (?,?,?)`;
    const resultContact = await pool.query(contactSql, [name, email, message]);
    if (resultContact.affectedRows == 1) {
      req.flash("contactSubmit", "Form Submitted Successfully");
      res.redirect("/contact");
      let transporter = createSmtpTransporter();
      const mailOptions = {
        from: `"Vedant Kale" <${process.env.SMTP_USER}>`,
        to: "vedantsapalkar989@gmail.com",
        subject: "Contact Form Notification",
        html: `
        Name: ${name} <br>
        Email: ${email} <br>
        Message: ${message} <br>
        `,
      };
      let mailSent = await transporter.sendMail(mailOptions);
      if (mailSent.accepted.length > 0) {
        return console.log("Email Sent");
      } else {
        return console.log("Email Sending Error!");
      }
    }
    console.log(resultContact);
  } catch (error) {
    console.log(error);
  }
});

module.exports = router;

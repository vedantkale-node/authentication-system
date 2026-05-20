# Auth System

A secure authentication system built with Node.js, Express, Handlebars, MySQL, sessions, email verification, password reset functionality, and Tailwind CSS.

## Features

- User registration and login
- Secure password hashing with bcrypt
- Session-based authentication
- Email verification via SMTP
- Forgot password and reset password flow
- Protected routes and dashboard access
- Contact form with email notifications
- Flash messages for authentication feedback
- Rate limiting on sensitive endpoints
- Responsive UI with Tailwind CSS

## Tech Stack

- Node.js
- Express.js
- Handlebars (`hbs`)
- MySQL / MariaDB
- `mysql2`
- `express-session`
- `connect-flash`
- `bcrypt`
- `nodemailer`
- Tailwind CSS
- PostCSS

## Project Structure

```text
.
├── app.js
├── database/
│   └── db.js
├── routes/
│   └── auth.js
├── views/
│   ├── login.hbs
│   ├── register.hbs
│   ├── dashboard.hbs
│   ├── forgot.hbs
│   ├── reset.hbs
│   ├── valid.hbs
│   ├── contact.hbs
│   └── partials/
├── public/
│   ├── css/
│   ├── js/
│   └── images/
├── package.json
├── tailwind.config.js
└── postcss.config.js
```

## Requirements

- Node.js 18+
- npm
- MySQL or MariaDB
- SMTP credentials for email services

## Installation

Install dependencies:

```bash
npm install
```

## Environment Variables

Create a `.env` file in the root directory:

```env
PORT=1111

MYSQL_HOST=localhost
MYSQL_USER=your_mysql_username
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=your_database_name

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_SECRET=your_app_password
```

## Database Setup

Run the following SQL queries:

```sql
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  username VARCHAR(100) NOT NULL,
  password VARCHAR(255) NOT NULL,
  token VARCHAR(128) NOT NULL,
  verified TINYINT(1) NOT NULL DEFAULT 0,
  token_created_at DATETIME NULL,
  created_at DATETIME NULL,
  updated_at DATETIME NULL,

  PRIMARY KEY (id),
  UNIQUE KEY users_email_unique (email),
  UNIQUE KEY users_username_unique (username),
  UNIQUE KEY users_token_unique (token)
);

CREATE TABLE IF NOT EXISTS contact (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  created_at DATETIME NULL,

  PRIMARY KEY (id)
);
```

## Available Scripts

Start the application:

```bash
npm start
```

Run in development mode with Nodemon:

```bash
npm run server
```

Build Tailwind CSS:

```bash
npm run build:css
```

## Application URL

```text
http://localhost:1111
```

## Routes

| Method | Route                 | Description               |
| ------ | --------------------- | ------------------------- |
| GET    | `/`                   | Protected dashboard       |
| GET    | `/user/login`         | Login page                |
| POST   | `/user/login`         | Login request             |
| GET    | `/user/register`      | Registration page         |
| POST   | `/user/register`      | Registration request      |
| GET    | `/user/verify/:token` | Email verification        |
| GET    | `/user/forgot`        | Forgot password page      |
| POST   | `/user/forgot`        | Send reset password email |
| GET    | `/user/forgot/:token` | Reset password page       |
| POST   | `/user/pass`          | Update password           |
| POST   | `/user/logout`        | Logout user session       |
| GET    | `/contact`            | Contact page              |
| POST   | `/user/contact`       | Submit contact form       |

## License

Licensed under the ISC License.

## Screenshots

![login_page](https://i.postimg.cc/76PPC2F2/1c70e219-4232-4d65-99df-29c9715d2d67.png)

![password_reset](https://i.postimg.cc/9MXX4769/3af13ec0-2b4b-4172-8bcf-9751b06c56f9.png)

![password_reset_email](https://i.postimg.cc/zBDDLgsC/3cd5f1e6-b98f-4ea5-8ddb-bf62a0c020d8.png)

![acc_created](https://i.postimg.cc/XJNNZCRK/9e17ee7d-a425-4b5e-896e-f14c896edec1.png)

![dashboard](https://i.postimg.cc/d1QQ7ybr/b44b4d02-4fa2-473b-9518-ffac469c65fd.png)

![signup](https://i.postimg.cc/85kkF62r/b9eae32e-45f4-4ffd-9346-8d7c626cb35d.png)

import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import User from './models/User'
import config from './config'
import isAuth from './middleware/auth'

const express = require('express')
const mongoose = require('mongoose')

const app = express()

app.use(morgan('tiny'))
app.use(cookieParser())

app.use(express.json())
app.use(
  express.urlencoded({
    extended: true
  })
)

mongoose
  .connect(config.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true
  })
  .then(() => console.log('๐mongoDB connected!'))
  .catch((err) => console.log(err))

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.post('/api/users/login', async (req, res) => {
  try {
    // ์๋ ฅ๋ฐ์ email ๋ก DB์์ ์ฌ์ฉ์ ๊ฒ์
    const user = await User.findOne({ email: req.body.email })
    if (user) {
      // comparePassword() : user document instance method
      user.comparePassword(req.body.password, (isMatch) => {
        if (isMatch) {
          // ๋น๋ฐ๋ฒํธ๊น์ง ๋ง๋ค๋ฉด, token ์ ์์ฑํด์ฃผ๊ธฐ
          user.generateToken((err, user) => {
            if (err) return res.status(400).json({ message: err })

            // ๋ธ๋ผ์ฐ์ ์ token ์ ์ ์ฅ์์ผ์ผํจ (์๋ฒ์ชฝ token์ user DB์ ์์)
            // token ์ ์ฟ ํค, ๋ก์ปฌ์คํ ๋ฆฌ์ง, ์ธ์์คํ ๋ฆฌ์ง ๋ฑ์ ์ ์ฅํ  ์ ์์ง๋ง, ์ผ๋จ์ ์ฟ ํค ๋ฐฉ์์ผ๋ก ํด๋ณด์.
            res
              .cookie('x_auth', user.token)
              .status(200)
              .json({ message: 'Token generated', userId: user.id })
          })
        } else {
          res.status(400).json({ message: 'password not correct' })
        }
      })
    }
    // ์ฌ์ฉ์๊ฐ ์กด์ฌํ์ง ์์ ๋
    else {
      return res.status(400).json({ message: '์ด๋ฉ์ผ์ด ์กด์ฌํ์ง ์์ต๋๋ค' })
    }
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'server error' })
  }
})

app.post('/api/users/register', (req, res) => {
  console.log(req.body)
  const user = new User(req.body)

  user
    .save()
    .then((result) =>
      res.status(200).json({
        message: 'register success',
        result
      })
    )
    .catch((err) =>
      res.status(500).json({
        message: 'register failed',
        err
      })
    )
})

app.get('/api/users/auth', isAuth, (req, res) => {
  res.status(200).json(req.user)
})

app.get('/api/users/logout', isAuth, (req, res) => {
  User.findOneAndUpdate({ _id: req.user._id }, { token: '' }, (err, user) => {
    if (err) return res.json({ success: false, err })
    return res.status(200).json({ success: true })
  })
})

app.listen(config.PORT, () => {
  console.log(`๐Example app listening at http://localhost:${config.PORT}`)
})

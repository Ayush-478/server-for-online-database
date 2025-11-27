
import express from 'express'
import cors from 'cors'
import https from 'https'
import fs from 'fs'
import cookieParser from 'cookie-parser'
import users from './routes/users.js'
import crud from './routes/crud.js'
import dbObj from './services/databaseOperations.js'
import errorHandler from './middleware/errorHandler.js'
import dotenv from 'dotenv'
const app = express();
const port = 5000
const host = '0:0:0:0

const corsOptions = {
  origin: 'http://localhost:3000', 
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders : ["Content-Type", "Authorization", "Accept"],
  credentials: true
}


dotenv.config()
await dbObj.init();

app.use(cors(corsOptions));

app.use(cookieParser())

app.use(express.json())

app.use('/users', users)

app.use('/crud', crud)

app.get('/', (req,res,next)=>{
  console.log('working')
  res.sendStatus(200)
})

app.use(errorHandler)

app.listen(port,host, ()=>{console.log("Server running"
)})


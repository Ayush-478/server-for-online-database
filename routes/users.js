import express from 'express'
import { verifyCookie } from './crud.js'
import db from '../services/databaseOperations.js'
import { addCatToNewUser } from '../services/directoryOperations.js'

const router = express.Router()

router.get('/', (req,res,next)=>{
  res.status(200).send("Render Server Running.")
})

router.get('/login', async(req,res,next)=>{
  try{
    console.log(req)
    const uid = verifyCookie(req)
    let registration = await db.registerUser(uid)
    if(registration){
      res.sendStatus(200)
    }
  }catch(err){next(err)}
})

router.get('/cat', async(req,res,next)=>{
  try{
    const uid = verifyCookie(req)
    let cat = await addCatToNewUser(uid)
    if(cat.path){
      res.status(200).sendFile(cat.path)
    }else{res.sendStatus(500)}
  }catch(err){next(err)}
})

export default router

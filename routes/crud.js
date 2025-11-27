import express from 'express';
import jwt from 'jsonwebtoken'
import db from '../services/databaseOperations.js'
import path from 'path'
import { addCatToNewUser } from '../services/directoryOperations.js'

const app = express()
const router = express.Router()

const getTypeJSON = {
  doc: {type: "docs"},
  docx: {type: "docs"},
  pdf: {type: "pdf"},
  txt: {type: "text"},
  rtf: {type: "text"},
  odt: {type: "text"},
  xls: {type: "spreadsheet"},
  xlsx: {type: "spreadsheet"},
  csv: {type: "spreadsheet"},
  ods: {type: "spreadsheet"},
  ppt: {type: "ppt"},
  pptx: {type: "ppt"},
  odp: {type: "ppt"},
  jpeg: {type: "image"},
  jpg: {type: "image"},
  png: {type: "image"},
  svg: {type: "image"},
  gif: {type: "image"},
  bmp: {type: "image"},
  webp: {type: "image"},
  mp3: {type: "audio"},
  ogg: {type: "audio"},
  aac: {type: "audio"},
  m4a: {type: "audio"},
  flac: {type: "audio"},
  wav: {type: "audio"},
  mp4: {type: "video"},
  webm: {type: "video"},
  avi: {type: "video"},
  mkv: {type: "video"},
  mov: {type: "video"},
  m4v: {type: "video"},
  flv: {type: "video"},
  zip: {type: "archive"},
  rar: {type: "archive"},
  tar: {type: "archive"},
  "7-zip": {type: "archive"},
  js: {type: "code"},
  ts: {type: "code"}, 
  jsx: {type: "code"},
  tsx: {type: "code"},
  css: {type: "code"},
  html: {type: "code"},
  json: {type: "code"},
  xml: {type: "code"},}

const supabaseJWTSecret = "WnXyUWEB5+2GbBqTAyQV9sxFyS8ZuyXHqgg1m/39uVRiJR7eSIGmANy+FMpnV+3lKzjDuJ+XM0QM8wPK6sxPAg=="
export function verifyCookie(req){
  const authHeader = req.headers['authorization'];
  const token = authHeader.split(' ')[1]; // Authorization: Bearer <token>

  const payload = jwt.verify(token, supabaseJWTSecret);
  return payload.user_metadata.sub
}

router.post('/', async(req,res,next)=>{
  try{
    let username = verifyCookie(req)
    addCatToNewUser(username)
    let fileArray = await db.getFileArray(username, req.body.location)
    //filearray = [{type : "wafiosaf", name : "hfioasfoisa}]
    res.status(200).send(fileArray)
  }catch(err){next(err)}
})

router.post('/newfolder', async(req,res,next)=>{
  try{
    let username = verifyCookie(req)
    let newFolder = await db.newFolder(username, req.body.location)
    if(newFolder){
      res.sendStatus(200)
    }
  }catch(err){next(err)}
})

router.delete('/', async(req,res,next)=>{
  //req.params.user
  const location = req.body.location
  let type
  if(location.indexOf(".") < 0){
    type = "folder"
  }else{type = "file"}

  try{
    let username = verifyCookie(req)
    await db.delete(username, location, type)
    res.sendStatus(204)
  }catch(err){next(err)}
})

router.get('/image/:path', async(req,res,next)=>{
  const location = req.params.path.replace(/[_]/, "/")
  try{
    let username = verifyCookie(req)
    let imageURL = await db.getFileURL(username, location)
    res.sendFile(imageURL)
  }catch(err){next(err)}
})

router.get('/json', async(req,res,next)=>{
  try{
    let username = verifyCookie(req)
    let json = await db.getJson(username)
    res.status(200).send(json)
  }catch(err){next(err)}
})

router.post('/newFile', async(req,res,next)=>{
  try{
    let username = verifyCookie(req)
    //body: JSON.stringify({name : file.name, size : file.size, type : file.type, location : dirPath}),
    let dbUpdate = await db.newFile(username, req.body.name, req.body.size, req.body.type, req.body.location)
    if(dbUpdate){
      res.sendStatus(200)
    }else{throw new Error("DB error.")}
  }catch(err){next(err)}
})

export default router

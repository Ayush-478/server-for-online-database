import client from '../config/db.js'
import path from 'path'
import bcrypt from 'bcrypt'
import fs from 'fs' 

const structureJson = {
  "Documents": {
    "index": "Documents",
    "isFolder": true,
    "children": [],
    "expand": true
  },
  "Notes": {
    "index": "Notes",
    "isFolder": true,
    "children": [],
    "exapnd": true
  },
  "Pictures": {
    "index": "Pictures",
    "isFolder": true,
    "children": [],
    "expand": true
  },
  "Videos": {
    "index": "Videos",
    "isFolder": true,
    "children": [],
    "expand": true
  },
  "cat.jpg": {
    "index": "cat.jpg",
    "isFolder": false,
    "children": null,
    "expand": null
  }
}

let notExistErr = new Error("The user doesnt exist, register maybe??")
notExistErr.status = 401

class dbOpperations{
  constructor(){
    this.db = null
    this.notExistErr = notExistErr
  }
  
  async init(){
    this.db = await client();
  }

  //CONFIGURE TO PREVENT SQL INJECTIONS.
  async existsUser(username){
    if(!this.db){
      let err = new Error("Database isn't ready for operations.")
      err.status = 500 
      throw err;
    }
    let user = await this.db.query(`SELECT * FROM users WHERE id = '${username}'`)
    if(!user.rowCount){
      return false
    }
    return true
  }

  async registerUser(username){
    if(await this.existsUser(username)){
      return true
    }
    let hashedDirectoryName = username

    // create user
    let registration = await this.db.query(`
      insert into users(id, dedicated_structure_json)
      values ('${username}','{}')
    `);
    // create directories
    await this.db.query(`
      insert into directory(directory_name, owner, root_directory, path, relative_path)
      values ('${hashedDirectoryName}', '${username}',true, '${username}', '/')`);

    // fetch directory ids
    let rootdirectory = await this.db.query(`
      select id from directory where owner = '${username}' and root_directory = true
    `)

    await this.db.query(`
      insert into directory(directory_name, owner, root_directory, path, parent, relative_path)
      values ('documents', '${username}', false, '${username}/documents', '${rootdirectory.rows[0].id}', '/documents'),
            ('pictures', '${username}', false, '${username}/pictures', '${rootdirectory.rows[0].id}', '/pictures'),
            ('videos', '${username}', false, '${username}/videos', '${rootdirectory.rows[0].id}', '/videos'),
            ('notes', '${username}', false, '${username}/notes', '${rootdirectory.rows[0].id}', '/notes')
    `);

    // example file insert
    await this.db.query(`
      insert into files(file_name, file_type, file_size, owner, holding_directory_id, relative_path, path)
      values ('cat.jpg','image', 4, '${username}', '${rootdirectory.rows[0].id}', '/cat.jpg', '${username}/cat.jpg')`)

    let folderIds = (await this.db.query(`select id, directory_name from directory where owner = '${username}' and root_directory = false`)).rows
    let fileId = (await this.db.query(`select id from files where owner = '${username}'`)).rows[0].id

    let json = {}

    json[fileId] = this.getJsonObject("cat.png", false, null, null)

    folderIds.forEach((e) => {
      json[e.id] = this.getJsonObject(e.directory_name, true, [], true)
    })
    json = JSON.stringify(json)

    await this.db.query((`update users set dedicated_structure_json = $1 where id = $2`), [json, username])

    if(registration.rowCount){
      return true
    }else{
      let err = new Error("Problem while registration.")
      err.status = 500
      throw err
    }
  }

  async getFileArray(user, location){
    if (!(await this.existsUser(user))){throw this.notExistErr}
    let fileArray = []
    let parentDirectoryId
    let userId = user
    if(location == ""){
      parentDirectoryId = (await this.db.query(`select id from directory where owner = '${userId}' and root_directory = true`)).rows[0].id
    }else{
      parentDirectoryId = (await this.db.query(`select id from directory where owner = '${userId}' and relative_path = '${location}'`)).rows[0].id
    }
    let folders = (await this.db.query(`select directory_name, relative_path from directory where parent = '${parentDirectoryId}'`)).rows
    let files = (await this.db.query(`select file_name, file_type, relative_path from files where holding_directory_id = '${parentDirectoryId}'`)).rows
    folders.forEach((f)=> fileArray.push({type : "folder", name : f.directory_name, path : f.relative_path, display : true}))
    files.forEach((f)=> fileArray.push({type : f.file_type, name : f.file_name, path : f.relative_path, display : true}))
    return fileArray
  }

  async newFolder(username, location){
    if (!(await this.existsUser(username))){throw this.notExistErr}
    let user = username
    let parent, newFolders, folderName, dirPath, relPath
    if(location != '/'){
      parent = (await this.db.query(`select id from directory where owner = '${user}' and relative_path = '${location}'`)).rows[0].id
      newFolders = (await this.db.query(`select directory_name from directory where directory_name like 'new folder%'  and owner = '${user}' and parent = '${parent}'`))
    }else{
      parent = (await this.db.query(`select id from directory where owner = '${user}' and root_directory = true`)).rows[0].id
      newFolders = (await this.db.query(`select directory_name from directory where directory_name like 'new folder%' and owner = '${user}' and parent = '${parent}'`))
    }
    if (newFolders.rowCount == 0){
      folderName = "new folder"
    }else{
      folderName = `new folder ${newFolders.rowCount + 1}`
    }
    dirPath = (location == "/") ? `${username}/${folderName}` : `${username}/${location}/${folderName}`
    relPath = (location == "/") ? `/${folderName}` : `/${location}/${folderName}`
    let query = (await this.db.query(`insert into directory(directory_name, owner, root_directory, path, parent, relative_path) values('${folderName}', '${user}', false, '${dirPath}', '${parent}', '${relPath}')`))
    if(!query.rowCount){
      let err = new Error("prblm with db!")
      err.status = 501
      throw err
    }
    return true
  }

  async delete(username, location, type){
    if (!(await this.existsUser(username))){throw this.notExistErr}
    let query
    let owner = username
    if (type == "folder" && location != '/'){
      query = await this.db.query(`delete from directory where owner = '${owner}' and relative_path = '${location}'`)
    }else if(type == "file"){
      query = await this.db.query(`delete from files where owner = '${owner}' and relative_path = '${location}'`)
    }

    if (!(query.rowCount)){
      let err = new Error("File not deleted, server error")
      err.status = 500
      throw err
    }
    return true
  }

  async newFile(user, name, size, type, location){
    if (!(await this.existsUser(user))){throw this.notExistErr}
    let dirId = (await this.db.query(`select id from directory where owner = $1 and relative_path = $2`,[user, location]))
    if (!dirId.rows.length) throw new Error("Directory not found");
    let query
    console.log(user, name, location)
    if(location != "/"){
      query = (await this.db.query(`insert into files(file_name, file_type, file_size, holding_directory_id, relative_path, path, owner) values($1, $2, $3, $4, $5, $6, $7)`,[name, type, size, dirId.rows[0].id, `${location}/${name}`, `${user}${location}/${name}`, user]))
    }else{
      query = (await this.db.query(`insert into files(file_name, file_type, file_size, holding_directory_id, relative_path, path, owner) values($1, $2, $3, $4, $5, $6, $7)`,[name, type, size, dirId.rows[0].id, `${location}${name}`, `${user}${location}${name}`, user]))
    }
    if(query.rowCount){
      return true
    }else{return false}
  }

  async getFileURL(user, location){
    if (!(await this.existsUser(user))){throw this.notExistErr}
    let fileURL = (await this.db.query(`select path from files where owner = '${user}' and relative_path = '${location}'`))
    return fileURL.rows[0].path
  }
  async getJson(user){
    if (!(await this.existsUser(user))){throw this.notExistErr}
    let json = (await this.db.query(`select dedicated_structure_json from users where id = '${user}'`)).rows[0].dedicated_structure_json
    return json
  }

  getJsonObject(index, isFolder, children, expand){
    return {"index" : index, "isFolder" : isFolder, "children" : children, "expand" : expand}
  }

  async removeFromJson(id, json){}
}

const obj = new dbOpperations()
export default obj

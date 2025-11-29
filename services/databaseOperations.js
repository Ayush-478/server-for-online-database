import supabase from '../config/supabase.js'

const structureJson = {
  "Documents": { "index": "Documents", "isFolder": true, "children": [], "expand": true },
  "Notes": { "index": "Notes", "isFolder": true, "children": [], "expand": true },
  "Pictures": { "index": "Pictures", "isFolder": true, "children": [], "expand": true },
  "Videos": { "index": "Videos", "isFolder": true, "children": [], "expand": true },
  "cat.jpg": { "index": "cat.jpg", "isFolder": false, "children": null, "expand": null }
}

let notExistErr = new Error("The user doesn't exist, register maybe??")
notExistErr.status = 401

class dbOperations {
  constructor() {
    this.notExistErr = notExistErr
  }

  // Check if user exists
  async existsUser(username) {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('id', username)
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return !!data
  }

  // Register a new user
  async registerUser(username) {
    if (await this.existsUser(username)) return true

    // Insert user
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([{ id: username, dedicated_structure_json: '{}' }])
    if (userError) throw userError

    // Insert root directory
    const { data: rootDir, error: rootError } = await supabase
      .from('directory')
      .insert([{ directory_name: username, owner: username, root_directory: true, path: username, relative_path: '/' }])
    if (rootError) throw rootError
    const rootId = rootDir[0].id

    // Insert default subdirectories
    const dirs = ['documents', 'pictures', 'videos', 'notes'].map(name => ({
      directory_name: name,
      owner: username,
      root_directory: false,
      path: `${username}/${name}`,
      parent: rootId,
      relative_path: `/${name}`
    }))
    const { data: insertedDirs, error: dirError } = await supabase
      .from('directory')
      .insert(dirs)
    if (dirError) throw dirError

    // Insert example file
    const { data: fileData, error: fileError } = await supabase
      .from('files')
      .insert([{
        file_name: 'cat.jpg',
        file_type: 'image',
        file_size: 4,
        owner: username,
        holding_directory_id: rootId,
        relative_path: '/cat.jpg',
        path: `${username}/cat.jpg`
      }])
    if (fileError) throw fileError

    // Build dedicated_structure_json
    const folderIds = insertedDirs.map(d => ({ id: d.id, name: d.directory_name }))
    const fileId = fileData[0].id

    let json = {}
    json[fileId] = this.getJsonObject('cat.jpg', false, null, null)
    folderIds.forEach(f => json[f.id] = this.getJsonObject(f.name, true, [], true))

    const { error: updateError } = await supabase
      .from('users')
      .update({ dedicated_structure_json: JSON.stringify(json) })
      .eq('id', username)
    if (updateError) throw updateError

    return true
  }

  // Get files/folders in a directory
  async getFileArray(user, location) {
    if (!(await this.existsUser(user))) throw this.notExistErr

    const parentQuery = location === '' ?
      supabase.from('directory').select('id').eq('owner', user).eq('root_directory', true).single() :
      supabase.from('directory').select('id').eq('owner', user).eq('relative_path', location).single()

    const { data: parentData, error: parentError } = await parentQuery
    if (parentError) throw parentError
    const parentId = parentData.id

    const { data: folders } = await supabase.from('directory').select('directory_name, relative_path').eq('parent', parentId)
    const { data: files } = await supabase.from('files').select('file_name, file_type, relative_path').eq('holding_directory_id', parentId)

    let fileArray = []
    folders.forEach(f => fileArray.push({ type: 'folder', name: f.directory_name, path: f.relative_path, display: true }))
    files.forEach(f => fileArray.push({ type: f.file_type, name: f.file_name, path: f.relative_path, display: true }))

    return fileArray
  }

  // Create a new folder
  async newFolder(username, location) {
    if (!(await this.existsUser(username))) throw this.notExistErr

    const parentQuery = location === '/' ?
      supabase.from('directory').select('id').eq('owner', username).eq('root_directory', true).single() :
      supabase.from('directory').select('id').eq('owner', username).eq('relative_path', location).single()

    const { data: parentData, error: parentError } = await parentQuery
    if (parentError) throw parentError
    const parentId = parentData.id

    const { data: existingFolders } = await supabase
      .from('directory')
      .select('directory_name')
      .like('directory_name', 'new folder%')
      .eq('owner', username)
      .eq('parent', parentId)

    const folderName = existingFolders.length === 0 ? 'new folder' : `new folder ${existingFolders.length + 1}`
    const dirPath = location === '/' ? `${username}/${folderName}` : `${username}/${location}/${folderName}`
    const relPath = location === '/' ? `/${folderName}` : `/${location}/${folderName}`

    const { data, error } = await supabase
      .from('directory')
      .insert([{ directory_name: folderName, owner: username, root_directory: false, path: dirPath, parent: parentId, relative_path: relPath }])
    if (error) throw error

    return true
  }

  // Delete file or folder
  async delete(username, location, type) {
    if (!(await this.existsUser(username))) throw this.notExistErr

    let { data, error } = {}
    if (type === 'folder' && location !== '/') {
      ({ data, error } = await supabase.from('directory').delete().eq('owner', username).eq('relative_path', location))
    } else if (type === 'file') {
      ({ data, error } = await supabase.from('files').delete().eq('owner', username).eq('relative_path', location))
    }

    if (error || !data || data.length === 0) {
      let err = new Error("Item not deleted, server error")
      err.status = 500
      throw err
    }

    return true
  }

  // Add a new file
  async newFile(user, name, size, type, location) {
    if (!(await this.existsUser(user))) throw this.notExistErr

    const { data: dirData, error: dirError } = await supabase
      .from('directory')
      .select('id')
      .eq('owner', user)
      .eq('relative_path', location)
      .single()
    if (dirError || !dirData) throw new Error('Directory not found')

    const holdingDirId = dirData.id
    const relPath = location === '/' ? `/${name}` : `${location}/${name}`
    const path = location === '/' ? `${user}/${name}` : `${user}${location}/${name}`

    const { data, error } = await supabase
      .from('files')
      .insert([{
        file_name: name,
        file_type: type,
        file_size: size,
        owner: user,
        holding_directory_id: holdingDirId,
        relative_path: relPath,
        path
      }])

    if (error || !data) return false
    return true
  }

  // Get file URL
  async getFileURL(user, location) {
    if (!(await this.existsUser(user))) throw this.notExistErr
    const { data, error } = await supabase
      .from('files')
      .select('path')
      .eq('owner', user)
      .eq('relative_path', location)
      .single()
    if (error) throw error
    return data.path
  }

  // Get user's JSON structure
  async getJson(user) {
    if (!(await this.existsUser(user))) throw this.notExistErr
    const { data, error } = await supabase
      .from('users')
      .select('dedicated_structure_json')
      .eq('id', user)
      .single()
    if (error) throw error
    return data.dedicated_structure_json
  }

  getJsonObject(index, isFolder, children, expand) {
    return { index, isFolder, children, expand }
  }
}

const obj = new dbOperations()
export default obj



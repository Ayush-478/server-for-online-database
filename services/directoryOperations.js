import { supabase } from '../config/supabase.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

export async function addCatToNewUser(uid) {
  try {
    // Convert import.meta.url to file path
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)

    // Construct path to the image file
    const filePath = path.join(__dirname, '../../public/NationalGeographic_2572187_16x9.jpg')

    return({path : filePath})
  } catch (err) {
    console.error('Error uploading cat image:', err)
    return({path : null})
  }
}

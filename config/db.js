import { Client } from 'pg'

const client = new Client({
  connectionString: "postgresql://postgres:CherryIsDoomed1234@db.fktebijqvaivayslpubf.supabase.co:5432/postgres",
  ssl : { rejectUnauthorized: false}
})

export default async function databaseSetup(){
  await client.connect()
  return client
}


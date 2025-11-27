
export default function errorHandler(err, req, res ,next){
  console.log(err.message)
  console.error(err.stack)
  let status = err.status || 500
  res.status(status).send(err.message)
}

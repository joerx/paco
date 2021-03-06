module.exports.mkResponse = (statusCode, data) => {
  return {
    statusCode,
    body: JSON.stringify(data)+'\n',
    headers: {
      'Content-type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
  }
}

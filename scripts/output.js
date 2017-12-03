const colors = require('colors');

module.exports.handler = (data, sls, options) => {
  console.log('resources'.yellow);
  Object.keys(data).forEach(key => {
    console.log(`  ${key}: ${data[key]}`)
  });
}

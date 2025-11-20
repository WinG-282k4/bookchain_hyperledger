/*
* Chaincode Quan Ly Sach
* Export module
*/
'use strict';
const QLSach = require('./qlsach');

module.exports.QLSach = QLSach;
module.exports.contracts = [ QLSach ];
var mongoose = require('mongoose');
var CaseSchema = new mongoose.Schema({
	memberid: String,
	memname: String,
	dateofbirth: String,
	servicepvdid: String,
	requestpvdid: String,
	diagcode: String,
	procode: String,
	startdate: String,
	enddate: String,
	status: String,
	CallType: String,
	updated_date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Case', CaseSchema);

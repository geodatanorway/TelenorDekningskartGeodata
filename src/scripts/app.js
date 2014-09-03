var map = require('./map');
var ko = require('knockout');
require('rx');
var ViewModel = require('./ViewModel');

ko.applyBindings(new ViewModel());

//var searchBar = require('./search');
// console.log(map);
// console.log(searchBar);

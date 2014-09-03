/** @jsx React.DOM */
/* jshint ignore:start */
var React = require('react');

var SearchBar = React.createClass({
	render: function() {
		return <div>
			<input />
			
		</div>;
	}
});

React.renderComponent(
	<SearchBar name="Geir" />,
	document.getElementById('searchBar'));


module.exports = SearchBar;
/* jshint ignore:end */
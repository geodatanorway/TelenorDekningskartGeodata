/** @jsx React.DOM */
/* jshint ignore:start */
var React 	= require('react'),
	Rx		= require('rx')
	;

React.initializeTouchEvents(true);

var SearchBar = React.createClass({
  handleChange: function(event) {
    this.setState({searchText: event.target.value});
    //console.log("LOL");
  },
	render: function() {
		return (
			<div>
				<input placeholder="Søk etter adresse eller sted" /*onChange="{this.handleChange}"*/ />
			</div>
		);
	}
});

React.renderComponent(
	<SearchBar name="Geir" />,
	document.getElementById('searchBar'));


module.exports = SearchBar;
/* jshint ignore:end */ 
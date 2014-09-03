/** @jsx React.DOM */
/* jshint ignore:start */
var React 	= require('react'),
	Rx		= require('rx')
	;

React.initializeTouchEvents(true);

var SearchBar = React.createClass({
  getInitialState: function(){
    return {searchText: ''};
  },
  handleChange: function(event) {
    this.setState({searchText: event.target.value});
  },
	render: function() {
		return (
			<div>
				<input value={this.state.searchText} placeholder="Søk etter adresse eller sted" onChange={this.handleChange} />
                                <button>Sjekk dekning</button>
			</div>
		);
	}
});

React.renderComponent(
	<SearchBar name="Geir" />,
	document.getElementById('searchBar'));




module.exports = SearchBar;
/* jshint ignore:end */ 
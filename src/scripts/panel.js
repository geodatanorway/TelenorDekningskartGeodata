/** @jsx React.DOM */
/* jshint ignore:start */
var React = require('react');

var Panel = React.createClass({
    render: function() {
        return <div>
                <input />
        </div>;
    }
});

React.renderComponent(<Panel name="panel" />, document.getElementById('panel'));

module.exports = Panel;
/* jshint ignore:end */
var random = Math.random();
var content = document.getElementById('content');
content.innerHTML = '<object type="text/html" data="http://telenor-dekning.herokuapp.com/app.html?r=' + random + '" style="width: 100%; height: 100%"><p>Dekningskartet fungerer kun med nyere nettlesere. Vennligst oppgrader nettleseren din.</p></object>';

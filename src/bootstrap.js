var content = document.getElementById('content');
//content.setAttribute("style", "width: 100%; height: 100%;");
content.innerHTML='<!--[if IE]>
<object classid="clsid:25336920-03F9-11CF-8FD0-00AA00686F13" data="http://telenor-dekning.herokuapp.com/app.html">
<p>Dekningskartet fungerer kun med nyere nettlesere. Vennligst oppgrader nettleseren din.</p>
</object>
<![endif]-->

<!--[if !IE]> <-->
<object type="text/html" data="http://telenor-dekning.herokuapp.com/app.html">
<p>Dekningskartet fungerer kun med nyere nettlesere. Vennligst oppgrader nettleseren din.</p>
</object>
<!--> <![endif]-->';

function napShare(btn){
  var url = window.location.href;
  if(navigator.clipboard){
    navigator.clipboard.writeText(url).then(function(){
      var t = btn.textContent; btn.textContent = 'Link copied';
      setTimeout(function(){ btn.textContent = t; }, 1800);
    });
  } else {
    window.prompt('Copy this link', url);
  }
}

(function initShape(){
  var log = document.getElementById('chat-log');
  var form = document.getElementById('chat-form');
  if(!log || !form) return;

  var input = document.getElementById('chat-input');
  var params = new URLSearchParams(window.location.search);
  var docCtx = params.get('doc');
  var history = [];

  function add(role, text){
    var d = document.createElement('div');
    d.className = 'msg ' + (role === 'user' ? 'msg-user' : 'msg-ai');
    d.textContent = text;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
    return d;
  }

  var welcome = docCtx
    ? 'You’re proposing a change to the "' + docCtx.replace(/-/g,' ') + '" document. Tell me your idea in your own words — I’ll check it against the framework and help you shape it into a clear contribution.'
    : 'Welcome. Bring an idea, a question, or a critique about the NAP framework. I’ll show you where it already lives in the canon, or help you shape something new — and route it to the founders for review. What’s on your mind?';
  add('ai', welcome);

  form.addEventListener('submit', function(e){
    e.preventDefault();
    var text = input.value.trim();
    if(!text) return;
    add('user', text);
    history.push({ role:'user', content:text });
    input.value = '';
    var thinking = add('ai', 'Thinking…');

    fetch('/api/shape', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ messages: history, doc: docCtx })
    })
    .then(function(r){ if(!r.ok) throw new Error('not connected'); return r.json(); })
    .then(function(data){
      thinking.textContent = data.reply || 'Got it — noted for review.';
      history.push({ role:'assistant', content: data.reply || '' });
    })
    .catch(function(){
      thinking.textContent = 'The guide isn’t connected to its knowledge base in this preview yet — that goes live once the Claude API key is added and the site is deployed. Your idea has been captured. Want it credited to you? Add your name on the Founders page.';
    });
  });
})();

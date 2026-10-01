(() => {
  const byId = id => document.getElementById(id);
  const panel = byId('chat');
  const transcript = byId('chatMessages');
  const form = byId('chatForm');
  const history = [];
  let busy = false;
  let endpoint = '', pin = '';
  try { endpoint = localStorage.getItem('dietaChatEndpoint') || ''; pin = sessionStorage.getItem('dietaChatPin') || ''; } catch {}
  byId('chatEndpoint').value = endpoint;
  byId('chatPin').value = pin;
  byId('chatDay').innerHTML = names.map((name, i) => `<option value="${i}">${name}</option>`).join('');
  byId('chatDay').value = current;
  function message(text, role) {
    const bubble = document.createElement('p');
    bubble.className = `bubble ${role}`;
    bubble.textContent = text;
    transcript.append(bubble);
    bubble.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    return bubble;
  }
  function status() {
    byId('chatStatus').textContent = endpoint && pin ? 'Collegamento configurato · da verificare al primo messaggio' : 'Da collegare dopo la registrazione su Cloudflare';
  }
  status();
  byId('chatConnectionForm').onsubmit = e => {
    e.preventDefault();
    try {
      const url = new URL(byId('chatEndpoint').value.trim());
      if (url.protocol !== 'https:' || !url.hostname.endsWith('.workers.dev') || url.username || url.password) throw new Error();
      const enteredPin = byId('chatPin').value.trim();
      if (enteredPin.length < 12) { byId('chatConnectionStatus').textContent = 'Usa la password di almeno 12 caratteri scelta su Cloudflare.'; return; }
      endpoint = url.origin + '/chat'; pin = enteredPin;
      try { localStorage.setItem('dietaChatEndpoint', endpoint); sessionStorage.setItem('dietaChatPin', pin); } catch {}
      byId('chatConnectionStatus').textContent = 'Collegamento salvato. Invia una domanda per provarlo.';
      status();
    } catch { byId('chatConnectionStatus').textContent = 'Inserisci il link HTTPS del tuo servizio Cloudflare, che termina con workers.dev.'; }
  };
  byId('chatTab').onclick = () => {
    view(false);
    byId('plan').hidden = true; byId('swaps').hidden = true; panel.hidden = false;
    ['planTab', 'swapTab'].forEach(id => { byId(id).classList.remove('active'); byId(id).removeAttribute('aria-current'); });
    byId('chatTab').classList.add('active'); byId('chatTab').setAttribute('aria-current', 'page');
    byId('chatDay').value = selected;
  };
  ['planTab', 'swapTab'].forEach(id => byId(id).addEventListener('click', () => {
    panel.hidden = true; byId('chatTab').classList.remove('active'); byId('chatTab').removeAttribute('aria-current');
  }));
  document.querySelectorAll('[data-question]').forEach(button => button.onclick = () => { byId('chatInput').value = button.dataset.question; byId('chatInput').focus(); });
  byId('clearChat').onclick = () => { if (busy) return; transcript.replaceChildren(); history.length = 0; message('Dimmi cosa hai in frigo o cosa vuoi cambiare nel pasto. Userò il tuo piano per aiutarti.', 'assistant'); };
  form.onsubmit = async e => {
    e.preventDefault(); if (busy) return;
    const question = byId('chatInput').value.trim(); if (!question) return;
    if (!endpoint || !pin) { byId('chatConnection').open = true; byId('chatConnectionStatus').textContent = 'Prima collega il servizio Cloudflare e inserisci la tua password.'; return; }
    if (!navigator.onLine) { message('Per usare la chat serve una connessione Internet. La dieta resta consultabile offline.', 'assistant'); return; }
    busy = true; byId('chatSend').disabled = true; byId('clearChat').disabled = true;
    message(question, 'user'); byId('chatInput').value = '';
    const pending = message('Sto leggendo il tuo piano…', 'assistant');
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Diet-Pin': pin }, body: JSON.stringify({ question, day: Number(byId('chatDay').value), history: history.slice(-6) }), signal: controller.signal, credentials: 'omit' });
      let data; try { data = await response.json(); } catch { throw new Error('Il servizio non ha risposto correttamente. Controlla il collegamento.'); }
      if (!response.ok) throw new Error(data.error || 'Il servizio non è disponibile. Riprova più tardi.');
      if (typeof data.answer !== 'string' || !data.answer.trim()) throw new Error('Non ho ricevuto una risposta. Riprova.');
      pending.textContent = data.answer;
      history.push({ role: 'user', content: question }, { role: 'assistant', content: data.answer });
      while (history.length > 6) history.shift();
      byId('chatStatus').textContent = 'Chat collegata';
    } catch (error) { pending.textContent = error.name === 'AbortError' ? 'La risposta sta impiegando troppo tempo. Riprova tra poco.' : error instanceof TypeError ? 'Non riesco a collegarmi. Controlla Internet e la configurazione Cloudflare.' : error.message; }
    finally { clearTimeout(timeout); busy = false; byId('chatSend').disabled = false; byId('clearChat').disabled = false; }
  };
})();

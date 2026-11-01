/* ===== Fern & Fine Print course sign-up (shared by / and /course/) ==========
   ONE value to set before go-live: FFP_SIGNUP_ENDPOINT.
   - Brevo (recommended): paste the form's action URL from Brevo > Contacts > Forms >
     your form > Embed (HTML), e.g. "https://xxxxxxxx.sibforms.com/serve/MUIF...".
     Field names sent: FIRSTNAME, LASTNAME, EMAIL, SMS (E.164, e.g. +15555550123),
     SMS_CONSENT (Boolean attribute you create in Brevo), email_address_check (honeypot), locale.
   - Any JSON form backend (Formspree, Basin, your own Render service): paste its URL;
     it receives JSON {first_name,last_name,email,phone,sms_consent,sms_consent_text,consent_at,source}.
   Leave it "" and the form stays switched off (no data is sent, no download unlocks).
   This must never point at the insurance CRM. */
var FFP_SIGNUP_ENDPOINT = "";

(function(){
  var SMS_TEXT = "I agree to receive course reminder texts from Fern & Fine Print. Msg & data rates may apply. Reply STOP to opt out. Consent is not a condition of access.";
  var form = document.getElementById('signup-form');
  if (!form) return;
  var panel = document.getElementById('signup-panel'), thanks = document.getElementById('thanks-panel');
  var msg = document.getElementById('signup-msg'), btn = document.getElementById('signup-submit');
  var KEY = 'ffp_course_pdf_unlocked';

  function showThanks(name, focus){
    panel.hidden = true; thanks.hidden = false;
    document.getElementById('thanks-name').textContent = name ? ', ' + name : '';
    if (focus) thanks.focus();
  }
  function say(text, kind){ msg.textContent = text; msg.className = 'msg ' + (kind || 'err'); }

  // Returning visitor who already signed up on this device
  try { var saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved && FFP_SIGNUP_ENDPOINT) { showThanks(saved.name, false); return; } } catch(e){}

  if (!FFP_SIGNUP_ENDPOINT) {
    Array.prototype.forEach.call(form.querySelectorAll('input,button'), function(el){ el.disabled = true; });
    btn.textContent = 'Downloads open soon';
    document.getElementById('signup-closed').hidden = false;
    return;
  }

  function toE164(raw){
    var t = (raw || '').trim();
    if (/^\+/.test(t)) { var d = t.replace(/\D/g, ''); return (d.length >= 8 && d.length <= 15) ? '+' + d : null; }
    var digits = t.replace(/\D/g, '');
    if (digits.length === 11 && digits.charAt(0) === '1') digits = digits.slice(1);
    return /^[2-9]\d{2}[2-9]\d{6}$/.test(digits) ? '+1' + digits : null;
  }
  function mark(el, bad){ el.setAttribute('aria-invalid', bad ? 'true' : 'false'); }

  form.addEventListener('input', function(ev){
    if (ev.target.getAttribute('aria-invalid') === 'true') ev.target.setAttribute('aria-invalid', 'false');
    if (msg.className.indexOf('err') >= 0) msg.className = 'msg';
  });

  form.addEventListener('submit', function(ev){
    ev.preventDefault();
    var f = form.elements;
    if (f.website.value) { showThanks('', true); return; } // bot trap
    var first = f.first_name.value.trim(), last = f.last_name.value.trim(), email = f.email.value.trim();
    var phone = toE164(f.phone.value), sms = f.sms_consent.checked;
    var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
    mark(f.first_name, !first); mark(f.email, !emailOk); mark(f.phone, !phone);
    if (!first) { say('Please add your first name.'); f.first_name.focus(); return; }
    if (!emailOk) { say('Please check your email address.'); f.email.focus(); return; }
    if (!phone) { say('Please enter a valid mobile number, like (555) 555-0123.'); f.phone.focus(); return; }
    msg.className = 'msg'; btn.disabled = true; btn.textContent = 'Sending...';

    var url = FFP_SIGNUP_ENDPOINT, req;
    if (/sibforms\.com/.test(url)) {
      var fd = new FormData();
      fd.append('FIRSTNAME', first); if (last) fd.append('LASTNAME', last);
      fd.append('EMAIL', email); fd.append('SMS', phone);
      if (sms) fd.append('SMS_CONSENT', '1');
      fd.append('email_address_check', ''); fd.append('locale', 'en');
      req = fetch(url + (url.indexOf('?') < 0 ? '?' : '&') + 'isAjax=1', { method: 'POST', body: fd });
    } else {
      req = fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ first_name: first, last_name: last, email: email, phone: phone, sms_consent: sms,
          sms_consent_text: sms ? SMS_TEXT : '', consent_at: new Date().toISOString(), source: 'course-pdf', page: location.href }) });
    }
    req.then(function(r){
      return r.text().then(function(t){
        var data = null; try { data = JSON.parse(t); } catch(e){}
        if (!r.ok || (data && data.success === false)) throw new Error((data && data.message) || ('HTTP ' + r.status));
      });
    }).then(function(){
      try { localStorage.setItem(KEY, JSON.stringify({ name: first, at: Date.now() })); } catch(e){}
      showThanks(first, true);
    }).catch(function(){
      btn.disabled = false; btn.textContent = 'Send me the free PDF';
      say("Sorry, that didn't go through. Please check your details and try again. If you've signed up before with this phone number, check your email for the course.");
    });
  });
})();

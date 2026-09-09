// business-hours.js — ish vaqti indikatori
var OPEN_HOUR = 9;
var CLOSE_HOUR = 19;

function updateBusinessHours() {
  var el = document.getElementById('businessHours');
  if (!el) return;
  var now = new Date();
  var hour = now.getHours();
  var isOpen = hour >= OPEN_HOUR && hour < CLOSE_HOUR;
  var lang = (window.__lang && window.__lang.get) ? window.__lang.get() : 'uz';
  var openText = lang === 'ru' ? 'Открыто' : 'Ochiq';
  var closedText = lang === 'ru' ? 'Закрыто' : 'Yopiq';
  var closesLabel = lang === 'ru' ? 'закрывается' : 'da yopiladi';
  var opensLabel = lang === 'ru' ? 'откроется' : 'da ochiladi';
  if (isOpen) {
    el.innerHTML = '<span class="bh-dot open"></span> ' + openText + ' · ' + OPEN_HOUR + ':00–' + CLOSE_HOUR + ':00';
    el.className = 'bh-status open';
  } else {
    var tomorrowLabel = lang === 'ru' ? 'Завтра' : 'Ertaga';
    el.innerHTML = '<span class="bh-dot closed"></span> ' + closedText + ' · ' + tomorrowLabel + ' ' + OPEN_HOUR + ':00 ' + opensLabel;
    el.className = 'bh-status closed';
  }
}

function updateBusinessHoursLang() {
  updateBusinessHours();
}

updateBusinessHours();
setInterval(updateBusinessHours, 60000);

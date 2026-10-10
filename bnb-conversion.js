/* BNB network attribution. Clicks and calendar views are not completed bookings. */
(() => {
  'use strict';
  const hosts = new Set(['bnbaccelerator.com','mybnbaccelerator.com','investinshorttermrentals.com','shorttermrentalforsale.com','mybnbdesign.com','nickkorom.com','nickkorom.wiki','shorttermrentalvendors.com','theshorttermrentalblog.com','shorttermrentalsecrets.io','taxfreeinvestors.com']);
  hosts.add('bnbacceleratorreviews.co'); hosts.add('bnbacceleratorreviews.com');
  hosts.add('bnb-accelerator-library.vercel.app');
  const host = s => s.toLowerCase().replace(/^www\./,'');
  if (!hosts.has(host(location.hostname)) || window.__bnbConversionLoaded) return;
  window.__bnbConversionLoaded = true;
  // Reuse the network's existing pixel; initialize it once on uninstrumented spokes.
  if (!window.fbq && !['bnbaccelerator.com','bnbacceleratorreviews.co','bnbacceleratorreviews.com','theshorttermrentalblog.com'].includes(host(location.hostname))) {
    const pixel = function(){ pixel.callMethod ? pixel.callMethod.apply(pixel,arguments) : pixel.queue.push(arguments); };
    pixel.queue=[]; pixel.loaded=true; pixel.version='2.0'; pixel.push=pixel;
    window.fbq=pixel; window._fbq=window._fbq || pixel;
    const script=document.createElement('script'); script.async=true; script.src='https://connect.facebook.net/en_US/fbevents.js'; document.head.appendChild(script);
    pixel('init','1040260527597629'); pixel('track','PageView');
  }
  const keys = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','utm_keyword','utm_matchtype','campaign_id','ad_group_id','ad_id','gclid','gbraid','wbraid','msclkid','fbclid'];
  const clean = s => typeof s === 'string' && s.length <= 200 && /^[a-z0-9 ._~:/|+\-]*$/i.test(s) ? s : '';
  const cleanPath = s => typeof s === 'string' && s.startsWith('/') && !s.startsWith('//') && s.length <= 200 && /^\/[a-z0-9/_.\-]*$/i.test(s) ? s : '/';
  const incoming = new URLSearchParams(location.search);
  let saved = {};
  try { saved = JSON.parse(sessionStorage.getItem('bnb-attribution-v1') || '{}'); } catch {}
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) saved = {};
  const freshCampaign = keys.some(k => incoming.has(k));
  const campaign = Object.fromEntries(keys.map(k => [k, clean(incoming.get(k) || (!freshCampaign && saved[k]))]).filter(([,v]) => v));
  const sourceHost = [incoming.get('bnb_source_host'), !freshCampaign && saved.bnb_source_host].find(s => typeof s === 'string' && hosts.has(host(s)));
  const attribution = {...campaign, bnb_source_host: sourceHost ? host(sourceHost) : host(location.hostname), bnb_source_path: cleanPath(incoming.get('bnb_source_path') || (!freshCampaign && saved.bnb_source_path) || location.pathname)};
  try { sessionStorage.setItem('bnb-attribution-v1', JSON.stringify(attribution)); } catch {}
  const calendarPath = '/widget/booking/ZsaZ20WoBCzlaqpmBxQF';
  function kind(u) {
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return '';
    if (u.hostname === 'api.leadconnectorhq.com' && u.pathname === calendarPath) return 'booking';
    if (!hosts.has(host(u.hostname))) return '';
    if ((host(u.hostname) === 'bnbaccelerator.com' && /^\/apply\/?$/.test(u.pathname)) || (host(u.hostname) === 'mybnbaccelerator.com' && /^\/schedule-bnb\/?$/.test(u.pathname))) return 'booking';
    return u.origin !== location.origin ? 'network' : '';
  }
  function decorate(u, type) {
    for (const [k,v] of Object.entries(attribution)) if (!u.searchParams.has(k)) u.searchParams.set(k,v);
    // Add referral UTMs only when there is no existing campaign or paid click ID.
    if (!keys.some(k => u.searchParams.has(k)) && type === 'booking' && attribution.bnb_source_host !== 'bnbaccelerator.com') {
      u.searchParams.set('utm_source',attribution.bnb_source_host);
      u.searchParams.set('utm_medium','referral');
      u.searchParams.set('utm_campaign','bnb_network');
      u.searchParams.set('utm_content',attribution.bnb_source_path);
    }
    return u.href;
  }
  function emit(event, type, u) {
    const params = {source_host:attribution.bnb_source_host,source_path:attribution.bnb_source_path,page_host:host(location.hostname),page_path:cleanPath(location.pathname),destination_host:host(u.hostname),destination_path:cleanPath(u.pathname)};
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({event,...params});
    if (typeof window.fbq === 'function') window.fbq('trackCustom',type,params);
  }
  function prepare() {
    document.querySelectorAll('a[href]').forEach(a => {
      try { const u = new URL(a.getAttribute('href'),location.href),type = kind(u); if (type) a.href = decorate(u,type); } catch {}
    });
    document.querySelectorAll('iframe[src]').forEach(frame => {
      try {
        const u = new URL(frame.getAttribute('src'),location.href);
        if (u.hostname !== 'api.leadconnectorhq.com' || u.pathname !== calendarPath || frame.dataset.bnbTracked) return;
        frame.dataset.bnbTracked = 'true';
        const next = decorate(u,'booking'); if (frame.src !== next) frame.src = next;
        emit('bnb_calendar_view','BNBCalendarView',u);
      } catch {}
    });
  }
  document.addEventListener('click', event => {
    const a = event.target.closest?.('a[href]'); if (!a) return;
    try {
      const u = new URL(a.href,location.href),type = kind(u); if (!type) return;
      a.href = decorate(u,type);
      emit(type === 'booking' ? 'bnb_booking_click' : 'bnb_network_click',type === 'booking' ? 'BNBBookingClick' : 'BNBNetworkClick',u);
    } catch {}
  },true);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',prepare,{once:true}); else prepare();
  new MutationObserver(records => { if(records.some(r => r.addedNodes.length)) prepare(); }).observe(document.documentElement,{childList:true,subtree:true});
})();

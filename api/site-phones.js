const { getSupabase, serviceErrorMessage } = require('../_lib/service');

function script(payload) {
  const json = JSON.stringify(payload).replace(/</g, '\\u003c');
  return `window.__SITE_PHONES=${json};`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.statusCode = 405;
    res.end(script(null));
    return;
  }
  try {
    const client = getSupabase();
    const settings = await client.from('site_settings').select('service_phone,report_phone_primary,report_phone_secondary').eq('id', 1).maybeSingle();
    if (settings.error || !settings.data) {
      res.statusCode = 200;
      res.end(script(null));
      return;
    }
    res.statusCode = 200;
    res.end(script({
      servicePhone: settings.data.service_phone || '',
      reportPhones: [settings.data.report_phone_primary, settings.data.report_phone_secondary].map((phone) => String(phone || '').trim()).filter(Boolean)
    }));
  } catch (error) {
    res.statusCode = 200;
    res.end(script(null));
    if (process.env.NODE_ENV !== 'production') console.error(serviceErrorMessage(error, '讀取電話失敗'));
  }
};

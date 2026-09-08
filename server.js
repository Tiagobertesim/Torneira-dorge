require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const { URLSearchParams } = require('url');

const app = express();
const PORT = process.env.PORT || 3000;

// Permite que o Express leia JSON e sirva arquivos estáticos (frontend em /public)
app.use(express.json());
app.use(express.static('public'));

// Rate limit - proteção básica contra abuso
const faucetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5, // por IP
  message: { error: 'Limite de requisições atingido. Tente novamente mais tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

function isLikelyEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isLikelyDogeAddress(value) {
  // Validação simples: começa com D/A/9 e comprimento de ~26-35 caracteres
  return /^[DA9][A-Za-z0-9]{25,34}$/.test(value);
}

// Expor a chave pública do reCAPTCHA (site key) para o frontend — não é segredo
app.get('/api/config', (req, res) => {
  const siteKey = process.env.RECAPTCHA_SITE_KEY || '';
  res.json({ recaptchaSiteKey: siteKey });
});

// Função para verificar token reCAPTCHA v3 com Google
async function verifyReCaptcha(token, remoteIp) {
  const secret = process.env.RECAPTCHA_SECRET;
  if (!secret) return { success: false, error: 'recaptcha-secret-not-configured' };

  try {
    const params = new URLSearchParams();
    params.append('secret', secret);
    params.append('response', token);
    if (remoteIp) params.append('remoteip', remoteIp);

    const resp = await axios.post('https://www.google.com/recaptcha/api/siteverify', params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    return resp.data; // contains success, score, action, etc.
  } catch (err) {
    console.error('Erro ao verificar reCAPTCHA:', err?.response?.data || err.message);
    return { success: false, error: 'recaptcha-verification-failed' };
  }
}

// Endpoint seguro que usa a API key do servidor (NUNCA colocar a chave no frontend)
app.post('/api/send', faucetLimiter, async (req, res) => {
  const { walletAddress, recaptchaToken } = req.body;

  if (!walletAddress || walletAddress.trim() === '') {
    return res.status(400).json({ error: 'Endereço de carteira inválido ou ausente.' });
  }

  // Validação básica do formato (melhore conforme necessário)
  if (!(isLikelyEmail(walletAddress) || isLikelyDogeAddress(walletAddress))) {
    return res.status(400).json({ error: 'Formato de endereço inválido. Use um e-mail FaucetPay ou um endereço Dogecoin.' });
  }

  // Verifica reCAPTCHA v3 (opcional, mas recomendado)
  if (process.env.RECAPTCHA_SECRET) {
    if (!recaptchaToken) {
      return res.status(400).json({ error: 'reCAPTCHA token ausente. Complete o verificador anti-bot.' });
    }

    const recaptchaResult = await verifyReCaptcha(recaptchaToken, req.ip);
    if (!recaptchaResult || !recaptchaResult.success) {
      return res.status(403).json({ error: 'reCAPTCHA falhou. Acesso negado.', recaptcha: recaptchaResult });
    }

    // Para reCAPTCHA v3, verifique score e action
    const score = typeof recaptchaResult.score === 'number' ? recaptchaResult.score : 0;
    const action = recaptchaResult.action || '';
    if (action !== 'claim' || score < 0.5) {
      return res.status(403).json({ error: 'reCAPTCHA score insuficiente ou ação inválida.', recaptcha: recaptchaResult });
    }
  }

  const apiKey = process.env.FAUCETPAY_API_KEY;
  const reward = process.env.REWARD_KOINU || '100000'; // koinu (0.001 DOGE)

  if (!apiKey) {
    console.error('FAUCETPAY_API_KEY não configurada. Abortando.');
    return res.status(500).json({ error: 'Erro de configuração do servidor.' });
  }

  try {
    const params = new URLSearchParams();
    params.append('api_key', apiKey);
    params.append('amount', reward);
    params.append('to', walletAddress);
    params.append('currency', 'DOGE');

    const fpRes = await axios.post('https://faucetpay.io/api/v1/send', params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 15000
    });

    const data = fpRes.data;

    // TODO: registrar a tentativa no DB/ledger (to, amount, ip, result, txid se houver)

    if (data && (data.status === 200 || data.status === '200')) {
      return res.json({ success: true, data });
    }

    // Repassa a mensagem da FaucetPay
    return res.status(502).json({ success: false, data });

  } catch (err) {
    console.error('Erro ao comunicar com FaucetPay:', err?.response?.data || err.message);
    return res.status(500).json({ error: 'Erro ao processar a transação com a API externa.' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT} (porta ${PORT})`);
});

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

  // Aqui você deve verificar o recaptchaToken com o serviço do Google reCAPTCHA (opcional, mas recomendado)
  // Se usar reCAPTCHA, verifique no backend antes de prosseguir.

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

# Torneira-dorge

Implementação exemplo de uma "torneira" (faucet) de Dogecoin que usa a API do FaucetPay.

Principais pontos
- A chave FAUCETPAY_API_KEY deve ficar no servidor (variáveis de ambiente), nunca no front-end.
- O endpoint /api/send faz a chamada ao FaucetPay e aplica rate limiting.
- Inclui proteção básica contra bots usando reCAPTCHA v3. Para habilitar, configure RECAPTCHA_SITE_KEY e RECAPTCHA_SECRET no .env ou no provedor de secrets.
- Inclui um frontend mínimo em public/index.html que chama o endpoint do servidor.

Como usar localmente
1. Clone o repositório e troque para a branch feature/add-faucet-backend (ou aceite o PR).
2. Copie .env.example para .env e preencha FAUCETPAY_API_KEY, REWARD_KOINU, RECAPTCHA_SITE_KEY e RECAPTCHA_SECRET.
3. npm install
4. npm start
5. Abra http://localhost:3000 e teste com um endereço FaucetPay (e-mail) ou endereço Dogecoin.

Segurança e próximos passos recomendados
- Não comite FAUCETPAY_API_KEY nem RECAPTCHA_SECRET em lugar nenhum. Use secrets do provedor (Heroku, Vercel, Docker env, GitHub Actions secrets).
- Implemente persistência (DB) para registrar todas as tentativas de pagamento (ledger) e responsividade a falhas.
- Ajuste as regras de rate limit por IP e por carteira, e implemente limites de gasto diário.
- Monitore respostas de erros e txids retornados pela FaucetPay.

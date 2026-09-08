# Torneira-dorge

Implementação exemplo de uma "torneira" (faucet) de Dogecoin que usa a API do FaucetPay.

Principais pontos
- A chave FAUCETPAY_API_KEY deve ficar no servidor (variáveis de ambiente), nunca no front-end.
- O endpoint /api/send faz a chamada ao FaucetPay e aplica rate limiting.
- Inclui um frontend mínimo em public/index.html que chama o endpoint do servidor.

Como usar localmente
1. Clone o repositório e troque para a branch feature/add-faucet-backend (ou aceite o PR).
2. Copie .env.example para .env e preencha FAUCETPAY_API_KEY e REWARD_KOINU.
3. npm install
4. npm start
5. Abra http://localhost:3000 e teste com um endereço FaucetPay (e-mail) ou endereço Dogecoin.

Segurança e próximos passos recomendados
- Não comite FAUCETPAY_API_KEY em lugar nenhum. Use secrets do provedor (Heroku, Vercel, Docker env, GitHub Actions secrets).
- Implemente verificação reCAPTCHA no frontend e valide o token no backend.
- Persista todas as tentativas de pagamento em um banco (ledger) para auditoria e reverts.
- Ajuste as regras de rate limit por IP e por carteira, e implemente limites de gasto diário.
- Monitore respostas de erros e txids retornados pela FaucetPay.

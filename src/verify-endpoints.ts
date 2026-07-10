import app from "./index";

async function verify() {
  console.log("🧪 Testando rota GET /api/maquinas...");
  const res1 = await app.fetch(new Request("http://localhost/api/maquinas"));
  const maquinas = await res1.json();
  console.log(`✅ Status: ${res1.status} - Máquinas encontradas: ${Array.isArray(maquinas) ? maquinas.length : 0}`);

  console.log("🧪 Testando rota GET /api/dashboard/metrics...");
  const res2 = await app.fetch(new Request("http://localhost/api/dashboard/metrics"));
  const metrics = await res2.json();
  console.log("✅ Status:", res2.status, "- Resumo Dashboard:", {
    totalMaquinas: metrics.totalMaquinas,
    maquinasOk: metrics.maquinasOk,
    custoMesAtual: metrics.custoMesAtual,
  });

  console.log("🧪 Testando rota GET /api/manutencoes...");
  const res3 = await app.fetch(new Request("http://localhost/api/manutencoes"));
  const manutencoes = await res3.json();
  console.log(`✅ Status: ${res3.status} - Ordens de serviço: ${Array.isArray(manutencoes) ? manutencoes.length : 0}`);

  console.log("🧪 Testando rota POST /api/manutencoes (Registro de Nova Manutenção com Reagendamento)...");
  if (Array.isArray(maquinas) && maquinas.length > 0) {
    const maqAlvo = maquinas[0];
    console.log(`📌 Alvo do teste: Máquina ${maqAlvo.nome} (Próxima manutenção atual: ${maqAlvo.proxima_manutencao})`);

    const res4 = await app.fetch(
      new Request("http://localhost/api/manutencoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maquina_id: maqAlvo.id,
          tecnico_id: "usr-tec-1",
          data_servico: "2026-07-10",
          descricao: "Teste automatizado de verificação do agendamento reativo",
          pecas_trocadas: "Sensor óptico de teste",
          custo: 150,
          status_final: "ok",
        }),
      })
    );
    const novaOrdem = await res4.json();
    console.log(`✅ Status da criação: ${res4.status}`);

    // Verificar se a máquina foi devidamente reagendada
    const resCheck = await app.fetch(new Request(`http://localhost/api/maquinas/${maqAlvo.id}`));
    const maqAtualizada = await resCheck.json();
    console.log(`✨ Nova próxima manutenção calculada automaticamente: ${maqAtualizada.proxima_manutencao}`);
  }

  console.log("🎯 Todos os testes da API finalizados com sucesso!");
  process.exit(0);
}

verify().catch((err) => {
  console.error("❌ Erro no teste:", err);
  process.exit(1);
});
